import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

const scrollReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: EASE, delay },
  viewport: { once: true, margin: '-80px' },
});

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="14" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 22c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M20 7l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Virtual Try-On Mirror',
    body: 'Upload your photo and watch AI drape your chosen bridal look on you in real time — with stunning precision.',
    tag: 'Core Feature',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M5 14h4l3-8 4 16 3-8 2 4 2-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="23" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M21 14c0 3.866-3.134 7-7 7s-7-3.134-7-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'AI Style Match',
    body: 'Our AI reads your face, body shape, and preferences to curate your perfect bridal style — personalized to you.',
    tag: 'AI Intelligence',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="6" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 12h4M9 15h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M17 9h4M17 12h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Instant Lookbook',
    body: 'Save every look you love, build your curated bridal lookbook, and share it with family, friends, or your stylist.',
    tag: 'Save & Share',
  },
];

export default function FeatureCards() {
  return (
    <section style={{
      background: 'var(--bg-dark)',
      padding: 'var(--section-pad) 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle top border */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%',
        height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim), transparent)',
        opacity: 0.4,
      }} />

      <div className="container">
        {/* Section label */}
        <motion.p {...scrollReveal(0)} className="label-tag" style={{ marginBottom: 16, textAlign: 'center' }}>
          What We Do
        </motion.p>

        <motion.h2
          {...scrollReveal(0.08)}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4.5vw, 58px)',
            fontWeight: 400,
            fontStyle: 'italic',
            textAlign: 'center',
            color: 'var(--white)',
            marginBottom: 'clamp(48px, 6vw, 80px)',
          }}
        >
          Bridal Intelligence, Reimagined
        </motion.h2>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {FEATURES.map(({ icon, title, body, tag }, i) => (
            <motion.div
              key={title}
              {...scrollReveal(0.1 + i * 0.1)}
              style={{
                position: 'relative',
                background: 'var(--glass)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid var(--glass-border)',
                borderTop: '2px solid var(--rose)',
                borderRadius: 'var(--r-md)',
                padding: 'clamp(28px, 3vw, 40px)',
                cursor: 'default',
                transition: 'transform 300ms var(--ease-cinematic), border-color 300ms ease, box-shadow 300ms ease',
              }}
              whileHover={{
                y: -8,
                transition: { duration: 0.3, ease: EASE },
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(201,131,106,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Icon */}
              <div style={{
                color: 'var(--rose)',
                marginBottom: 24,
                display: 'flex',
              }}>
                {icon}
              </div>

              {/* Tag */}
              <p className="label-tag" style={{ marginBottom: 12 }}>{tag}</p>

              {/* Title */}
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(20px, 2.2vw, 26px)',
                fontWeight: 400,
                color: 'var(--white)',
                marginBottom: 16,
                lineHeight: 1.25,
              }}>
                {title}
              </h3>

              {/* Body */}
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 300,
                color: 'var(--muted)',
                lineHeight: 1.75,
              }}>
                {body}
              </p>

              {/* Bottom rose gold accent line */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 40, right: 40,
                height: 1,
                background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)',
              }} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Subtle bottom border */}
      <div style={{
        position: 'absolute', bottom: 0, left: '10%', right: '10%',
        height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim), transparent)',
        opacity: 0.4,
      }} />
    </section>
  );
}
