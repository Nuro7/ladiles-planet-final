import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

const DiamondIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L15 8L8 15L1 8L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.9"/>
    <path d="M8 4L12 8L8 12L4 8L8 4Z" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.4"/>
  </svg>
);

const COL_PAGES = [
  { to: '/',           label: 'Home' },
  { to: '/collection', label: 'Collection' },
  { to: '/try-on',     label: 'Try-On Studio' },
  { to: '/lookbook',   label: 'Lookbook' },
];

const COL_LEGAL = [
  { label: 'Privacy Policy' },
  { label: 'Terms of Use' },
  { label: 'Cookie Policy' },
  { label: 'Contact Us' },
];

const COL_SOCIAL = [
  { label: 'Instagram' },
  { label: 'Facebook' },
  { label: 'WhatsApp' },
  { label: 'Pinterest' },
];

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-deep)',
      borderTop: '1px solid var(--rose)',
      padding: 'clamp(48px, 6vw, 80px) 0 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle ambient */}
      <div className="ambient-blob ambient-blob-2" style={{
        position: 'absolute', bottom: 0, right: '-100px', opacity: 0.05,
      }} />

      <div className="container">
        {/* ── 4-column grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'clamp(32px, 4vw, 56px)',
          paddingBottom: 'clamp(40px, 5vw, 64px)',
        }}>
          {/* Col 1: Logo + tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            viewport={{ once: true }}
          >
            <Link to="/" style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              textDecoration: 'none',
            }}>
              <span style={{ color: 'var(--rose)' }}><DiamondIcon /></span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12, fontWeight: 500,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--white)',
              }}>
                AI Bridal Wall
              </span>
            </Link>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14, fontWeight: 300,
              color: 'var(--muted)', lineHeight: 1.75,
              maxWidth: 240,
            }}>
              The world's most luxurious AI-powered virtual bridal try-on experience.
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 12,
              color: 'var(--gold-dim)',
              marginTop: 16,
              letterSpacing: '0.04em',
            }}>
              Ladies Planet since 2006
            </p>
          </motion.div>

          {/* Col 2: Pages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
            viewport={{ once: true }}
          >
            <h4 style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10, fontWeight: 500,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 20,
            }}>
              Pages
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {COL_PAGES.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14, fontWeight: 300,
                    color: 'var(--muted)',
                    textDecoration: 'none',
                    transition: 'color 200ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--white)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Col 3: Legal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.14 }}
            viewport={{ once: true }}
          >
            <h4 style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10, fontWeight: 500,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 20,
            }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {COL_LEGAL.map(({ label }) => (
                <li key={label}>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14, fontWeight: 300,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'color 200ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--white)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Col 4: Social + contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10, fontWeight: 500,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 20,
            }}>
              Connect
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {COL_SOCIAL.map(({ label }) => (
                <li key={label}>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14, fontWeight: 300,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'color 200ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          borderTop: '1px solid var(--glass-border)',
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12, fontWeight: 300,
            color: 'var(--muted)',
            letterSpacing: '0.04em',
          }}>
            © 2024 AI Bridal Wall · Ladies Planet
          </p>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12, fontWeight: 300,
            color: 'var(--muted)',
            letterSpacing: '0.04em',
          }}>
            Crafted with AI
          </p>
        </div>
      </div>
    </footer>
  );
}
