import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tryOnDress, fetchDresses, saveLook } from '../api/bridalApi';

const EASE = [0.16, 1, 0.3, 1];

const FILTERS = ['All', 'Modern', 'Classic', 'Royal', 'Bohemian'];

// Mock dresses for fallback
const MOCK_DRESSES = [
  { id: 1, name: 'Meera Lehenga',      style: 'Royal',    category: 'Lehenga' },
  { id: 2, name: 'Sahara Sharara',     style: 'Modern',   category: 'Sharara' },
  { id: 3, name: 'Noor Anarkali',      style: 'Classic',  category: 'Anarkali' },
  { id: 4, name: 'Aria Saree',         style: 'Bohemian', category: 'Saree' },
  { id: 5, name: 'Zara Gharara',       style: 'Modern',   category: 'Gharara' },
  { id: 6, name: 'Leila Organza',      style: 'Royal',    category: 'Lehenga' },
  { id: 7, name: 'Priya Dupatta Set',  style: 'Classic',  category: 'Lehenga' },
  { id: 8, name: 'Rania Bridal Set',   style: 'Bohemian', category: 'Lehenga' },
];

const GRADIENTS = [
  'linear-gradient(160deg, #2A1518 0%, #0E0807 100%)',
  'linear-gradient(160deg, #1A1A2E 0%, #0A0706 100%)',
  'linear-gradient(160deg, #1A1508 0%, #0E0807 100%)',
  'linear-gradient(160deg, #0D1A18 0%, #0A0706 100%)',
  'linear-gradient(160deg, #22100D 0%, #0A0706 100%)',
  'linear-gradient(160deg, #18152A 0%, #0E0807 100%)',
  'linear-gradient(160deg, #1A0E15 0%, #0A0706 100%)',
  'linear-gradient(160deg, #0E1A10 0%, #0A0706 100%)',
];

// ── Error message component ─────────────────────────────────
function ErrorMsg({ message, onDismiss }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        padding: '12px 16px',
        border: '1px solid var(--rose)',
        borderRadius: 'var(--r)',
        background: 'rgba(201,131,106,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 300, color: 'var(--rose-light)', margin: 0 }}>
        {message}
      </p>
      {onDismiss && (
        <button onClick={onDismiss} style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
      )}
    </motion.div>
  );
}

// ── Dress card in studio grid ──────────────────────────────
function StudioDressCard({ dress, active, onSelect, gradient }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.35, ease: EASE }}
      onClick={() => onSelect(dress)}
      style={{
        cursor: 'pointer',
        border: '1px solid',
        borderColor: active ? 'var(--rose)' : 'var(--glass-border)',
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        transition: 'border-color 250ms ease, box-shadow 250ms ease',
        background: gradient,
        boxShadow: active ? '0 0 20px rgba(201,131,106,0.18)' : 'none',
      }}
    >
      {/* Dress image placeholder */}
      <div style={{ aspectRatio: '2/3', position: 'relative', background: gradient }}>
        {active && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--rose)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'var(--bg-deep)', fontSize: 11, lineHeight: 1 }}>✓</span>
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="36" height="54" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.15 }}>
            <ellipse cx="40" cy="18" rx="12" ry="12" stroke="#C9836A" strokeWidth="1.5"/>
            <path d="M28 30c0 0-8 4-10 16s-4 40-4 52h52c0-12-2-40-4-52S52 30 52 30" stroke="#C9836A" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,7,6,0.7) 0%, transparent 60%)' }} />
      </div>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 400, color: 'var(--white)', lineHeight: 1.2, marginBottom: 4 }}>
          {dress.name}
        </p>
        <p className="label-tag" style={{ fontSize: 9 }}>{dress.style}</p>
      </div>
    </motion.div>
  );
}

