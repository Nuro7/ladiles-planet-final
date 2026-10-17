import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import useReducedMotion from '../hooks/useReducedMotion';
import { LenisContext } from './lenisContext';

gsap.registerPlugin(ScrollTrigger);

/**
 * Provides Lenis smooth inertia scrolling wired into the GSAP ticker so
 * ScrollTrigger stays perfectly in sync (no double rAF loops → 60fps).
 * The instance is exposed through a stable ref (no re-renders); Lenis drives
 * native scroll events, so consumers can just listen to `window` scroll.
 * Disabled entirely under prefers-reduced-motion.
 */
export function SmoothScrollProvider({ children }) {
  const reduced = useReducedMotion();
  const lenisRef = useRef(null);

  useEffect(() => {
    if (reduced) {
      // Native scrolling; still let ScrollTrigger drive reveal states.
      ScrollTrigger.refresh();
      return;
    }

    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });
    lenisRef.current = instance;

    instance.on('scroll', ScrollTrigger.update);

    const raf = (time) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Let async section content (videos, 3D) settle then re-measure.
    const refreshT = setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      clearTimeout(refreshT);
      gsap.ticker.remove(raf);
      instance.off('scroll', ScrollTrigger.update);
      instance.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}
