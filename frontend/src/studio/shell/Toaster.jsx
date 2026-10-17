/**
 * Toaster.jsx — bottom-right glass toasts driven by useUIStore.
 */
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useUIStore } from '../store';

const ICON = { success: CheckCircle2, info: Info, error: AlertTriangle };
const COLOR = { success: 'var(--success)', info: 'var(--processing)', error: 'var(--danger)' };

export default function Toaster() {
  const { toasts, dismissToast } = useUIStore();
  return (
    <div style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICON[t.variant] || Info;
          return (
            <Motion.div key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{
                minWidth: 280, maxWidth: 360, display: 'flex', gap: 11, padding: '13px 14px',
                background: 'rgba(23,23,23,.94)', backdropFilter: 'blur(20px)',
                border: '1px solid var(--border)', borderLeft: `3px solid ${COLOR[t.variant] || COLOR.info}`,
                borderRadius: 12, boxShadow: 'var(--shadow-2)',
              }}>
              <Icon size={18} style={{ color: COLOR[t.variant] || COLOR.info, flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.title && <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{t.title}</div>}
                {t.body && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.5 }}>{t.body}</div>}
              </div>
              <button className="s-iconbtn" style={{ width: 24, height: 24 }} onClick={() => dismissToast(t.id)}><X size={13} /></button>
            </Motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
