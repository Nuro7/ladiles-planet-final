/**
 * primitives.jsx — Ladies Planet AI Studio design-system primitives.
 * Class-based (studio.css), dark, hairline-bordered, gold rationed to actions.
 * All components are plain JSX and depend only on framer-motion + lucide-react.
 */
import { useRef, useState } from 'react';
import { motion as Motion, useMotionValue, useSpring } from 'framer-motion';
import { X, Upload, FolderOpen } from 'lucide-react';

/* ── Button ─────────────────────────────────────────────── */
export function Button({ variant = 'default', size, block, className = '', children, ...props }) {
  const cls = [
    's-btn',
    variant === 'gold' && 's-btn--gold',
    variant === 'ghost' && 's-btn--ghost',
    size === 'lg' && 's-btn--lg',
    block && 's-btn--block',
    className,
  ].filter(Boolean).join(' ');
  return <button className={cls} {...props}>{children}</button>;
}

/* ── Magnetic button — subtle pull toward the cursor (used for the CTA) ── */
export function MagneticButton({ strength = 0.35, className = '', children, ...props }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 250, damping: 18 });
  const y = useSpring(my, { stiffness: 250, damping: 18 });

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - (r.left + r.width / 2)) * strength);
    my.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <Motion.button
      ref={ref} onMouseMove={onMove} onMouseLeave={reset}
      style={{ x, y }} className={`s-btn s-btn--gold ${className}`}
      whileTap={{ scale: 0.98 }} {...props}
    >
      {children}
    </Motion.button>
  );
}

/* ── Icon button ────────────────────────────────────────── */
export function IconButton({ icon: Icon, active, label, size = 17, className = '', ...props }) {
  return (
    <span className={`s-tip ${className}`}>
      <button className={`s-iconbtn ${active ? 'is-active' : ''}`} aria-label={label} {...props}>
        {Icon && <Icon size={size} />}
      </button>
      {label && <span className="s-tip__bubble">{label}</span>}
    </span>
  );
}

/* ── Panel / Card ───────────────────────────────────────── */
export function Panel({ className = '', children, ...p }) {
  return <div className={`s-panel ${className}`} {...p}>{children}</div>;
}
export function Card({ hover, className = '', children, ...p }) {
  return <div className={`s-card ${hover ? 's-card--hover' : ''} ${className}`} {...p}>{children}</div>;
}

/* ── Section (labelled group inside a panel) ────────────── */
export function Section({ label, action, children }) {
  return (
    <div className="s-section">
      {(label || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {label && <span className="s-section__label">{label}</span>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Fields ─────────────────────────────────────────────── */
export function Label({ children, ...p }) { return <label className="s-label" {...p}>{children}</label>; }
export function TextInput(p) { return <input className="s-input" {...p} />; }
export function TextArea(p) { return <textarea className="s-textarea" {...p} />; }

export function NativeSelect({ options = [], value, onChange, ...p }) {
  return (
    <select className="s-select-native" value={value} onChange={onChange} {...p}>
      {options.map((o) => (
        <option key={o.id ?? o.value} value={o.id ?? o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Segmented control ──────────────────────────────────── */
export function Segmented({ options = [], value, onChange }) {
  return (
    <div className="s-seg">
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.id} className={`s-seg__opt ${value === o.id ? 'is-active' : ''}`}
            disabled={o.disabled} onClick={() => onChange?.(o.id)} title={o.hint}
          >
            {Icon && <Icon size={13} />} {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────────── */
export function Toggle({ checked, onChange, label }) {
  return (
    <div className={`s-toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange?.(!checked)} role="switch" aria-checked={checked}>
      <span className="s-toggle__track"><span className="s-toggle__knob" /></span>
      {label && <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>}
    </div>
  );
}

/* ── Slider ─────────────────────────────────────────────── */
export function Slider({ ...p }) { return <input type="range" className="s-slider" {...p} />; }

/* ── Badge ──────────────────────────────────────────────── */
export function Badge({ variant, dot, className = '', children }) {
  return <span className={`s-badge ${variant === 'gold' ? 's-badge--gold' : ''} ${dot ? 's-badge--dot' : ''} ${className}`}>{children}</span>;
}

/* ── Skeleton ───────────────────────────────────────────── */
export function Skeleton({ style }) { return <div className="s-skel" style={style} />; }

/* ── Upload card (drag + drop, click, gallery) ──────────── */
export function UploadCard({ preview, onFile, onGallery, onClear, label, hint, icon: Icon }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    const f = files?.[0];
    if (f && f.type.startsWith('image/')) onFile?.(f);
  };

  return (
    <div
      className={`s-upload ${drag ? 'is-drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
    >
      {preview ? (
        <>
          <img src={preview} alt="" className="s-upload__preview" />
          {onClear && (
            <button className="s-upload__x" onClick={onClear} aria-label="Remove"><X size={14} /></button>
          )}
        </>
      ) : (
        <div className="s-upload__empty" onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer' }}>
          {Icon && <Icon size={22} strokeWidth={1.5} />}
          <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</div>
          {hint && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</div>}
        </div>
      )}
      <div className="s-upload__bar">
        <label className="s-btn s-btn--block" style={{ flex: 1, cursor: 'pointer', padding: '7px 10px', fontSize: 12 }}>
          <Upload size={13} /> Upload
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)} />
        </label>
        {onGallery && (
          <button className="s-btn s-btn--ghost" style={{ flex: 1, padding: '7px 10px', fontSize: 12, border: '1px solid var(--border)' }} onClick={onGallery}>
            <FolderOpen size={13} /> Library
          </button>
        )}
      </div>
    </div>
  );
}

