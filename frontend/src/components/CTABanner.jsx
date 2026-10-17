import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

export default function CTABanner() {
  return (
    <section style={{
      background: 'var(--bg-deep)',
      padding: 'var(--section-pad) 0',
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* Animated dark crimson glow */}
      <div className="ambient-blob ambient-blob-1" style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700,
        opacity: 0.14,
      }} />
      <div className="ambient-blob ambient-blob-2" style={{
        position: 'absolute',
        top: '30%', left: '20%',
        opacity: 0.08,
      }} />

      {/* Floating decorative rings */}
      <div className="float-ring" style={{
        width: 500, height: 500,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 0.05,
        animationDuration: '12s',
      }} />
      <div className="float-ring" style={{
        width: 300, height: 300,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 0.07,
        animationDuration: '8s',
        animationDelay: '-4s',
      }} />
      <div className="float-ring" style={{
        width: 140, height: 140,
        top: '20%', right: '15%',
        opacity: 0.06,
        animationDuration: '11s',
        animationDelay: '-2s',
      }} />
      <div className="float-ring" style={{
        width: 80, height: 80,
        bottom: '20%', left: '12%',
        opacity: 0.08,
        animationDuration: '9s',
      }} />

      {/* Top border */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%',
        height: 1,
        background: 'linear-gradient(to right, transparent, var(--gold-dim), transparent)',
        opacity: 0.5,
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          viewport={{ once: true, margin: '-80px' }}
          className="label-tag"
          style={{ marginBottom: 20 }}
        >
          Begin Your Journey
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5.5vw, 80px)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'var(--white)',
            lineHeight: 1.1,
            maxWidth: 800,
            margin: '0 auto 24px',
          }}
        >
          Your perfect bridal look is waiting.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.18 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 300,
            color: 'var(--muted)',
            lineHeight: 1.8,
            maxWidth: 520,
            margin: '0 auto 48px',
          }}
        >
          Upload your photo and let our AI dress you for the day you've dreamed of.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.26 }}
          viewport={{ once: true, margin: '-80px' }}
        >
          <Link
            to="/try-on"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '18px 52px',
              borderRadius: '100px',
              background: 'var(--rose)',
              color: 'var(--bg-deep)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow: '0 0 40px rgba(201,131,106,0.25)',
              transition: 'background 250ms ease, letter-spacing 250ms ease, box-shadow 250ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--rose-light)';
              e.currentTarget.style.letterSpacing = '0.14em';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(201,131,106,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--rose)';
              e.currentTarget.style.letterSpacing = '0.1em';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(201,131,106,0.25)';
            }}
          >
            Start Your Try-On
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(32px, 6vw, 72px)',
            marginTop: 60,
            flexWrap: 'wrap',
          }}
        >
          {[
            { num: '500+',  label: 'Bridal Looks' },
            { num: '10K+',  label: 'Happy Brides' },
            { num: '99%',   label: 'Satisfaction Rate' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 700,
                color: 'var(--rose)',
                lineHeight: 1,
                marginBottom: 6,
              }}>
                {num}
              </p>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}>
                {label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
