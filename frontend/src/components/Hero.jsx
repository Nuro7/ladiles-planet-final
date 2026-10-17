import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] } },
};

export function Hero() {
  return (
    <section style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      paddingTop: 72,
    }}>
      {/* ── Background Orbs ── */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {/* Orb 1 — rose gold */}
        <div className="orb-1" style={{
          position: 'absolute',
          top: '15%', left: '8%',
          width: 520, height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(183,110,121,0.22) 0%, rgba(183,110,121,0.06) 50%, transparent 70%)',
          filter: 'blur(2px)',
        }} />
        {/* Orb 2 — ivory */}
        <div className="orb-2" style={{
          position: 'absolute',
          top: '50%', right: '5%',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250,246,241,0.07) 0%, rgba(250,246,241,0.02) 50%, transparent 70%)',
          filter: 'blur(1px)',
        }} />
        {/* Orb 3 — deep rose */}
        <div className="orb-3" style={{
          position: 'absolute',
          bottom: '10%', left: '35%',
          width: 320, height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,160,167,0.15) 0%, transparent 70%)',
        }} />

        {/* Subtle grain overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.4,
        }} />
      </div>

      {/* ── Content ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: 900,
          padding: '0 24px',
        }}
      >
        {/* Eyebrow */}
        <motion.div variants={fadeUp} style={{ marginBottom: 28 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 20px',
            borderRadius: 9999,
            border: '1px solid rgba(183,110,121,0.35)',
            background: 'rgba(183,110,121,0.08)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#D4A0A7',
            backdropFilter: 'blur(12px)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A0A7', display: 'inline-block' }} />
            AI-Powered Virtual Bridal Experience
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1 variants={fadeUp} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(52px, 9vw, 120px)',
          fontWeight: 300,
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
          marginBottom: 12,
          color: '#FAF6F1',
        }}>
          Ladies
        </motion.h1>

        <motion.h1 variants={fadeUp} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(52px, 9vw, 120px)',
          fontWeight: 300,
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
          marginBottom: 32,
        }}>
          <span className="text-shimmer">Planet</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p variants={fadeUp} style={{
          fontSize: 'clamp(16px, 2.5vw, 21px)',
          fontWeight: 300,
          color: 'rgba(250,246,241,0.65)',
          letterSpacing: '0.04em',
          lineHeight: 1.7,
          maxWidth: 560,
          margin: '0 auto 48px',
        }}>
          Step into the future of bridal fashion. Our AI mirror drapes your dream
          wedding look onto you — in real time, without a single stitch.
        </motion.p>

        {/* CTA Row */}
        <motion.div variants={fadeUp} style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {/* Primary CTA */}
          <Link to="/try-on">
            <motion.button
              className="pulse-glow"
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              style={{
                padding: '15px 38px',
                borderRadius: 50,
                border: 'none',
                background: 'linear-gradient(135deg, #B76E79 0%, #D4A0A7 60%, #B76E79 100%)',
                backgroundSize: '200% 100%',
                color: '#FAF6F1',
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.07em',
                cursor: 'pointer',
              }}
            >
              ✦ Start Try-On
            </motion.button>
          </Link>

          {/* Secondary CTA */}
          <Link to="/looks">
            <motion.button
              whileHover={{
                borderColor: 'rgba(183,110,121,0.55)',
                background: 'rgba(183,110,121,0.08)',
                y: -3,
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              style={{
                padding: '14px 36px',
                borderRadius: 50,
                border: '1px solid rgba(250,246,241,0.2)',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                color: 'rgba(250,246,241,0.8)',
                fontSize: 15,
                fontWeight: 400,
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              Explore Looks
            </motion.button>
          </Link>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 48,
            marginTop: 72,
            flexWrap: 'wrap',
          }}
        >
          {[
            { num: '500+', label: 'Bridal Looks' },
            { num: '10K+', label: 'Brides Served' },
            { num: '99%',  label: 'Satisfaction' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 34,
                fontWeight: 400,
                color: '#D4A0A7',
                lineHeight: 1,
                marginBottom: 6,
              }}>
                {num}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(250,246,241,0.4)',
              }}>
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Scroll Indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="scroll-bounce"
        style={{
          position: 'absolute',
          bottom: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          color: 'rgba(250,246,241,0.35)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        <span>Scroll</span>
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <rect x="6.5" y="1" width="3" height="3" rx="1.5" fill="currentColor" opacity="0.6"/>
          <path d="M8 6v10M4 13l4 5 4-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>
    </section>
  );
}

export default Hero;
