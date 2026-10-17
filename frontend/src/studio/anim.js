/**
 * anim.js — shared framer-motion presets (kept out of component files so
 * Fast Refresh boundaries stay clean).
 */
export const pageMotion = {
  initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
};
