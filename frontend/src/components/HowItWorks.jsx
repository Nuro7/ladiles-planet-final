import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STEPS = [
  {
    num: '01',
    title: 'Upload or Use Camera',
    desc: 'Share your photo or use our live camera feed. Our AI instantly maps your facial features and body proportions for a perfect fit.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="8" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="16" cy="17" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 8 L14 4 H18 L20 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="25" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'AI Scans Your Look',
    desc: 'Our deep-learning model analyses your skin tone, posture, and style preferences to recommend looks that will make you shine.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 4 L28 10 V22 L16 28 L4 22 V10 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 8 V12 M16 20 V24 M8 16 H12 M20 16 H24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Try Unlimited Styles',
    desc: 'Browse 500+ bridal looks — ball gowns, A-lines, Indo-fusion lehengas, and more. Try them all, save your favourites, share with loved ones.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M8 8 L16 4 L24 8 L24 20 Q16 26 8 20 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 16 L15 19 L21 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 24 Q8 28 16 28 Q24 28 28 24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export function HowItWorks() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      style={{
        padding: '100px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(183,110,121,0.4) 30%, rgba(212,160,167,0.6) 50%, rgba(183,110,121,0.4) 70%, transparent 100%)',
      }} />

      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        style={{ textAlign: 'center', marginBottom: 72 }}
      >
        <p style={{
          fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#B76E79', marginBottom: 12, fontWeight: 500,
        }}>
          ✦ The Process
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 300, color: '#FAF6F1',
        }}>
          How It Works
        </h2>
      </motion.div>

      {/* Steps */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
          position: 'relative',
        }}
        className="how-grid"
      >
        {/* Connecting SVG line */}
        <svg
          style={{
            position: 'absolute',
            top: 52,
            left: '16.66%',
            width: '66.66%',
            height: 2,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          className="connector-svg"
        >
          <motion.line
            x1="0" y1="1"
            x2="100%" y2="1"
            stroke="url(#lineGrad)"
            strokeWidth="1"
            strokeDasharray="1"
            strokeDashoffset={inView ? 0 : 1}
            pathLength="1"
            style={{ pathLength: inView ? 1 : 0 }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.4, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
          />
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#B76E79" stopOpacity="0.8"/>
              <stop offset="50%"  stopColor="#D4A0A7" stopOpacity="1"/>
              <stop offset="100%" stopColor="#B76E79" stopOpacity="0.8"/>
            </linearGradient>
          </defs>
        </svg>

        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 + i * 0.2, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '0 32px 0',
              position: 'relative',
            }}
          >
            {/* Step orb */}
            <div style={{ position: 'relative', marginBottom: 28 }}>
              {/* Outer glow ring */}
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
                style={{
                  position: 'absolute', inset: -10,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(183,110,121,0.25) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              {/* Number circle */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                border: '1px solid rgba(183,110,121,0.35)',
                background: 'rgba(183,110,121,0.08)',
                backdropFilter: 'blur(16px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1,
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 24, fontWeight: 300,
                  color: '#D4A0A7',
                  letterSpacing: '0.04em',
                }}>
                  {step.num}
                </span>
              </div>
            </div>

            {/* Icon */}
            <div style={{
              color: '#B76E79',
              marginBottom: 20,
              opacity: 0.8,
            }}>
              {step.icon}
            </div>

            {/* Title */}
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22, fontWeight: 400,
              color: '#FAF6F1',
              marginBottom: 12,
              letterSpacing: '0.02em',
            }}>
              {step.title}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: 14,
              fontWeight: 300,
              lineHeight: 1.75,
              color: 'rgba(250,246,241,0.5)',
              maxWidth: 280,
            }}>
              {step.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={{ textAlign: 'center', marginTop: 72 }}
      >
        <p style={{
          fontSize: 14, color: 'rgba(250,246,241,0.4)',
          letterSpacing: '0.04em', marginBottom: 24,
        }}>
          No dress. No appointment. No waiting.
        </p>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{ display: 'inline-block' }}
        >
          <a href="/try-on" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '13px 32px',
            borderRadius: 50,
            background: 'linear-gradient(135deg, rgba(183,110,121,0.2) 0%, rgba(183,110,121,0.08) 100%)',
            border: '1px solid rgba(183,110,121,0.35)',
            color: '#D4A0A7',
            fontSize: 14, fontWeight: 400,
            letterSpacing: '0.07em',
            textDecoration: 'none',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s',
          }}>
            Begin Your Journey
            <span style={{ fontSize: 18 }}>→</span>
          </a>
        </motion.div>
      </motion.div>

      {/* Bottom line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(183,110,121,0.4) 30%, rgba(212,160,167,0.6) 50%, rgba(183,110,121,0.4) 70%, transparent 100%)',
      }} />

      {/* Responsive */}
      <style>{`
        @media (max-width: 760px) {
          .how-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          .connector-svg {
            display: none !important;
          }
          .how-grid > div {
            padding: 0 16px !important;
          }
        }
      `}</style>
    </section>
  );
}

export default HowItWorks;
