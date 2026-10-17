import { useEffect, useRef, useState } from 'react';

/**
 * Renders a lightweight placeholder until it nears the viewport, then mounts
 * its children. Pairs with React.lazy so heavy chunks (e.g. Three.js) download
 * only when the visitor actually approaches that section — keeps the initial
 * bundle lean for a high Lighthouse score.
 */
export default function DeferMount({ children, minHeight = '80vh', rootMargin = '600px', style }) {
  const ref = useRef(null);
  // Mount immediately where IntersectionObserver is unavailable (SSR/very old
  // browsers); otherwise wait until we near the viewport.
  const [show, setShow] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (show || !ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShow(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [show, rootMargin]);

  if (show) return children;
  return <div ref={ref} aria-hidden style={{ minHeight, ...style }} />;
}
