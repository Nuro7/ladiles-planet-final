/**
 * ThemePicker.jsx — the visual theme/scene picker popup used by both studios.
 *
 * Opens over the settings panel and shows a grid of theme cards, each with a
 * COVER IMAGE + label + one-line description. Picking a theme selects it and
 * (in the parent) auto-fills the editable prompt. Structurally modelled on
 * AssetPicker, but bound to the studio CSS tokens (var(--panel/--card/--gold…))
 * so it inherits the champagne-on-cherry system. Mounts as a state-gated sibling
 * inside `.studio-root` (never portal to document.body — the tokens only resolve
 * inside the scope).
 *
 * Backend contract (degrades gracefully until shipped):
 *   item = { id, label, description, coverImage?, prompt? }
 *   • no coverImage → a gradient+icon fallback tile
 *   • no prompt     → selecting just picks the scene id (current behaviour)
 */
import { useEffect, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { X, Check, Search } from 'lucide-react';
import useModalA11y from '../../hooks/useModalA11y';
import useBreakpoint from '../../hooks/useBreakpoint';
import { getThemeCover } from './themeFields';

/* Deterministic gradient for cover-less tiles — cherry→gold, varied by id. */
const FALLBACK_GRADS = [
  'linear-gradient(135deg, var(--gold-dim), var(--card))',
  'linear-gradient(135deg, #521621, #2A0207)',
  'linear-gradient(135deg, #46101A, #6B2233)',
  'linear-gradient(135deg, #3A0A12, #5A2733)',
  'linear-gradient(140deg, #55131F, #2A0207)',
];
function gradFor(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK_GRADS[h % FALLBACK_GRADS.length];
}

export default function ThemePicker({
  title = 'Choose a theme',
  subtitle,
  items = [],
  selectedId,
  onSelect,
  onClose,
  placeholderIcon: PlaceholderIcon,
}) {
  const [search, setSearch] = useState('');
  const dialogRef = useRef(null);
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  useModalA11y(dialogRef, onClose);

  // Lock body scroll while open (useModalA11y doesn't do this).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const showSearch = items.length > 8;
  const filtered = !search ? items : items.filter((it) => {
    const hay = `${it.label || ''} ${it.description || ''} ${it.id || ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  const sub = subtitle ?? `${items.length} ${items.length === 1 ? 'theme' : 'themes'}`;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(30,0,4,0.72)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center',
        alignItems: isMobile ? 'flex-end' : 'center',
        padding: isMobile ? 0 : 24,
      }}
    >
      <Motion.div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        initial={isMobile ? { y: '100%' } : { opacity: 0, y: 10, scale: 0.98 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--gold-line)',
          borderRadius: isMobile ? 'var(--r-lg) var(--r-lg) 0 0' : 'var(--r-lg)',
          width: '100%', maxWidth: isMobile ? '100%' : 760,
          maxHeight: isMobile ? '88dvh' : '85vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <span style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          padding: '16px var(--gutter-panel)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div className="s-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
          </div>
          <button className="s-iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {/* Search (only when the list is long) */}
        {showSearch && (
          <div style={{ padding: '12px var(--gutter-panel)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 'calc(var(--gutter-panel) + 11px)', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              className="s-input" type="text" value={search}
              placeholder="Search themes…" onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>
        )}

        {/* Grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 'var(--gutter-panel)',
          paddingBottom: isMobile ? 'calc(var(--gutter-panel) + env(safe-area-inset-bottom))' : 'var(--gutter-panel)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 13 }}>
              No themes match “{search}”.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {filtered.map((it) => {
                const cover = getThemeCover(it);
                const isSel = it.id === selectedId;
                return (
                  <button
                    key={it.id}
                    className={`s-card ${isSel ? '' : 's-card--hover'}`}
                    onClick={() => onSelect?.(it)}
                    style={{
                      display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: 'pointer',
                      overflow: 'hidden', padding: 0,
                      borderColor: isSel ? 'var(--gold-line)' : 'var(--border)',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 132, flexShrink: 0 }}>
                      {cover ? (
                        <img src={cover} alt="" loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', background: gradFor(it.id),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)',
                        }}>
                          {PlaceholderIcon && <PlaceholderIcon size={26} strokeWidth={1.5} style={{ opacity: 0.85 }} />}
                        </div>
                      )}
                      {isSel && (
                        <span style={{
                          position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--gold)', color: '#2A0207', display: 'grid', placeItems: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,.4)',
                        }}><Check size={14} /></span>
                      )}
                    </div>
                    <div style={{ padding: '9px 11px 11px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? 'var(--gold-hi)' : 'var(--text)' }}>{it.label}</div>
                      {it.description && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {it.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Motion.div>
    </div>
  );
}
