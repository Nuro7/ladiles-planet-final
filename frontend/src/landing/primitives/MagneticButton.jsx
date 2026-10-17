import { useRef } from 'react';
import { Link } from 'react-router-dom';
import useReducedMotion from '../hooks/useReducedMotion';

/**
 * Magnetic hover wrapper — the element (and, more subtly, its label) drift
 * toward the pointer, then spring home on leave. Renders as a react-router
 * <Link> (`to`), an anchor (`href`), or a <button> (onClick).
 */
export default function MagneticButton({
  to, href, onClick, strength = 0.4, className, style, children, ...rest
}) {
  const ref = useRef(null);
  const innerRef = useRef(null);
  const reduced = useReducedMotion();

  const onMove = (e) => {
    if (reduced) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    if (innerRef.current)
      innerRef.current.style.transform = `translate(${x * strength * 0.35}px, ${y * strength * 0.35}px)`;
  };
  const onLeave = () => {
    const el = ref.current;
    el.style.transform = 'translate(0,0)';
    if (innerRef.current) innerRef.current.style.transform = 'translate(0,0)';
  };

  const shared = {
    ref,
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    className,
    style: { display: 'inline-flex', transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)', willChange: 'transform', ...style },
    'data-cursor': 'hover',
    ...rest,
  };
  const inner = <span ref={innerRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)' }}>{children}</span>;

  if (to) return <Link to={to} {...shared}>{inner}</Link>;
  if (href) return <a href={href} {...shared}>{inner}</a>;
  return <button type="button" onClick={onClick} {...shared}>{inner}</button>;
}
