import { motion } from 'framer-motion';

/**
 * PillButton — style filter / category pill.
 * Props:
 *   active    — highlight as selected
 *   onClick   — handler
 *   children  — label text
 */
export function PillButton({ active = false, onClick, children, className = '' }) {
  return (
    <motion.button
      onClick={onClick}
      className={className}
      style={{
        padding: '7px 18px',
        borderRadius: 9999,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        border: active
          ? '1px solid rgba(183, 110, 121, 0.6)'
          : '1px solid rgba(255, 255, 255, 0.12)',
        background: active
          ? 'linear-gradient(135deg, rgba(183,110,121,0.55) 0%, rgba(212,160,167,0.4) 100%)'
          : 'rgba(255,255,255,0.05)',
        color: active
          ? '#FAF6F1'
          : 'rgba(250, 246, 241, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'all 0.25s cubic-bezier(0.23,1,0.32,1)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.button>
  );
}

export default PillButton;
