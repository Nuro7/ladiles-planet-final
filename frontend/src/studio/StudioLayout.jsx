/**
 * StudioLayout.jsx — the resizable main-canvas + settings-panel split that every
 * generating module plugs into. Keeps the shell consistent while letting each
 * module supply its own canvas, settings, and generate bar.
 *
 * Desktop/tablet (≥768): a resizable two-column split (canvas + right panel),
 * with a small custom pointer-drag resizer (no external dep) so the right panel
 * width is fully under our control and persists across sessions.
 *
 * Mobile (<768): the canvas goes full-width and the settings + generate bar move
 * into a slide-up bottom sheet opened by a floating "Customize & Generate" pill —
 * so phones can actually configure and generate (the panel used to be hidden).
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion as Motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import useBreakpoint from '../hooks/useBreakpoint';
import { pageMotion } from './anim';

const MIN = 300;
const MAX = 520;
const DEFAULT = 372;
const STORE_KEY = 'lp_studio_rightw';

function readStored() {
  const v = Number(localStorage.getItem(STORE_KEY));
  return Number.isFinite(v) && v >= MIN && v <= MAX ? v : DEFAULT;
}

export default function StudioLayout({ header, canvas, settings, settingsTitle = 'Settings', genbar, initiallyOpen = false }) {
  const wrapRef = useRef(null);
  const [rightW, setRightW] = useState(readStored);
  const [dragging, setDragging] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(initiallyOpen);
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  const onDown = useCallback((e) => {
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);
  const onMove = useCallback((e) => {
    if (!dragging) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = Math.min(MAX, Math.max(MIN, rect.right - e.clientX));
    setRightW(w);
  }, [dragging]);
  const onUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    localStorage.setItem(STORE_KEY, String(rightW));
  }, [dragging, rightW]);

  // Lock body scroll while the mobile sheet is open (also restores on resize
  // back to desktop, since isMobile flipping false re-runs the cleanup).
  useEffect(() => {
    if (!isMobile || !sheetOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMobile, sheetOpen]);

  // Only treat the sheet as open on mobile — on desktop the split panel is used,
  // so a stale sheetOpen from a prior narrow viewport is simply ignored.
  const showSheet = isMobile && sheetOpen;

  if (isMobile) {
    return (
      <Motion.div className="s-workzone s-workzone--mobile" ref={wrapRef} {...pageMotion}>
        <div className="s-main" style={{ flex: 1 }}>
          {header}
          <div className="s-main__scroll" style={{ display: 'flex', flexDirection: 'column' }}>{canvas}</div>
        </div>

        {settings && !showSheet && (
          <button className="s-sheet-fab" onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal size={16} /> Customize &amp; Generate
          </button>
        )}

        {settings && showSheet && (
          <>
            <div className="s-sheet-scrim" onClick={() => setSheetOpen(false)} />
            <Motion.div
              className="s-right s-sheet" role="dialog" aria-modal="true" aria-label={settingsTitle}
              initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="s-right__head">
                <span className="s-right__title">{settingsTitle}</span>
                <button className="s-iconbtn" onClick={() => setSheetOpen(false)} aria-label="Close settings"><X size={18} /></button>
              </div>
              <div className="s-right__scroll">{settings}</div>
              {genbar && (
                // Tapping the Generate button dismisses the sheet so the render is visible.
                <div className="s-genbar" onClickCapture={(e) => { if (e.target.closest('button')) setSheetOpen(false); }}>{genbar}</div>
              )}
            </Motion.div>
          </>
        )}
      </Motion.div>
    );
  }

  return (
    <Motion.div className="s-workzone" ref={wrapRef} {...pageMotion}>
      <div className="s-main" style={{ flex: 1 }}>
        {header}
        <div className="s-main__scroll" style={{ display: 'flex', flexDirection: 'column' }}>{canvas}</div>
      </div>

      {settings && (
        <>
          <div
            className="s-resize"
            data-resize-handle-state={dragging ? 'drag' : undefined}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            role="separator" aria-orientation="vertical"
          />
          <div className="s-right" style={{ width: rightW, flexShrink: 0 }}>
            <div className="s-right__head"><span className="s-right__title">{settingsTitle}</span></div>
            <div className="s-right__scroll">{settings}</div>
            {genbar && <div className="s-genbar">{genbar}</div>}
          </div>
        </>
      )}
    </Motion.div>
  );
}
