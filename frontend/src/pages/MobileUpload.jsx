/**
 * MobileUpload.jsx — the page a customer's phone opens after scanning the studio
 * QR (/m/upload/:sessionId). Self-contained (its own scoped styles, not the
 * studio shell) and phone-first: choose a photo, send, done.
 */
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sendPhoto } from '../api/qrUpload';

function Bloom({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="16" cy="8.4" rx="3.1" ry="6.4" transform={`rotate(${a} 16 16)`} fill="url(#mug)" opacity="0.92" />
      ))}
      <circle cx="16" cy="16" r="2.2" fill="#0B0B0C" />
      <defs><linearGradient id="mug" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#ECD9A8" /><stop offset="1" stopColor="#8E6A3C" /></linearGradient></defs>
    </svg>
  );
}

export default function MobileUpload() {
  const { sessionId } = useParams();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState('choose'); // choose | ready | sending | done | error
  const [errMsg, setErrMsg] = useState('');

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setState('ready');
    setErrMsg('');
  };

  const send = async () => {
    if (!file || !sessionId) return;
    setState('sending');
    try {
      await sendPhoto(sessionId, file);
      setState('done');
    } catch (err) {
      setErrMsg(err?.message || 'Upload failed. Please try again.');
      setState('error');
    }
  };

  const reset = () => { setFile(null); setPreview(null); setState('choose'); inputRef.current && (inputRef.current.value = ''); };

  return (
    <div className="mu">
      <style>{CSS}</style>

      <header className="mu__top">
        <Bloom />
        <div className="mu__brand">
          <span className="mu__name">Ladies Planet</span>
          <span className="mu__kicker">AI Bridal Studio</span>
        </div>
      </header>

      <main className="mu__main">
        {state === 'done' ? (
          <div className="mu__done">
            <div className="mu__check" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h1 className="mu__title">Photo sent</h1>
            <p className="mu__sub">You can put the phone down — your photo is on the showroom screen now.</p>
            <button className="mu__btn mu__btn--ghost" onClick={reset}>Send another</button>
          </div>
        ) : (
          <>
            <h1 className="mu__title">Add your photo</h1>
            <p className="mu__sub">Choose a clear, front-facing photo. It goes straight to the studio screen in front of you.</p>

            <label className="mu__drop" onClick={() => inputRef.current?.click()}>
              {preview ? (
                <img src={preview} alt="Your selection" className="mu__preview" />
              ) : (
                <span className="mu__dropinner">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 20h14" /></svg>
                  <span className="mu__dropcta">Choose a photo</span>
                  <span className="mu__drophint">Camera or gallery</span>
                </span>
              )}
              <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
            </label>

            {state === 'error' && <div className="mu__err">{errMsg}</div>}

            <div className="mu__actions">
              {state === 'ready' || state === 'error' ? (
                <>
                  <button className="mu__btn mu__btn--gold" onClick={send}>Send to studio</button>
                  <button className="mu__btn mu__btn--ghost" onClick={() => inputRef.current?.click()}>Choose another</button>
                </>
              ) : state === 'sending' ? (
                <button className="mu__btn mu__btn--gold" disabled>Sending…</button>
              ) : (
                <button className="mu__btn mu__btn--gold" onClick={() => inputRef.current?.click()}>Choose a photo</button>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="mu__foot">Secure upload · session {(sessionId || '').slice(0, 6).toUpperCase()}</footer>
    </div>
  );
}

const CSS = `
.mu { min-height: 100svh; display: flex; flex-direction: column;
  background: radial-gradient(120% 80% at 50% -10%, rgba(212,175,106,.14), transparent 55%), #0B0B0C;
  color: #F7F6F3; font-family: "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.mu * { box-sizing: border-box; }
.mu__top { display: flex; align-items: center; gap: 11px; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,.08); }
.mu__brand { display: flex; flex-direction: column; line-height: 1.1; }
.mu__name { font-size: 15px; font-weight: 600; letter-spacing: .01em; }
.mu__kicker { font-size: 9.5px; letter-spacing: .26em; text-transform: uppercase; color: #D4AF6A; margin-top: 2px; }
.mu__main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 28px 22px; max-width: 480px; width: 100%; margin: 0 auto; }
.mu__title { font-size: 26px; font-weight: 600; letter-spacing: -.02em; margin: 0; }
.mu__sub { margin: 10px 0 24px; color: #B8B3AA; font-size: 14px; line-height: 1.6; max-width: 340px; }
.mu__drop { width: 100%; border: 1px dashed rgba(255,255,255,.18); border-radius: 18px;
  background: #161616; overflow: hidden; cursor: pointer; display: block; transition: border-color .18s, background .18s; }
.mu__drop:active { border-color: rgba(212,175,106,.5); background: rgba(212,175,106,.06); }
.mu__dropinner { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 44px 20px; color: #777; }
.mu__dropcta { font-size: 15px; font-weight: 600; color: #F7F6F3; }
.mu__drophint { font-size: 12px; color: #777; }
.mu__preview { display: block; width: 100%; max-height: 46vh; object-fit: cover; }
.mu__actions { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 22px; }
.mu__btn { width: 100%; padding: 15px 18px; border-radius: 13px; border: 1px solid transparent;
  font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: filter .18s, background .18s, opacity .18s; }
.mu__btn--gold { background: linear-gradient(135deg, #ECD9A8 0%, #D4AF6A 52%, #8E6A3C 100%); color: #2A0207;
  box-shadow: 0 10px 30px rgba(212,175,106,.32); }
.mu__btn--gold:active { filter: brightness(1.05); }
.mu__btn--gold:disabled { opacity: .6; box-shadow: none; }
.mu__btn--ghost { background: transparent; border-color: rgba(255,255,255,.14); color: #B8B3AA; }
.mu__err { margin-top: 14px; padding: 11px 14px; border-radius: 11px; font-size: 13px;
  background: rgba(228,90,90,.12); border: 1px solid rgba(228,90,90,.4); color: #E45A5A; }
.mu__done { display: flex; flex-direction: column; align-items: center; }
.mu__check { width: 66px; height: 66px; border-radius: 50%; display: grid; place-items: center; color: #48B07A;
  background: rgba(72,176,122,.12); border: 1px solid rgba(72,176,122,.4); margin-bottom: 22px; }
.mu__foot { text-align: center; padding: 16px; font-size: 11px; letter-spacing: .04em; color: #5f5f5f;
  border-top: 1px solid rgba(255,255,255,.06); font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) { .mu * { transition: none !important; } }
`;
