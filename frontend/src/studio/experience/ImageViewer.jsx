import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import './imageViewer.css';

export function ImageLightbox({ src, title = 'Bridal image', onClose }) {
  const shell = useRef(null);
  const closeButton = useRef(null);
  const closeAction = useRef(onClose);
  closeAction.current = onClose;
  const [fullscreen, setFullscreen] = useState(false);
  const [hint, setHint] = useState('');
  useEffect(() => {
    const element = shell.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    function key(event) {
      if (event.key === 'Escape') { event.preventDefault(); closeAction.current(); }
      if (event.key === 'Tab') {
        const controls = [...shell.current.querySelectorAll('button')];
        const first=controls[0], last=controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    function changed() { setFullscreen(document.fullscreenElement === shell.current); }
    document.addEventListener('keydown', key);
    document.addEventListener('fullscreenchange', changed);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', key);
      document.removeEventListener('fullscreenchange', changed);
      if (document.fullscreenElement === element) document.exitFullscreen?.().catch(() => {});
      previousFocus?.focus?.();
    };
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === shell.current) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
      else setHint('Full-screen browser mode is unavailable here. The image is displayed in the full-window viewer.');
    } catch { setHint('Your browser did not allow full screen. You can still use this full-window viewer.'); }
  }
  return createPortal(<div ref={shell} role="dialog" aria-modal="true" aria-label={title} className="image-lightbox">
    <header className="image-lightbox__toolbar"><strong>{title}</strong><div>
      <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>{fullscreen ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}<span>{fullscreen ? 'Exit full screen' : 'Full screen'}</span></button>
      <button ref={closeButton} type="button" onClick={onClose} aria-label="Close image viewer"><X size={21}/><span>Close</span></button>
    </div></header>
    <div className="image-lightbox__stage"><img src={src} alt={title} className="image-lightbox__image" /></div>
    {hint && <p className="image-lightbox__hint" role="status">{hint}</p>}
  </div>, document.body);
}

export default function ImageViewer({ src, title = 'Generated bridal look' }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="image-viewer-preview" onClick={() => setOpen(true)} aria-label={'View ' + title + ' full screen'}>
    <img src={src} alt={title}/><span><Maximize2 size={17}/> View full screen</span>
  </button>{open && <ImageLightbox src={src} title={title} onClose={() => setOpen(false)}/>}</>;
}
