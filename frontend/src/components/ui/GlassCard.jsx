import { motion } from 'framer-motion';

/**
 * GlassCard — reusable glassmorphism container.
 * Props:
 *   as        — HTML element or component (default: 'div')
 *   hover     — enable rose-gold hover glow (default: true)
 *   radius    — border-radius px (default: 20)
 *   padding   — inline padding style
 *   className — extra classes
 *   onClick   — click handler
 */
export function GlassCard({
  as: Tag = 'div',
  hover = true,
  radius = 20,
  padding,
  className = '',
  children,
  style = {},
  onClick,
  ...rest
}) {
  const baseStyle = {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.11)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderRadius: radius,
    boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
    padding,
    ...style,
  };

  if (onClick || hover) {
    return (
      <motion.div
        onClick={onClick}
        className={className}
        style={baseStyle}
        whileHover={hover ? {
          borderColor: 'rgba(183, 110, 121, 0.45)',
          boxShadow: '0 8px 40px rgba(183, 110, 121, 0.22), inset 0 1px 0 rgba(255,255,255,0.1)',
          y: -2,
        } : undefined}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <Tag className={className} style={baseStyle} {...rest}>
      {children}
    </Tag>
  );
}

export default GlassCard;
