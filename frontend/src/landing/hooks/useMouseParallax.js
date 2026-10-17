import { useEffect, useRef } from 'react';
import useReducedMotion from './useReducedMotion';

/**
 * Returns a ref to attach to a container. Pointer movement over the window
 * is normalised to [-1, 1] and written to CSS custom properties (--mx, --my)
 * on that element, so children can parallax via calc() without React re-renders.
 * Lerped for buttery motion; no-ops under reduced motion.
 */
export default function useMouseParallax() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;
    const el = ref.current;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf;

    const onMove = (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      el.style.setProperty('--mx', cur.x.toFixed(4));
      el.style.setProperty('--my', cur.y.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return ref;
}
