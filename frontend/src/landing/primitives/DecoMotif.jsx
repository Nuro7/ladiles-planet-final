/**
 * Art Deco sunburst medallion — a champagne-gold geometric flourish.
 * Thin radiating rays (alternating length) inside concentric rings with a
 * center diamond. Colour is inherited via `currentColor`, so set `color` on a
 * parent (e.g. `color: var(--cine-gold)`). Purely decorative → aria-hidden.
 *
 *   <DecoMotif size={54} />                     // static emblem
 *   <DecoMotif size={96} spin />                // slow-rotating (loader)
 */
export default function DecoMotif({ size = 54, rays = 16, spin = false, className, style }) {
  const cx = 50, cy = 50;
  const lines = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * Math.PI * 2;
    const inner = i % 2 === 0 ? 19 : 25;   // alternating ray roots → deco sunburst
    const outer = 40;
    return {
      x1: cx + Math.cos(a) * inner, y1: cy + Math.sin(a) * inner,
      x2: cx + Math.cos(a) * outer, y2: cy + Math.sin(a) * outer,
    };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      className={className} aria-hidden="true" style={style}>
      <g className={spin ? 'cine-deco-spin' : undefined}>
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="44" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx={cx} cy={cy} r="14.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <rect x="44" y="44" width="12" height="12" transform="rotate(45 50 50)"
        stroke="currentColor" strokeWidth="1" opacity="0.95" />
    </svg>
  );
}
