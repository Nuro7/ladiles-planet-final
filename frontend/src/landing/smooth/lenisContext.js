import { createContext, useContext } from 'react';

/**
 * Holds a stable ref to the active Lenis instance (or { current: null } under
 * reduced motion). Kept in its own module so the provider file can export only
 * a component (Fast Refresh friendly) and so no state churns on mount.
 */
export const LenisContext = createContext({ current: null });

/** The Lenis ref: `useLenisRef().current` is the instance, or null. */
export function useLenisRef() {
  return useContext(LenisContext);
}

/**
 * Smoothly scroll to a target (selector or element). Uses Lenis when active,
 * else falls back to native smooth scrollIntoView.
 */
export function useScrollTo() {
  const lenisRef = useLenisRef();
  return (target, opts = {}) => {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.4, ...opts });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}
