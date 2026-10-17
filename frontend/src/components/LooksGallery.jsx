import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PillButton } from './ui/PillButton';
import { SkeletonLoader } from './ui/SkeletonLoader';
import useLooks from '../hooks/useLooks';

// Gradient backgrounds for dress cards (placeholder art)
const CARD_GRADIENTS = [
  'linear-gradient(145deg, #2a1a1e 0%, #4a2d35 50%, #3d2028 100%)',
  'linear-gradient(145deg, #1a1a28 0%, #2d2d4a 50%, #20203d 100%)',
  'linear-gradient(145deg, #1e2a20 0%, #2d4a30 50%, #203d25 100%)',
  'linear-gradient(145deg, #2a2018 0%, #4a3828 50%, #3d2e1e 100%)',
  'linear-gradient(145deg, #1a2028 0%, #2d3a4a 50%, #20283d 100%)',
  'linear-gradient(145deg, #28181e 0%, #4a2535 50%, #3d1e2a 100%)',
];

const ACCENT_COLORS = [
  '#E8C4C4', '#C4C4E8', '#C4E8C9', '#E8DCC4', '#C4D8E8', '#E8C4DA',
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] } },
};

export function LooksGallery({ compact = false }) {
  const { looks, filter, setFilter, filters, loading } = useLooks();
  const [hoveredId, setHoveredId] = useState(null);

  const displayLooks = compact ? looks.slice(0, 6) : looks;

  return (
    <section style={{
      padding: compact ? '80px 24px' : '120px 24px 80px',
      position: 'relative',
    }}>
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        style={{ textAlign: 'center', marginBottom: 48 }}
      >
        <p style={{
          fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#B76E79', marginBottom: 12, fontWeight: 500,
        }}>
          ✦ Curated Collection
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 300, color: '#FAF6F1',
          marginBottom: 16,
        }}>
          Bridal Looks
        </h2>
        <p style={{
          fontSize: 16, color: 'rgba(250,246,241,0.5)',
          maxWidth: 480, margin: '0 auto',
        }}>
          From timeless classics to bold fusion — discover your perfect style.
        </p>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          display: 'flex', gap: 10, justifyContent: 'center',
          flexWrap: 'wrap', marginBottom: 48,
        }}
      >
        {filters.map(f => (
          <PillButton key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </PillButton>
        ))}
      </motion.div>

      {/* Masonry Grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {loading ? (
          <div style={{
            columns: '3 280px', columnGap: 16,
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                breakInside: 'avoid', marginBottom: 16,
                height: i % 3 === 0 ? 380 : i % 3 === 1 ? 280 : 320,
              }}>
                <SkeletonLoader height="100%" radius={18} />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              style={{
                columns: '3 280px',
                columnGap: 16,
              }}
              className="looks-masonry"
            >
              {displayLooks.map((look, i) => (
                <motion.div
                  key={look.id}
                  variants={cardVariants}
                  style={{ breakInside: 'avoid', marginBottom: 16 }}
                  onMouseEnter={() => setHoveredId(look.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <LookCard
                    look={look}
                    hovered={hoveredId === look.id}
                    gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
                    accent={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                    tall={i % 5 === 0 || i % 5 === 3}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* View all CTA */}
      {compact && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginTop: 48 }}
        >
          <Link to="/looks">
            <motion.button
              whileHover={{ scale: 1.03, borderColor: 'rgba(183,110,121,0.5)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '13px 36px',
                borderRadius: 50,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(250,246,241,0.75)',
                fontSize: 14, fontWeight: 400,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.3s',
              }}
            >
              View Full Collection →
            </motion.button>
          </Link>
        </motion.div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .looks-masonry { columns: 2 220px !important; }
        }
        @media (max-width: 560px) {
          .looks-masonry { columns: 1 !important; }
        }
      `}</style>
    </section>
  );
}

/* ── Individual Look Card ──────────────────────────── */
function LookCard({ look, hovered, gradient, accent, tall }) {
  const height = tall ? 400 : 300;

  return (
    <div style={{
      position: 'relative',
      height,
      borderRadius: 20,
      overflow: 'hidden',
      background: gradient,
      border: hovered
        ? '1px solid rgba(183,110,121,0.5)'
        : '1px solid rgba(255,255,255,0.07)',
      cursor: 'pointer',
      transition: 'border-color 0.3s',
    }}>
      {/* Dress silhouette art */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <DressSilhouette style={look.style} accent={accent} tall={tall} />
      </div>

      {/* Hover glow */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 80%, rgba(183,110,121,0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* AI badge */}
      {look.aiSuggested && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          padding: '4px 10px', borderRadius: 9999,
          background: 'rgba(183,110,121,0.2)',
          border: '1px solid rgba(183,110,121,0.4)',
          fontSize: 10, color: '#D4A0A7',
          backdropFilter: 'blur(12px)',
          letterSpacing: '0.06em',
        }}>
          ✦ AI Pick
        </div>
      )}

      {/* Bottom info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '40px 18px 18px',
        background: 'linear-gradient(to top, rgba(13,13,15,0.92) 0%, transparent 100%)',
      }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 9999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 10, color: 'rgba(250,246,241,0.55)',
            letterSpacing: '0.06em',
            display: 'inline-block',
          }}>
            {look.tag}
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18, fontWeight: 400,
          color: '#FAF6F1', marginBottom: 4,
        }}>
          {look.name}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(250,246,241,0.45)' }}>
          {look.style}
        </p>
      </div>

      {/* Try This — slides up on hover */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={hovered ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Link to="/try-on" style={{ width: '100%' }}>
          <button style={{
            width: '100%',
            padding: '11px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #B76E79, #D4A0A7)',
            color: '#FAF6F1',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}>
            ✦ Try This Look
          </button>
        </Link>
      </motion.div>
    </div>
  );
}

/* ── Dress Silhouette SVG ──────────────────────────── */
function DressSilhouette({ style: dressStyle, accent, tall }) {
  const isBallGown = dressStyle === 'Ball Gown';
  const isLehenga  = dressStyle === 'Lehenga' || dressStyle === 'Saree';
  const h = tall ? 200 : 160;

  return (
    <svg width="120" height={h} viewBox={`0 0 120 ${h}`} fill="none" opacity="0.6">
      {/* Head */}
      <ellipse cx="60" cy="18" rx="13" ry="13" fill={`${accent}25`} stroke={`${accent}50`} strokeWidth="1"/>
      {/* Body */}
      {isBallGown ? (
        <>
          <path d={`M44 38 C44 30 76 30 76 38 L90 ${h-10} Q60 ${h+10} 30 ${h-10} Z`}
            fill={`${accent}18`} stroke={`${accent}45`} strokeWidth="1.2"/>
          <path d={`M52 38 L48 ${h-10} M68 38 L72 ${h-10}`}
            stroke={`${accent}30`} strokeWidth="0.8"/>
        </>
      ) : isLehenga ? (
        <>
          <path d={`M48 32 L36 70 L84 70 L72 32 Z`} fill={`${accent}22`} stroke={`${accent}45`} strokeWidth="1"/>
          <path d={`M36 70 L24 ${h-10} L96 ${h-10} L84 70 Z`} fill={`${accent}18`} stroke={`${accent}40`} strokeWidth="1.2"/>
          <path d={`M52 32 L76 32 M48 50 L72 50`} stroke={`${accent}30`} strokeWidth="0.8"/>
        </>
      ) : (
        <>
          <path d={`M48 34 C48 28 72 28 72 34 L78 ${h-10} H42 Z`}
            fill={`${accent}18`} stroke={`${accent}45`} strokeWidth="1.2"/>
          <path d={`M50 34 L46 ${h-10} M70 34 L74 ${h-10}`}
            stroke={`${accent}25`} strokeWidth="0.7"/>
        </>
      )}
      {/* Arms */}
      <path d={`M44 38 L32 65 M76 38 L88 65`} stroke={`${accent}35`} strokeWidth="1" strokeLinecap="round"/>
      {/* Sparkles */}
      <text x="18" y="55" fontSize="10" fill={`${accent}60`}>✦</text>
      <text x="92" y="80" fontSize="7"  fill={`${accent}50`}>✦</text>
    </svg>
  );
}

export default LooksGallery;
