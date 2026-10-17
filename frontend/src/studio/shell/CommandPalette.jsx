/**
 * CommandPalette.jsx — ⌘K quick navigation & actions. Lightweight (no cmdk dep):
 * substring filter, full keyboard control (↑ ↓ ⏎ Esc). The body mounts only
 * while open, so its query/selection state resets naturally each time.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { CornerDownLeft } from 'lucide-react';
import { MODULES } from '../nav';
import { useUIStore } from '../store';

export default function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  return (
    <AnimatePresence>
      {open && <PaletteBody onClose={() => setOpen(false)} />}
    </AnimatePresence>
  );
}

function PaletteBody({ onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []); // DOM focus only

  const items = useMemo(() => {
    const base = MODULES.map((m) => ({
      id: m.id, icon: m.icon, label: m.label, hint: m.desc,
      run: () => navigate(`/studio/${m.path}`),
    }));
    const s = q.trim().toLowerCase();
    return s ? base.filter((i) => (i.label + ' ' + i.hint).toLowerCase().includes(s)) : base;
  }, [q, navigate]);

  const clampedActive = Math.min(active, Math.max(0, items.length - 1));

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[clampedActive]; if (it) { it.run(); onClose(); } }
    else if (e.key === 'Escape') { onClose(); }
  };

  return (
    <Motion.div className="s-cmdk-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={onClose}>
      <Motion.div className="s-cmdk"
        initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onMouseDown={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="s-cmdk__input" placeholder="Jump to a studio, template, or action…"
          value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey} />
        <div className="s-cmdk__list">
          {items.length === 0 && (
            <div style={{ padding: '18px 14px', color: 'var(--muted)', fontSize: 13 }}>No matches for “{q}”.</div>
          )}
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <div key={it.id}
                className={`s-cmdk__item ${i === clampedActive ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => { it.run(); onClose(); }}>
                {Icon && <Icon size={17} strokeWidth={1.75} />}
                <span>{it.label}</span>
                <span className="s-cmdk__hint">{it.hint}</span>
                {i === clampedActive && <CornerDownLeft size={13} style={{ color: 'var(--gold)' }} />}
              </div>
            );
          })}
        </div>
      </Motion.div>
    </Motion.div>
  );
}
