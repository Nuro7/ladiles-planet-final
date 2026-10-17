import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';
import { PillButton } from './ui/PillButton';
import { SkeletonLoader } from './ui/SkeletonLoader';
import { Toast } from './ui/Toast';
import useTryOn from '../hooks/useTryOn';
import useLooks from '../hooks/useLooks';

const STYLE_FILTERS = ['All', 'Modern', 'Classic', 'Indo-Fusion', 'Minimalist'];

// Dress colour palette swatches per look
const DRESS_COLORS = ['#F5EDE3', '#E8C4C4', '#D4B8C7', '#C8D5E0', '#E8DFD0', '#F0E4D0'];

export function TryOnPanel() {
  const fileInputRef = useRef(null);
  const [overlayOpacity, setOverlayOpacity] = useState(80);
  const [showCamera, setShowCamera] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const {
    photoUrl, sessionId, activeLook, result,
    loading, error, uploadPhoto, applyLook, resetSession, clearError,
  } = useTryOn();

  const { looks, aiSuggested, filter, setFilter, loading: looksLoading } = useLooks();

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto(file);
    e.target.value = '';
  }, [uploadPhoto]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) uploadPhoto(file);
  }, [uploadPhoto]);

  const displayImage = result?.resultImageUrl || photoUrl;

  return (
    <section style={{
      minHeight: '100vh',
      padding: '120px 24px 80px',
      position: 'relative',
    }}>
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        style={{ textAlign: 'center', marginBottom: 56 }}
      >
        <p style={{
          fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#B76E79', marginBottom: 12, fontWeight: 500,
        }}>
          ✦ Virtual Mirror
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 300,
          color: '#FAF6F1',
        }}>
          Try Before You Vow
        </h2>
      </motion.div>

      {/* Main two-col layout */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
          gap: 20,
        }}
        className="tryon-grid"
      >
        {/* ══ LEFT: Mirror Area ══════════════════════════════ */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            aspectRatio: '3/4',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(24px)',
            cursor: displayImage ? 'default' : 'pointer',
            minHeight: 480,
          }}
          onClick={() => !displayImage && fileInputRef.current?.click()}
        >
          {/* Corner accents */}
          <div className="corner-accent corner-tl" />
          <div className="corner-accent corner-tr" />
          <div className="corner-accent corner-bl" />
          <div className="corner-accent corner-br" />

          {/* AI Active badge */}
          <div style={{
            position: 'absolute', top: 20, left: 20, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 14px',
            borderRadius: 9999,
            background: 'rgba(13,13,15,0.75)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)',
          }}>
            <span className="ai-dot" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#34d399', display: 'inline-block',
            }} />
            <span style={{
              fontSize: 11, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(250,246,241,0.85)',
            }}>
              AI Active
            </span>
          </div>

          {/* Content: empty state / loading / image */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 20,
                }}
              >
                <SkeletonLoader width="100%" height="100%" radius={0} />
                <div style={{
                  position: 'absolute',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                }}>
                  <AISpinner />
                  <p style={{ color: '#D4A0A7', fontSize: 14, letterSpacing: '0.08em' }}>
                    AI is processing your look…
                  </p>
                </div>
              </motion.div>
            ) : displayImage ? (
              <motion.div
                key="image"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <img
                  src={displayImage}
                  alt="Try-on preview"
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    opacity: overlayOpacity / 100,
                  }}
                />
                {/* Confidence badge */}
                {result?.confidence && (
                  <div style={{
                    position: 'absolute', top: 20, right: 20,
                    padding: '5px 12px', borderRadius: 9999,
                    background: 'rgba(52,211,153,0.15)',
                    border: '1px solid rgba(52,211,153,0.35)',
                    fontSize: 12, color: '#34d399',
                    backdropFilter: 'blur(12px)',
                  }}>
                    {Math.round(result.confidence * 100)}% Match
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 20,
                  padding: 40,
                }}
              >
                {/* Silhouette illustration */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <svg width="80" height="120" viewBox="0 0 80 120" fill="none">
                    <ellipse cx="40" cy="22" rx="16" ry="16" fill="rgba(183,110,121,0.15)" stroke="rgba(183,110,121,0.35)" strokeWidth="1.5"/>
                    <path d="M24 50 C24 38 56 38 56 50 L62 110 H18 L24 50Z" fill="rgba(183,110,121,0.1)" stroke="rgba(183,110,121,0.3)" strokeWidth="1.5"/>
                    <path d="M24 52 L12 78 M56 52 L68 78" stroke="rgba(183,110,121,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div style={{
                    position: 'absolute', inset: -4,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(183,110,121,0.1) 0%, transparent 70%)',
                  }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20, fontWeight: 300,
                    color: 'rgba(250,246,241,0.6)', marginBottom: 8,
                  }}>
                    Your Bridal Canvas
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(250,246,241,0.35)' }}>
                    Drop a photo here or click to upload
                  </p>
                </div>
                <div style={{
                  padding: '9px 22px', borderRadius: 9999,
                  border: '1px dashed rgba(183,110,121,0.4)',
                  fontSize: 13, color: '#D4A0A7',
                  background: 'rgba(183,110,121,0.06)',
                }}>
                  ↑ Upload Photo
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom control bar */}
          {displayImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 24px',
                background: 'linear-gradient(to top, rgba(13,13,15,0.9) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Opacity Slider */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'rgba(250,246,241,0.5)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                  OVERLAY
                </span>
                <input
                  type="range"
                  min={20} max={100}
                  value={overlayOpacity}
                  onChange={e => setOverlayOpacity(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: 3,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: `linear-gradient(to right, #B76E79 ${overlayOpacity}%, rgba(255,255,255,0.15) ${overlayOpacity}%)`,
                    borderRadius: 2,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: 12, color: '#D4A0A7', minWidth: 32, textAlign: 'right' }}>
                  {overlayOpacity}%
                </span>
              </div>

              {/* Reset button */}
              <button
                onClick={resetSession}
                style={{
                  padding: '7px 16px', borderRadius: 9999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(250,246,241,0.6)',
                  fontSize: 12, cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.25s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(183,110,121,0.5)';
                  e.currentTarget.style.color = '#FAF6F1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.color = 'rgba(250,246,241,0.6)';
                }}
              >
                ✕ Remove
              </button>
            </motion.div>
          )}
        </div>

        {/* ══ RIGHT: Controls Panel ═══════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload / Camera buttons */}
          <GlassCard padding="20px 22px" hover={false}>
            <p style={{
              fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(250,246,241,0.4)', marginBottom: 14,
            }}>
              Your Photo
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <motion.button
                whileHover={{ scale: 1.02, borderColor: 'rgba(183,110,121,0.5)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 12,
                  border: '1px solid rgba(183,110,121,0.3)',
                  background: 'rgba(183,110,121,0.08)',
                  color: '#D4A0A7',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                ↑ Upload Photo
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCamera(c => !c)}
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(250,246,241,0.6)',
                  fontSize: 13, fontWeight: 400,
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                ◎ Use Camera
              </motion.button>
            </div>
            {sessionId && (
              <p style={{ marginTop: 10, fontSize: 11, color: 'rgba(52,211,153,0.7)', letterSpacing: '0.06em' }}>
                ✓ Session active — pick a look to try
              </p>
            )}
          </GlassCard>

          {/* Style Filters */}
          <GlassCard padding="18px 22px" hover={false}>
            <p style={{
              fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(250,246,241,0.4)', marginBottom: 12,
            }}>
              Style Filters
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STYLE_FILTERS.map(f => (
                <PillButton key={f} active={filter === f} onClick={() => setFilter(f)}>
                  {f}
                </PillButton>
              ))}
            </div>
          </GlassCard>

          {/* Choose Your Look */}
          <GlassCard padding="18px 22px" hover={false} style={{ flex: 1 }}>
            <p style={{
              fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(250,246,241,0.4)', marginBottom: 14,
            }}>
              Choose Your Look
            </p>

            {looksLoading ? (
              <SkeletonLoader height="72px" count={3} gap={10} />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                maxHeight: 340, overflowY: 'auto',
                paddingRight: 4,
              }}
                className="no-scrollbar"
              >
                {looks.map((look, i) => (
                  <LookListItem
                    key={look.id}
                    look={look}
                    active={activeLook === look.id}
                    index={i}
                    onSelect={() => applyLook(look.id)}
                    color={DRESS_COLORS[i % DRESS_COLORS.length]}
                  />
                ))}
              </div>
            )}
          </GlassCard>

          {/* AI Suggestions */}
          {aiSuggested.length > 0 && (
            <GlassCard padding="18px 22px" hover={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <p style={{
                  fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'rgba(250,246,241,0.4)',
                }}>
                  AI Suggestions
                </p>
                <span style={{
                  padding: '2px 8px', borderRadius: 9999,
                  background: 'rgba(183,110,121,0.2)',
                  border: '1px solid rgba(183,110,121,0.35)',
                  fontSize: 10, color: '#D4A0A7',
                  letterSpacing: '0.08em',
                }}>
                  ✦ AI
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aiSuggested.slice(0, 2).map((look, i) => (
                  <LookListItem
                    key={look.id}
                    look={look}
                    active={activeLook === look.id}
                    index={i}
                    onSelect={() => applyLook(look.id)}
                    color={DRESS_COLORS[i]}
                    aiHighlight
                  />
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </motion.div>

      {/* Toast */}
      <Toast message={error} type="error" onClose={clearError} />

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .tryon-grid {
            grid-template-columns: 1fr !important;
          }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #B76E79;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(183,110,121,0.5);
        }
        input[type=range]::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #B76E79;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </section>
  );
}

/* ── Look List Item ────────────────────────────────── */
function LookListItem({ look, active, index, onSelect, color, aiHighlight }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      onClick={onSelect}
      whileHover={{ x: 3, borderColor: 'rgba(183,110,121,0.5)' }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 14,
        border: active
          ? '1px solid rgba(183,110,121,0.6)'
          : '1px solid rgba(255,255,255,0.07)',
        background: active
          ? 'rgba(183,110,121,0.12)'
          : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.25s',
      }}
    >
      {/* Color swatch */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `radial-gradient(circle at 35% 35%, white, ${color})`,
        border: active ? '2px solid rgba(183,110,121,0.6)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: active ? `0 0 12px ${color}60` : 'none',
      }} />

      {/* Info */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: active ? '#FAF6F1' : 'rgba(250,246,241,0.8)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {look.name}
          {aiHighlight && (
            <span style={{ color: '#B76E79', fontSize: 11 }}>✦</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(250,246,241,0.4)', marginTop: 2 }}>
          {look.style}
        </div>
      </div>

      {/* Tag */}
      <span style={{
        padding: '3px 10px', borderRadius: 9999,
        fontSize: 10, fontWeight: 500, letterSpacing: '0.06em',
        color: '#B76E79',
        background: 'rgba(183,110,121,0.12)',
        border: '1px solid rgba(183,110,121,0.2)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {look.tag}
      </span>
    </motion.button>
  );
}

/* ── AI Spinner ────────────────────────────────────── */
function AISpinner() {
  return (
    <div style={{ position: 'relative', width: 52, height: 52 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#B76E79',
          borderRightColor: 'rgba(183,110,121,0.3)',
        }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: 8,
          borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: '#D4A0A7',
          borderLeftColor: 'rgba(212,160,167,0.3)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>
        ✦
      </div>
    </div>
  );
}

export default TryOnPanel;
