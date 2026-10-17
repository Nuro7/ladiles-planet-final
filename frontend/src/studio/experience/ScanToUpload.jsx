/**
 * ScanToUpload.jsx — the phone-handoff station. Shows a QR the customer scans
 * with their own phone; when their photo lands in Storage it's handed straight
 * to the studio. The QR is generated locally (no third party sees the link).
 *
 * Mounted only while open (parent does `{scan && <ScanToUpload …/>}`), so each
 * open mints a fresh session via the useState initializer.
 */
import { useEffect, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import QRCode from 'qrcode';
import { X, Check, WifiOff } from 'lucide-react';
import { newSessionId, mobileUploadUrl, waitForPhoto } from '../../api/qrUpload';
import useModalA11y from '../../hooks/useModalA11y';

export default function ScanToUpload({ onClose, onReceive, title = 'Scan to upload' }) {
  const [session] = useState(newSessionId);
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting | done | error
  const dialogRef = useRef(null);
  useModalA11y(dialogRef, onClose);

  useEffect(() => {
    QRCode.toDataURL(mobileUploadUrl(session), {
      margin: 1, width: 360, color: { dark: '#111114', light: '#FFFFFF' },
    }).then(setQr).catch(() => setQr(null));

    const ctrl = new AbortController();
    waitForPhoto(session, { signal: ctrl.signal })
      .then((url) => {
        setStatus('done');
        // hold the "received" beat so the handoff reads, then apply
        setTimeout(() => { onReceive?.(url); onClose?.(); }, 950);
      })
      .catch((err) => { if (err.name !== 'AbortError') setStatus('error'); });

    return () => ctrl.abort();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const code = session.slice(0, 6).toUpperCase();

  return (
    <div className="s-qr-overlay" onMouseDown={onClose}>
      <Motion.div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className="s-qr" onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="s-qr__head">
          <button className="s-qr__close" onClick={onClose} aria-label="Close"><X size={16} /></button>
          <div className="s-qr__title">{title}</div>
          <div className="s-qr__sub">Point the customer's phone camera at the code. The photo they choose appears here — no cables, no email.</div>
        </div>

        <div className="s-qr__body">
          <div className={`s-qr__frame ${status === 'done' ? 'is-done' : ''}`}>
            <span className="s-qr__tick s-qr__tick--tl" /><span className="s-qr__tick s-qr__tick--tr" />
            <span className="s-qr__tick s-qr__tick--bl" /><span className="s-qr__tick s-qr__tick--br" />
            {qr ? <img src={qr} alt="Upload QR code" /> : <span style={{ color: '#111', fontSize: 12 }}>Generating…</span>}
          </div>

          <div className="s-qr__steps">
            <div className="s-qr__step"><span>1</span> Open the phone camera and aim at the code</div>
            <div className="s-qr__step"><span>2</span> Tap the link, then choose or take a photo</div>
            <div className="s-qr__step"><span>3</span> It lands here on its own</div>
          </div>

          {status === 'waiting' && (
            <div className="s-qr__status"><span className="s-qr__pulse" /> Waiting for a photo · code {code}</div>
          )}
          {status === 'done' && (
            <div className="s-qr__status is-done"><Check size={15} /> Photo received</div>
          )}
          {status === 'error' && (
            <div className="s-qr__status is-error"><WifiOff size={15} /> Couldn't receive the photo — check the connection and try again.</div>
          )}
        </div>
      </Motion.div>
    </div>
  );
}
