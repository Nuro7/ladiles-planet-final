import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

const DRESSES = [
  { id: 1, name: 'Meera Lehenga',      style: 'Royal',   gradient: 'linear-gradient(160deg, #2A1518 0%, #0E0807 100%)' },
  { id: 2, name: 'Sahara Sharara',     style: 'Modern',  gradient: 'linear-gradient(160deg, #1A1A2E 0%, #0A0706 100%)' },
  { id: 3, name: 'Noor Anarkali',      style: 'Classic', gradient: 'linear-gradient(160deg, #1A1508 0%, #0E0807 100%)' },
  { id: 4, name: 'Aria Saree',         style: 'Bohemian',gradient: 'linear-gradient(160deg, #0D1A18 0%, #0A0706 100%)' },
  { id: 5, name: 'Zara Gharara',       style: 'Modern',  gradient: 'linear-gradient(160deg, #22100D 0%, #0A0706 100%)' },
  { id: 6, name: 'Leila Organza',      style: 'Royal',   gradient: 'linear-gradient(160deg, #18152A 0%, #0E0807 100%)' },
  { id: 7, name: 'Priya Dupatta Set',  style: 'Classic', gradient: 'linear-gradient(160deg, #1A0E15 0%, #0A0706 100%)' },
  { id: 8, name: 'Rania Bridal Set',   style: 'Bohemian',gradient: 'linear-gradient(160deg, #0E1A10 0%, #0A0706 100%)' },
];

function DressCard({ dress, index }) {
  const navigate = useNavigate();
  const isHovered = useRef(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: index * 0.06 }}
      viewport={{ once: true, margin: '-40px' }}
      style={{
        flexShrink: 0,
        width: 'clamp(180px, 20vw, 240px)',
        cursor: 'pointer',
        scrollSnapAlign: 'start',
      }}
      onClick={() => navigate(`/try-on?dress=${dress.id}`)}
    >
      {/* Image area */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '2/3',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          background: dress.gradient,
          border: '1px solid var(--glass-border)',
          transition: 'border-color 300ms ease',
        }}
        onMouseEnter={e => {
          isHovered.current = true;
          e.currentTarget.style.borderColor = 'var(--rose)';
          const tryBtn = e.currentTarget.querySelector('.try-btn');
          if (tryBtn) tryBtn.style.opacity = '1';
          if (tryBtn) tryBtn.style.transform = 'translateY(0)';
        }}
        onMouseLeave={e => {
          isHovered.current = false;
          e.currentTarget.style.borderColor = 'var(--glass-border)';
          const tryBtn = e.currentTarget.querySelector('.try-btn');
          if (tryBtn) tryBtn.style.opacity = '0';
          if (tryBtn) tryBtn.style.transform = 'translateY(10px)';
        }}
      >
        {/* Dress silhouette */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="60" height="90" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.14 }}>
            <ellipse cx="40" cy="18" rx="12" ry="12" stroke="#C9836A" strokeWidth="1.5"/>
            <path d="M28 30c0 0-8 4-10 16s-4 40-4 52h52c0-12-2-40-4-52S52 30 52 30" stroke="#C9836A" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>

        {/* Subtle gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(10,7,6,0.8) 0%, transparent 50%)',
        }} />

        {/* Try On button — appears on hover */}
        <div
          className="try-btn"
          style={{
            position: 'absolute', bottom: 14, left: '50%',
            transform: 'translateX(-50%) translateY(10px)',
            opacity: 0,
            transition: 'opacity 250ms ease, transform 250ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            display: 'inline-flex',
            padding: '8px 18px',
            borderRadius: '100px',
            background: 'var(--rose)',
            color: 'var(--bg-deep)',
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Try On
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 4px 0' }}>
        <h4 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 400,
          color: 'var(--white)',
          marginBottom: 4,
          lineHeight: 1.2,
        }}>
          {dress.name}
        </h4>
        <p className="label-tag" style={{ fontSize: 10 }}>{dress.style}</p>
      </div>
    </motion.div>
  );
}

export default function CollectionStrip() {
  const stripRef = useRef(null);

  const scroll = (dir) => {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <section style={{
      background: 'var(--bg-deep)',
      padding: 'var(--section-pad) 0',
      overflow: 'hidden',
    }}>
      <div className="container" style={{ paddingBottom: 0 }}>
        {/* Header row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 'clamp(36px, 5vw, 56px)',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              viewport={{ once: true, margin: '-80px' }}
              className="label-tag"
              style={{ marginBottom: 12 }}
            >
              The Collection
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
              viewport={{ once: true, margin: '-80px' }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(32px, 4.5vw, 58px)',
                fontWeight: 400,
                color: 'var(--white)',
                lineHeight: 1.1,
              }}
            >
              Curated Bridal Styles
            </motion.h2>
          </div>

          {/* Arrow buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {[-1, 1].map(dir => (
              <button
                key={dir}
                onClick={() => scroll(dir)}
                style={{
                  width: 44, height: 44,
                  borderRadius: '50%',
                  background: 'var(--glass)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--white)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                  cursor: 'pointer',
                  transition: 'border-color 200ms ease, background 200ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.color = 'var(--rose)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--white)'; }}
              >
                {dir === -1 ? '←' : '→'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal scroll strip */}
      <div
        ref={stripRef}
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: 20,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingLeft: 'clamp(20px, 4vw, 60px)',
          paddingRight: 'clamp(20px, 4vw, 60px)',
          paddingBottom: 8,
        }}
      >
        {DRESSES.map((dress, i) => (
          <DressCard key={dress.id} dress={dress} index={i} />
        ))}
      </div>
    </section>
  );
}
