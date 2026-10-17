/**
 * EmptyState.jsx — large, editorial empty state for a module canvas.
 */
import { motion as Motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, sub, hints = [] }) {
  return (
    <div className="s-empty">
      <Motion.div
        className="s-empty__mark"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ animation: 's-float 5s ease-in-out infinite' }}>
        {Icon && <Icon size={34} strokeWidth={1.5} />}
      </Motion.div>
      <Motion.h2 className="s-empty__title"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        {title}
      </Motion.h2>
      <Motion.p className="s-empty__sub"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        {sub}
      </Motion.p>
      {hints.length > 0 && (
        <Motion.div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {hints.map((h, i) => (
            <span key={i} className="s-badge">
              <span className="s-mono" style={{ color: 'var(--gold)', fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
              {h}
            </span>
          ))}
        </Motion.div>
      )}
    </div>
  );
}
