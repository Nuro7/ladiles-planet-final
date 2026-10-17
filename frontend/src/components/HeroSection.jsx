import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

// Staggered word/line entrance
const containerVar = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
};
const lineVar = {
  hidden: { opacity: 0, y: 60 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
});

export default function HeroSection() {
  const ref = useRef(null);

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 600,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-deep)',
      }}
    >
      {/* ── Background gradient — mimics dark bridal photography ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 80% 90% at 70% 50%, rgba(40,20,15,0.9) 0%, transparent 60%),
          radial-gradient(ellipse 60% 70% at 20% 30%, rgba(25,12,8,0.7) 0%, transparent 50%),
          linear-gradient(160deg, #1A0D09 0%, #0A0706 40%, #12080A 100%)
        `,
        zIndex: 1,
      }} />

      {/* ── Overlay gradient from bottom ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, var(--overlay-heavy) 0%, transparent 50%)',
        zIndex: 2,
      }} />

      {/* ── Ambient blobs ── */}
      <div className="ambient-blob ambient-blob-1" style={{
        position: 'absolute', top: '5%', right: '-5%', zIndex: 1,
      }} />
      <div className="ambient-blob ambient-blob-2" style={{
        position: 'absolute', bottom: '10%', left: '5%', zIndex: 1,
      }} />

      {/* ── Decorative rose gold ring elements ── */}
      <div className="float-ring" style={{
        width: 400, height: 400,
        top: '-80px', right: '10%',
        animationDuration: '10s',
      }} />
      <div className="float-ring" style={{
        width: 200, height: 200,
        bottom: '15%', right: '25%',
        animationDuration: '14s',
        animationDelay: '-5s',
      }} />
      <div style={{
        position: 'absolute',
        width: 1, height: '35%',
        background: 'linear-gradient(to bottom, transparent, var(--gold-dim), transparent)',
        right: '18%', top: '20%',
        zIndex: 2, opacity: 0.4,
      }} />

      {/* ── Content ── */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        width: '100%',
        maxWidth: 'var(--container)',
        margin: '0 auto',
        padding: '0 clamp(20px, 4vw, 60px)',
        paddingTop: 72,
      }}>
        {/* Label */}
        <motion.p {...fadeUp(0.3)} className="label-tag" style={{ marginBottom: 28 }}>
          AI-Powered Bridal Experience
        </motion.p>

        {/* Hero headline */}
        <motion.div variants={containerVar} initial="hidden" animate="show">
          <motion.div variants={lineVar}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(48px, 8vw, 110px)',
              color: 'var(--white)',
              lineHeight: 1.0,
              letterSpacing: '-0.01em',
              marginBottom: 0,
            }}>
              Wear Your
            </h1>
          </motion.div>

          <motion.div variants={lineVar}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'normal',
              fontWeight: 900,
              fontSize: 'clamp(56px, 9vw, 124px)',
              color: 'var(--white)',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              marginBottom: 0,
              textTransform: 'uppercase',
            }}>
              Dream Look
            </h1>
          </motion.div>

          <motion.div variants={lineVar}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(40px, 6vw, 88px)',
              color: 'var(--rose)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              marginBottom: 0,
            }}>
              Before The Day.
            </h2>
          </motion.div>
        </motion.div>

        {/* Subtext */}
        <motion.p
          {...fadeUp(0.9)}
          style={{
            marginTop: 32,
            maxWidth: 420,
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 300,
            color: 'var(--muted)',
            lineHeight: 1.8,
          }}
        >
          Virtual try-on powered by AI. Find your forever look.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(1.05)}
          style={{ marginTop: 44, display: 'flex', gap: 16, flexWrap: 'wrap' }}
        >
          <Link to="/try-on" style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '16px 36px',
            borderRadius: '100px',
            background: 'var(--rose)',
            color: 'var(--bg-deep)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
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
          <Link to="/collection" style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '16px 36px',
            borderRadius: '100px',
            background: 'transparent',
            color: 'var(--white)',
            border: '1px solid rgba(245,240,235,0.35)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            transition: 'border-color 250ms ease, background 250ms ease, letter-spacing 250ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--white)'; e.currentTarget.style.background = 'rgba(245,240,235,0.06)'; e.currentTarget.style.letterSpacing = '0.14em'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,240,235,0.35)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.letterSpacing = '0.1em'; }}
          >
            View Collection
          </Link>
        </motion.div>
      </div>

      {/* ── Right edge: vertical social icons ── */}
      <motion.div
        {...fadeUp(1.2)}
        style={{
          position: 'absolute',
          right: 28,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
        className="hide-mobile"
      >
        {['IG', 'FB', 'WA'].map((s) => (
          <span
            key={s}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              cursor: 'pointer',
              transition: 'color 200ms ease',
              writingMode: 'vertical-rl',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
          >
            {s}
          </span>
        ))}
        <div style={{ width: 1, height: 50, background: 'linear-gradient(to bottom, var(--gold-dim), transparent)' }} />
      </motion.div>

      {/* ── Left edge: scroll indicator ── */}
      <motion.div
        {...fadeUp(1.3)}
        style={{
          position: 'absolute',
          left: 28,
          bottom: 48,
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
        className="hide-mobile"
      >
        <div style={{ width: 1, height: 50, background: 'linear-gradient(to bottom, transparent, var(--gold-dim))' }} />
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}>
          Scroll
        </span>
      </motion.div>
    </section>
  );
}
