/**
 * SkeletonLoader — animated shimmer placeholder.
 * Props:
 *   width    — CSS width (default: '100%')
 *   height   — CSS height (default: '100%')
 *   radius   — border-radius (default: 12)
 *   count    — repeat N times stacked (default: 1)
 *   gap      — gap between repeated items in px (default: 12)
 */
export function SkeletonLoader({
  width = '100%',
  height = '100%',
  radius = 12,
  count = 1,
  gap = 12,
}) {
  const style = {
    width,
    height,
    borderRadius: radius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '400% 100%',
    animation: 'skeleton-pulse 1.8s ease-in-out infinite',
  };

  if (count === 1) return <div style={style} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ ...style, animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}

export default SkeletonLoader;