// ── Loading overlay for mirror panel ──────────────────────
function LoadingOverlay({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'var(--glass)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 20,
          }}
        >
          <div className="spin-ring" style={{ width: 52, height: 52 }} />
          <p style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 18, color: 'var(--white)',
          }}>
            AI is styling you...
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0,1,2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rose)' }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main component ─────────────────────────────────────────
export default function VirtualTryOnStudio() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('dress');

  const [dresses,        setDresses]        = useState(MOCK_DRESSES);
  const [activeFilter,   setActiveFilter]   = useState('All');
  const [selectedDress,  setSelectedDress]  = useState(null);
  const [userImage,      setUserImage]      = useState(null); // base64
  const [resultImage,    setResultImage]    = useState(null); // URL
  const [loading,        setLoading]        = useState(false);
  const [dressesLoading, setDressesLoading] = useState(false);
  const [error,          setError]          = useState(null);
  const [saveMsg,        setSaveMsg]        = useState(null);
  const [search,         setSearch]         = useState('');

  const fileRef = useRef(null);

  // Load dresses on mount
  useEffect(() => {
    async function load() {
      setDressesLoading(true);
      const { data, error: err } = await fetchDresses();
      if (data?.dresses?.length) setDresses(data.dresses);
      // silent fail — fallback to MOCK_DRESSES
      setDressesLoading(false);
    }
    load();
  }, []);

  // Preselect dress from URL param
  useEffect(() => {
    if (preselectedId) {
      const found = dresses.find(d => String(d.id) === String(preselectedId));
      if (found) setSelectedDress(found);
    }
  }, [preselectedId, dresses]);

  const filteredDresses = dresses.filter(d => {
    const matchFilter = activeFilter === 'All' || d.style === activeFilter;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // ── File upload → base64 ──────────────────────────────────
  const handleFileUpload = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUserImage(reader.result);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // ── Try-On ────────────────────────────────────────────────
  const handleTryOn = async (dress) => {
    setSelectedDress(dress);
    if (!userImage) {
      setError('Please upload your photo first.');
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: err } = await tryOnDress({
      userImageBase64: userImage,
      dressId: dress.id,
    });
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setResultImage(data?.resultImageUrl || null);
    }
  };

  // ── Save to lookbook ──────────────────────────────────────
  const handleSave = async () => {
    if (!resultImage || !selectedDress) return;
    setSaveMsg(null);
    const { data, error: err } = await saveLook({
      userId: 'guest',
      resultImageUrl: resultImage,
      dressId: selectedDress.id,
    });
    if (err) {
      setError(err);
    } else {
      setSaveMsg('Saved to your lookbook!');
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{ background: 'var(--bg-deep)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <Navbar />

      {/* Studio container */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 55fr) minmax(0, 45fr)',
        minHeight: 'calc(100vh - 72px)',
        marginTop: 72,
      }}
      className="studio-grid"
      >
        {/* ══════════════════════════════════════════════
            LEFT PANEL — "The Mirror"
        ══════════════════════════════════════════════ */}
        <div style={{
          background: 'var(--glass)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRight: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 'clamp(24px, 3vw, 48px)',
          overflow: 'hidden',
          minHeight: '70vh',
        }}>
          {/* Ambient blob */}
          <div className="ambient-blob ambient-blob-1" style={{ position: 'absolute', top: '-100px', left: '-100px', opacity: 0.08 }} />

          {/* AI Active badge */}
          <div style={{
            position: 'absolute', top: 20, left: 20, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(10,7,6,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: '100px',
            border: '1px solid rgba(34,197,94,0.3)',
          }}>
            <span className="pulse-dot" />
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22C55E',
            }}>
              AI Active
            </span>
          </div>

          {/* Brand badge */}
          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 500,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)',
            }}>
              AI Bridal Wall
            </span>
          </div>

          {/* Mirror display */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            style={{
              width: '100%',
              maxWidth: 380,
              aspectRatio: '3/4',
              position: 'relative',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
              border: '1px solid var(--glass-border)',
              background: 'linear-gradient(160deg, #1A0D09 0%, #0E0807 100%)',
            }}
          >
            <LoadingOverlay visible={loading} />

            {resultImage ? (
              <motion.img
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                src={resultImage}
                alt="Your AI try-on result"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : userImage ? (
              <motion.img
                key="user"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.5 }}
                src={userImage}
                alt="Your uploaded photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              /* Default empty state */
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
              }}>
                <svg width="64" height="96" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.18 }}>
                  <ellipse cx="40" cy="18" rx="12" ry="12" stroke="#C9836A" strokeWidth="1.5"/>
                  <path d="M28 30c0 0-8 4-10 16s-4 40-4 52h52c0-12-2-40-4-52S52 30 52 30" stroke="#C9836A" strokeWidth="1.5" fill="none"/>
                </svg>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontStyle: 'italic', fontWeight: 300,
                  color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6,
                }}>
                  Upload your photo to begin
                </p>
              </div>
            )}

            {/* Pulsing rose ring */}
            {!resultImage && !loading && (
              <motion.div
                animate={{ scale: [1, 1.03, 1], opacity: [0.12, 0.2, 0.12] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', inset: 16,
                  borderRadius: 'var(--r-lg)',
                  border: '1px solid var(--rose)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>

          {/* Error message */}
          <div style={{ width: '100%', maxWidth: 380, marginTop: 12 }}>
            <AnimatePresence>
              <ErrorMsg message={error} onDismiss={() => setError(null)} />
            </AnimatePresence>
          </div>

          {/* Save / Share row */}
          <AnimatePresence>
            {resultImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: EASE }}
                style={{
                  display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={handleSave}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '100px',
                    background: 'var(--rose)',
                    color: 'var(--bg-deep)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    border: 'none', cursor: 'pointer',
                    transition: 'background 200ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-light)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--rose)'; }}
                >
                  Save to Lookbook
                </button>
                <button
                  onClick={() => { if (navigator.share) navigator.share({ title: 'My AI Bridal Look', url: window.location.href }); }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '100px',
                    background: 'transparent',
                    color: 'var(--white)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    border: '1px solid rgba(245,240,235,0.3)',
                    cursor: 'pointer',
                    transition: 'border-color 200ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--white)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,240,235,0.3)'; }}
                >
                  Share Look
                </button>
                {saveMsg && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#22C55E', alignSelf: 'center' }}
                  >
                    {saveMsg}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom action bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--glass)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--glass-border)',
            padding: '14px 20px',
            display: 'flex', justifyContent: 'space-around', gap: 8,
            zIndex: 10,
          }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
            {[
              { icon: '↑', label: 'Upload Photo', action: () => fileRef.current?.click() },
              { icon: '◉', label: 'Webcam',       action: () => setError('Webcam coming soon!') },
              { icon: '◇', label: 'Silhouette',   action: () => { setUserImage(null); setResultImage(null); } },
            ].map(({ icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 12px', borderRadius: 'var(--r)',
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,131,106,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ fontSize: 16, color: 'var(--rose)', lineHeight: 1 }}>{icon}</span>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 500,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
                }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            RIGHT PANEL — "The Studio"
        ══════════════════════════════════════════════ */}
        <div style={{
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '20px 20px 0' }}>
            <input
              type="text"
              placeholder="Search styles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--r)',
                color: 'var(--white)',
                fontFamily: 'var(--font-body)',
                fontSize: 14, fontWeight: 300,
                outline: 'none',
                transition: 'border-color 200ms ease',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--rose)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            padding: '12px 20px 16px',
          }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  background: f === activeFilter ? 'var(--rose)' : 'transparent',
                  color: f === activeFilter ? 'var(--bg-deep)' : 'var(--muted)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  border: `1px solid ${f === activeFilter ? 'var(--rose)' : 'var(--glass-border)'}`,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Dress grid — scrollable */}
          <div
            className="hide-scrollbar"
            style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}
          >
            {dressesLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 'var(--r)' }} />
                ))}
              </div>
            ) : filteredDresses.length === 0 ? (
              <div style={{
                padding: '48px 20px', textAlign: 'center',
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: 18, color: 'var(--muted)',
              }}>
                No styles found
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {filteredDresses.map((dress, i) => (
                  <StudioDressCard
                    key={dress.id}
                    dress={dress}
                    active={selectedDress?.id === dress.id}
                    onSelect={(d) => handleTryOn(d)}
                    gradient={GRADIENTS[i % GRADIENTS.length]}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: stack layout handled by responsive CSS below */}
      <style>{`
        @media (max-width: 768px) {
          .studio-grid {
            grid-template-columns: 1fr !important;
            min-height: unset !important;
          }
        }
      `}</style>

      <Footer />
    </motion.div>
  );
}
