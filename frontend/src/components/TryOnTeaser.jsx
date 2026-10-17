import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

export default function TryOnTeaser() {
  return (
    <section style={{
      background: 'var(--bg-deep)',
      padding: 'var(--section-pad) 0',
      overflow: 'hidden',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'clamp(40px, 5vw, 80px)',
          alignItems: 'center',
        }}>

          {/* ── Left: Mock UI Mirror ── */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            viewport={{ once: true, margin: '-80px' }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: 380,
              background: 'var(--glass)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
              aspectRatio: '3/4',
            }}>
              {/* Inner background */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, #1A0D09 0%, #0E0807 100%)',
              }} />

              {/* AI Active badge */}
              <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 10,
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(10,7,6,0.7)',
                backdropFilter: 'blur(8px)',
                padding: '6px 12px',
                borderRadius: '100px',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <span className="pulse-dot" />
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#22C55E',
                }}>
                  AI Active
                </span>
              </div>

              {/* Badge top right */}
              <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 10,
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                }}>
                  AI Bridal Wall
                </span>
              </div>

              {/* Silhouette placeholder */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 20, padding: 40,
                zIndex: 5,
              }}>
                {/* Dress silhouette SVG */}
                <svg width="80" height="120" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.18 }}>
                  <ellipse cx="40" cy="22" rx="14" ry="14" stroke="#C9836A" strokeWidth="1.5"/>
                  <path d="M26 36c0 0-8 4-10 16s-4 40-4 52h56c0-12-2-40-4-52S54 36 54 36" stroke="#C9836A" strokeWidth="1.5" fill="none"/>
                  <path d="M30 36l-4 12 14 8 14-8-4-12" stroke="#C9836A" strokeWidth="1.2" fill="none"/>
                </svg>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontWeight: 300,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}>
                  Upload your photo to begin
                </p>
              </div>

              {/* Animated rose gold ring glow overlay */}
              <motion.div
                animate={{ scale: [1, 1.04, 1], opacity: [0.15, 0.22, 0.15] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', inset: 24,
                  borderRadius: 'var(--r-lg)',
                  border: '1px solid var(--rose)',
                  pointerEvents: 'none',
                  zIndex: 6,
                }}
              />

              {/* Bottom action bar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
                background: 'var(--glass)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid var(--glass-border)',
                padding: '14px 16px',
                display: 'flex', justifyContent: 'space-around', gap: 8,
              }}>
                {[
                  { icon: '↑', label: 'Upload Photo' },
                  { icon: '◉', label: 'Webcam' },
                  { icon: '◇', label: 'Silhouette' },
                ].map(({ icon, label }) => (
                  <div key={label} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: 14, color: 'var(--rose)', lineHeight: 1 }}>{icon}</span>
                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                    }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Right: Text Content ── */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
            viewport={{ once: true, margin: '-80px' }}
          >
            <p className="label-tag" style={{ marginBottom: 20 }}>Core Feature</p>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 4.5vw, 62px)',
              fontWeight: 400,
              color: 'var(--white)',
              lineHeight: 1.1,
              marginBottom: 24,
            }}>
              Step Into<br />
              <em style={{ fontStyle: 'italic', color: 'var(--rose-light)' }}>The AI Mirror</em>
            </h2>

            <div style={{ width: 60, height: 1, background: 'var(--gold-dim)', marginBottom: 28 }} />

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              fontWeight: 300,
              color: 'var(--muted)',
              lineHeight: 1.8,
              maxWidth: 420,
              marginBottom: 16,
            }}>
              Our AI virtual try-on engine places your chosen bridal look directly on your image — preserving your face, skin tone, and silhouette with cinematic accuracy.
            </p>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              fontWeight: 300,
              color: 'var(--muted)',
              lineHeight: 1.8,
              maxWidth: 420,
              marginBottom: 40,
            }}>
              Explore hundreds of looks before you ever step into a boutique.
            </p>

            <Link to="/try-on" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--rose)',
              textDecoration: 'none',
              transition: 'gap 250ms ease, color 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.gap = '18px'; e.currentTarget.style.color = 'var(--rose-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.gap = '10px'; e.currentTarget.style.color = 'var(--rose)'; }}
            >
              Try It Now
              <span style={{ fontSize: 18 }}>→</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
