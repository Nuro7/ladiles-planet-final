import { useEffect, useRef } from 'react';
import useReducedMotion from '../hooks/useReducedMotion';

/**
 * Refined custom cursor: a champagne-gold dot with a softly trailing ring.
 * Calm by design — the ring keeps a constant size and simply warms + glows over
 * interactive targets (no size-jump), and eases toward the pointer gently.
 * Pure rAF + transforms → stays on the compositor thread (60fps).
 * Auto-disables on touch / coarse pointers and under reduced motion.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const root = document.querySelector('.cine-root');
    root?.classList.add('cine-cursor-on');

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...mouse };
    let hovering = false;
    let scale = 1;
    let raf;

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%, -50%)`;

      const interactive = e.target?.closest?.('a, button, [data-cursor="hover"], input, textarea');
      if (interactive && !hovering) {
        hovering = true;
        ring.style.borderColor = 'rgba(var(--cine-gold-rgb), 0.95)';
        ring.style.boxShadow = '0 0 26px rgba(var(--cine-gold-rgb), 0.45)';
      } else if (!interactive && hovering) {
        hovering = false;
        ring.style.borderColor = 'rgba(var(--cine-gold-rgb), 0.6)';
        ring.style.boxShadow = '0 0 34px rgba(var(--cine-gold-rgb), 0.32)';
      }
    };

    const onDown = () => { scale = 0.86; };
    const onUp = () => { scale = 1; };
    const onLeave = () => { dot.style.opacity = '0'; ring.style.opacity = '0'; };
    const onEnter = () => { dot.style.opacity = '1'; ring.style.opacity = '1'; };

    const loop = () => {
      // Gentle follow — a lower factor makes a calmer, more premium trail.
      ringPos.x += (mouse.x - ringPos.x) * 0.11;
      ringPos.y += (mouse.y - ringPos.y) * 0.11;
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    window.addEventListener('mouseup', onUp, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      root?.classList.remove('cine-cursor-on');
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <>
      <span ref={ringRef} className="cine-cursor cine-cursor-ring" aria-hidden="true" />
      <span ref={dotRef} className="cine-cursor cine-cursor-dot" aria-hidden="true" />
    </>
  );
}
