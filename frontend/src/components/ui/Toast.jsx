import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast — bottom-right glass notification.
 * Props:
 *   message   — string to display
 *   type      — 'error' | 'success' | 'info' (default: 'error')
 *   onClose   — called after duration or when user clicks X
 *   duration  — ms before auto-close (default: 4000)
 */
export function Toast({ message, type = 'error', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  const borderColor =
    type === 'success' ? 'rgba(52, 211, 153, 0.7)' :
    type === 'info'    ? 'rgba(96, 165, 250, 0.7)' :
                         'rgba(183, 110, 121, 0.9)';

  const iconColor =
    type === 'success' ? '#34d399' :
    type === 'info'    ? '#60a5fa' :
                         '#D4A0A7';

  const icon =
    type === 'success' ? '✓' :
    type === 'info'    ? 'i' :
                         '✕';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 9999,
            maxWidth: 380,
            minWidth: 260,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 20px',
            borderRadius: 16,
            background: 'rgba(26, 26, 31, 0.92)',
            border: `1px solid ${borderColor}`,
            borderLeft: `4px solid ${borderColor}`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Icon */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${iconColor}20`,
            color: iconColor,
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {icon}
          </div>

          {/* Message */}
          <p style={{
            flex: 1,
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: 'rgba(250, 246, 241, 0.9)',
            lineHeight: 1.4,
            margin: 0,
          }}>
            {message}
          </p>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(250,246,241,0.4)',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FAF6F1'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,246,241,0.4)'}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Toast;
