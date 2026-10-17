import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { to: '/',           label: 'Home' },
  { to: '/collection', label: 'Collection' },
  { to: '/try-on',     label: 'Try-On' },
  { to: '/lookbook',   label: 'Lookbook' },
];

const DiamondIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L15 8L8 15L1 8L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.9"/>
    <path d="M8 4L12 8L8 12L4 8L8 4Z" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.4"/>
  </svg>
);

const menuVariants = {
  closed: { opacity: 0, x: '100%' },
  open:   { opacity: 1, x: '0%', transition: { duration: 0.5, ease: [0.16,1,0.3,1] } },
};

const linkVariants = {
  closed: { opacity: 0, x: 40 },
  open:   (i) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.12 + i * 0.09, duration: 0.55, ease: [0.16,1,0.3,1] }
  }),
};

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16,1,0.3,1], delay: 0.2 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 'var(--z-nav)',
          padding: '0 clamp(20px, 4vw, 60px)',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 400ms ease, border-color 400ms ease',
          background: scrolled ? 'var(--glass)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--glass-border)' : '1px solid transparent',
        }}
      >
        {/* ── Logo ─── */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ color: 'var(--rose)', display: 'flex' }}>
            <DiamondIcon />
          </span>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--white)',
          }}>
            AI Bridal Wall
          </span>
        </Link>

        {/* ── Desktop nav (hidden on small screens) ─── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 36,
        }} className="hide-mobile">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isActive ? 'var(--rose)' : 'var(--muted)',
                textDecoration: 'none',
                transition: 'color 200ms ease',
              })}
            >
              {label}
            </NavLink>
          ))}
          <Link to="/try-on" style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 22px',
            borderRadius: '100px',
            background: 'var(--rose)',
            color: 'var(--bg-deep)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            transition: 'background 250ms ease, letter-spacing 250ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-light)'; e.currentTarget.style.letterSpacing = '0.14em'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--rose)'; e.currentTarget.style.letterSpacing = '0.1em'; }}
          >
            Begin Try-On
          </Link>
        </div>

        {/* ── Hamburger ─── */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            padding: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            zIndex: 102,
            position: 'relative',
          }}
        >
          {[0,1,2].map(i => (
            <motion.span
              key={i}
              animate={menuOpen
                ? i === 0 ? { rotate: 45, y: 6 }
                : i === 1 ? { opacity: 0, scaleX: 0 }
                :           { rotate: -45, y: -6 }
                : { rotate: 0, y: 0, opacity: 1, scaleX: 1 }
              }
              transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}
              style={{
                display: 'block',
                width: i === 1 ? 18 : 26,
                height: 1.5,
                background: 'var(--white)',
                borderRadius: 1,
                transformOrigin: 'center',
                alignSelf: i === 1 ? 'flex-end' : 'auto',
              }}
            />
          ))}
        </button>
      </motion.nav>

      {/* ── Full-screen mobile/overlay menu ─── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit={{ opacity: 0, x: '100%', transition: { duration: 0.35, ease: [0.4,0,1,1] } }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 95,
              background: 'var(--bg-deep)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="ambient-blob ambient-blob-1" style={{ top: '-80px', right: '-80px', opacity: 0.07 }} />
            <div className="ambient-blob ambient-blob-2" style={{ bottom: '-60px', left: '-60px', opacity: 0.05 }} />

            <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {NAV_LINKS.map(({ to, label }, i) => (
                <motion.div key={to} custom={i} variants={linkVariants} initial="closed" animate="open">
                  <NavLink
                    to={to}
                    end={to === '/'}
                    style={({ isActive }) => ({
                      display: 'block',
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(38px, 9vw, 68px)',
                      fontWeight: isActive ? 700 : 400,
                      fontStyle: 'italic',
                      color: isActive ? 'var(--rose)' : 'var(--white)',
                      textDecoration: 'none',
                      padding: '8px 0',
                      textAlign: 'center',
                      transition: 'color 200ms ease',
                      lineHeight: 1.15,
                    })}
                  >
                    {label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.4 } }}
              style={{ marginTop: 52 }}
            >
              <Link
                to="/try-on"
                style={{
                  display: 'inline-flex',
                  padding: '14px 40px',
                  borderRadius: '100px',
                  background: 'var(--rose)',
                  color: 'var(--bg-deep)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Begin Try-On
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.65, duration: 0.4 } }}
              style={{
                position: 'absolute',
                bottom: 48,
                display: 'flex',
                gap: 28,
                alignItems: 'center',
              }}
            >
              {['Instagram', 'Facebook', 'WhatsApp'].map((s) => (
                <span key={s} style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}>
                  {s}
                </span>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
