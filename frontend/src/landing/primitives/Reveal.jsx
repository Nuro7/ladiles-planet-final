import { motion } from 'framer-motion';
import useReducedMotion from '../hooks/useReducedMotion';

/**
 * Scroll-triggered reveal. Fades / slides / blurs content in as it enters the
 * viewport. A single primitive keeps the motion language identical everywhere.
 *
 *   <Reveal variant="up" delay={0.1}>…</Reveal>
 *   <Reveal as="h2" variant="blur">…</Reveal>
 */
const PRESETS = {
  up:    { hidden: { opacity: 0, y: 40 },        show: { opacity: 1, y: 0 } },
  down:  { hidden: { opacity: 0, y: -40 },       show: { opacity: 1, y: 0 } },
  left:  { hidden: { opacity: 0, x: 48 },        show: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: -48 },       show: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.92 },  show: { opacity: 1, scale: 1 } },
  blur:  { hidden: { opacity: 0, y: 26, filter: 'blur(14px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } },
  fade:  { hidden: { opacity: 0 },               show: { opacity: 1 } },
};

export default function Reveal({
  as = 'div',
  variant = 'up',
  delay = 0,
  duration = 0.9,
  amount = 0.3,
  once = true,
  style,
  className,
  children,
  ...rest
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  if (reduced) {
    const Tag = as;
    return <Tag style={style} className={className} {...rest}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={PRESETS[variant] || PRESETS.up}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/** Stagger container: children reveal in sequence. Pair with <RevealItem>. */
export function RevealGroup({ as = 'div', stagger = 0.12, delay = 0, amount = 0.25, once = true, style, className, children, ...rest }) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduced) {
    const Tag = as;
    return <Tag style={style} className={className} {...rest}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({ as = 'div', variant = 'up', duration = 0.85, style, className, children, ...rest }) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      style={style}
      variants={PRESETS[variant] || PRESETS.up}
      transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
