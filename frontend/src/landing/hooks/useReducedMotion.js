import { useEffect, useState } from 'react';

/**
 * Tracks the user's `prefers-reduced-motion` setting, live.
 * Every cinematic effect in the landing page gates on this so the
 * experience degrades to a calm, static layout when requested.
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}
