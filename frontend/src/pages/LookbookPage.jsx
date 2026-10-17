import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchLookbook, removeLook } from '../api/bridalApi';

const EASE = [0.16, 1, 0.3, 1];

const MOCK_LOOKS = [
  { id: 'l1', dressName: 'Meera Lehenga',       savedAt: '2024-10-12', resultImageUrl: null },
  { id: 'l2', dressName: 'Noor Anarkali',        savedAt: '2024-10-14', resultImageUrl: null },
  { id: 'l3', dressName: 'Aria Saree',           savedAt: '2024-10-15', resultImageUrl: null },
];

const GRADIENTS = [
  'linear-gradient(160deg, #2A1518 0%, #0E0807 100%)',
  'linear-gradient(160deg, #18152A 0%, #0E0807 100%)',
  'linear-gradient(160deg, #1A1508 0%, #0E0807 100%)',
  'linear-gradient(160deg, #0D1A18 0%, #0A0706 100%)',
];

function formatDate(str) {
  try {
    return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return str; }
}

function LookCard({ look, onRemove, index, gradient }) {
  const [removing, setRemoving] = useState(false);
  const [hovered,  setHovered]  = useState(false);

  const handleRemove = async (e) => {
    e.stopPropagation();
    setRemoving(true);
    await onRemove(look.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.07, 0.4) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: hovered ? 'var(--rose)' : 'var(--glass-border)',
        background: gradient,
        transition: 'border-color 300ms ease, transform 300ms ease, box-shadow 300ms ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered ? '0 16px 40px rgba(201,131,106,0.12)' : 'none',
        opacity: removing ? 0.5 : 1,
        cursor: 'default',
      }}
    >
      {/* Image area */}
      <div style={{ aspectRatio: '2/3', position: 'relative' }}>
        {look.resultImageUrl ? (
          <img
            src={look.resultImageUrl}
            alt={look.dressName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="48" height="72" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.16 }}>
              <ellipse cx="40" cy="18" rx="12" ry="12" stroke="#C9836A" strokeWidth="1.5"/>
              <path d="M28 30c0 0-8 4-10 16s-4 40-4 52h52c0-12-2-40-4-52S52 30 52 30" stroke="#C9836A" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,7,6,0.85) 0%, transparent 55%)' }} />

        {/* Action buttons on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', top: 12, right: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (navigator.share) navigator.share({ title: look.dressName, url: window.location.href });
                }}
                title="Share"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(10,7,6,0.7)', backdropFilter: 'blur(8px)',
                  border: '1px solid var(--glass-border)', color: 'var(--white)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 13, transition: 'border-color 200ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rose)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
              >
                ↗
              </button>
              <button
                onClick={handleRemove}
                title="Remove"
                disabled={removing}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(10,7,6,0.7)', backdropFilter: 'blur(8px)',
                  border: '1px solid var(--glass-border)', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: removing ? 'not-allowed' : 'pointer',
                  fontSize: 12, transition: 'border-color 200ms ease, color 200ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--muted)'; }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px' }}>
        <h4 style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400,
          color: 'var(--white)', lineHeight: 1.2, marginBottom: 5,
        }}>
          {look.dressName}
        </h4>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 300,
          color: 'var(--muted)', letterSpacing: '0.06em',
        }}>
          Saved {formatDate(look.savedAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        padding: 'clamp(60px, 10vw, 120px) 20px',
      }}
    >
      {/* Ornament SVG */}
      <div style={{ marginBottom: 28 }}>
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="28" stroke="var(--glass-border)" strokeWidth="1"/>
          <path d="M30 10L35 25H50L38 34L43 49L30 40L17 49L22 34L10 25H25L30 10Z"
            stroke="var(--rose)" strokeWidth="1" fill="none" opacity="0.4"/>
          <circle cx="30" cy="30" r="4" stroke="var(--rose)" strokeWidth="1" fill="none"/>
        </svg>
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontStyle: 'italic',
        fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400,
        color: 'var(--white)', marginBottom: 16,
      }}>
        Your lookbook is empty
      </h2>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 300,
        color: 'var(--muted)', lineHeight: 1.8, maxWidth: 400, marginBottom: 36,
      }}>
        Try on your favourite bridal looks and save them here to build your perfect wedding vision.
      </p>
      <Link to="/try-on" style={{
        display: 'inline-flex',
        padding: '14px 36px', borderRadius: '100px',
        background: 'var(--rose)', color: 'var(--bg-deep)',
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
        letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
        transition: 'background 200ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-light)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--rose)'; }}
      >
        Start Try-On
      </Link>
    </motion.div>
  );
}

export default function LookbookPage() {
  const [looks,   setLooks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: err } = await fetchLookbook('guest');
      if (err) {
        // Fallback to mock data for demo
        setLooks(MOCK_LOOKS);
      } else {
        setLooks(data?.looks?.length ? data.looks : MOCK_LOOKS);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleRemove = async (lookId) => {
    const { error: err } = await removeLook('guest', lookId);
    if (!err) {
      setLooks(prev => prev.filter(l => l.id !== lookId));
    } else {
      setError('Could not remove look. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{ background: 'var(--bg-deep)', minHeight: '100vh' }}
    >
      <Navbar />

      {/* ── Page header ── */}
      <div style={{
        paddingTop: 'calc(72px + clamp(48px, 6vw, 80px))',
        paddingBottom: 'clamp(32px, 4vw, 56px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="ambient-blob ambient-blob-2" style={{ position: 'absolute', top: 0, right: 0, opacity: 0.06 }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
            className="label-tag" style={{ marginBottom: 14 }}
          >
            Your Curation
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.4 }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 6vw, 80px)',
              fontWeight: 400, fontStyle: 'italic',
              color: 'var(--white)', lineHeight: 1.05,
            }}
          >
            Your Lookbook
          </motion.h1>

          {!loading && looks.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 300, color: 'var(--muted)', marginTop: 12 }}
            >
              {looks.length} saved {looks.length === 1 ? 'look' : 'looks'}
            </motion.p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="container" style={{ marginBottom: 20 }}>
          <div style={{
            padding: '12px 16px', border: '1px solid var(--rose)',
            borderRadius: 'var(--r)', background: 'rgba(201,131,106,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--rose-light)', margin: 0 }}>{error}</p>
            <button onClick={() => setError(null)} style={{ color: 'var(--muted)', fontSize: 16 }}>×</button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="container" style={{ paddingBottom: 'var(--section-pad)' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <div className="skeleton" style={{ aspectRatio: '2/3' }} />
                <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 18, width: '65%', borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : looks.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 24,
            }}>
              {looks.map((look, i) => (
                <LookCard
                  key={look.id}
                  look={look}
                  index={i}
                  onRemove={handleRemove}
                  gradient={GRADIENTS[i % GRADIENTS.length]}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Footer />
    </motion.div>
  );
}
