import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function StudioModal({ title, children, onClose, wide = false }) {
  const dialog = useRef(null);
  const id = useId();
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className={'creation-modal ' + (wide ? 'creation-modal--wide' : '')} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="creation-modal__head"><h2 id={id}>{title}</h2><button className="s-iconbtn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
    {children}
  </dialog>;
}
