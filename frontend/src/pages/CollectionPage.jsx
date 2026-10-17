import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchDresses } from '../api/bridalApi';

const EASE = [0.16, 1, 0.3, 1];

const CATEGORIES = ['All', 'Lehenga', 'Sharara', 'Anarkali', 'Saree', 'Gharara'];
const STYLES     = ['All', 'Modern', 'Classic', 'Royal', 'Bohemian'];
const SORT_OPTS  = ['Newest', 'A–Z', 'Style'];

const MOCK_DRESSES = [
  { id: 1,  name: 'Meera Lehenga',        style: 'Royal',    category: 'Lehenga'  },
  { id: 2,  name: 'Sahara Sharara',        style: 'Modern',   category: 'Sharara'  },
  { id: 3,  name: 'Noor Anarkali',         style: 'Classic',  category: 'Anarkali' },
  { id: 4,  name: 'Aria Saree',            style: 'Bohemian', category: 'Saree'    },
  { id: 5,  name: 'Zara Gharara',          style: 'Modern',   category: 'Gharara'  },
  { id: 6,  name: 'Leila Organza',         style: 'Royal',    category: 'Lehenga'  },
  { id: 7,  name: 'Priya Dupatta Set',     style: 'Classic',  category: 'Lehenga'  },
  { id: 8,  name: 'Rania Bridal Set',      style: 'Bohemian', category: 'Lehenga'  },
  { id: 9,  name: 'Safiya Velvet',         style: 'Royal',    category: 'Lehenga'  },
  { id: 10, name: 'Luna Net Saree',        style: 'Modern',   category: 'Saree'    },
  { id: 11, name: 'Dua Embroidered Set',   style: 'Classic',  category: 'Sharara'  },
  { id: 12, name: 'Hira Silk Anarkali',    style: 'Bohemian', category: 'Anarkali' },
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

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div className="skeleton" style={{ aspectRatio: '2/3' }} />
      <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 18, width: '70%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function DressCard({ dress, index, gradient }) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.06, 0.4) }}
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/try-on?dress=${dress.id}`)}
    >
      <div
        style={{
          aspectRatio: '2/3',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          background: gradient,
          border: '1px solid var(--glass-border)',
          position: 'relative',
          transition: 'border-color 300ms ease, transform 300ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--rose)';
          e.currentTarget.style.transform = 'translateY(-6px)';
          const btn = e.currentTarget.querySelector('.try-btn');
          if (btn) { btn.style.opacity = '1'; btn.style.transform = 'translateX(-50%) translateY(0)'; }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--glass-border)';
          e.currentTarget.style.transform = 'translateY(0)';
          const btn = e.currentTarget.querySelector('.try-btn');
          if (btn) { btn.style.opacity = '0'; btn.style.transform = 'translateX(-50%) translateY(10px)'; }
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="48" height="72" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.14 }}>
            <ellipse cx="40" cy="18" rx="12" ry="12" stroke="#C9836A" strokeWidth="1.5"/>
            <path d="M28 30c0 0-8 4-10 16s-4 40-4 52h52c0-12-2-40-4-52S52 30 52 30" stroke="#C9836A" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,7,6,0.75) 0%, transparent 55%)' }} />
        <div className="try-btn" style={{
          position: 'absolute', bottom: 14, left: '50%',
          transform: 'translateX(-50%) translateY(10px)',
          opacity: 0, transition: 'opacity 250ms ease, transform 250ms ease',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            display: 'inline-flex', padding: '8px 20px', borderRadius: '100px',
            background: 'var(--rose)', color: 'var(--bg-deep)',
            fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Try On
          </span>
        </div>
      </div>
      <div style={{ padding: '14px 4px 0' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 400, color: 'var(--white)', lineHeight: 1.2, marginBottom: 5 }}>
          {dress.name}
        </h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="label-tag" style={{ fontSize: 10 }}>{dress.style}</span>
          <span style={{ color: 'var(--gold-dim)', fontSize: 10 }}>·</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>{dress.category}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function CollectionPage() {
  const [dresses,   setDresses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [catFilter, setCatFilter] = useState('All');
  const [sort,      setSort]      = useState('Newest');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await fetchDresses();
      setDresses(data?.dresses?.length ? data.dresses : MOCK_DRESSES);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = dresses
    .filter(d => catFilter === 'All' || d.category === catFilter || d.style === catFilter)
    .sort((a, b) => {
      if (sort === 'A–Z') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{ background: 'var(--bg-deep)', minHeight: '100vh' }}
    >
      <Navbar />

      {/* ── Hero Banner ── */}
      <div style={{
        height: '45vh', minHeight: 320,
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        background: 'linear-gradient(160deg, #1A0D09 0%, #0A0706 60%, #12080A 100%)',
        marginTop: 72,
      }}>
        <div className="ambient-blob ambient-blob-1" style={{ position: 'absolute', top: '-50%', right: '-10%', opacity: 0.1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, var(--bg-deep) 100%)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
            className="label-tag" style={{ marginBottom: 16 }}
          >
            Ladies Planet
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.4 }}
            style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 7vw, 90px)',
              fontWeight: 400, fontStyle: 'italic', color: 'var(--white)', lineHeight: 1.05,
            }}
          >
            The Collection
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
            style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 300, color: 'var(--muted)', marginTop: 12 }}
          >
            {dresses.length || '500'}+ curated bridal looks, ready for your AI try-on.
          </motion.p>
        </div>
      </div>

      {/* ── Sticky filter bar ── */}
      <div style={{
        position: 'sticky', top: 72, zIndex: 40,
        background: 'var(--glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 20px)',
          padding: '14px clamp(20px, 4vw, 60px)',
          overflowX: 'auto', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {[...CATEGORIES, ...STYLES.filter(s => s !== 'All')].filter((v, i, a) => a.indexOf(v) === i).map(f => (
              <button
                key={f}
                onClick={() => setCatFilter(prev => prev === f ? 'All' : f)}
                style={{
                  padding: '6px 14px', borderRadius: '100px',
                  background: catFilter === f ? 'var(--rose)' : 'transparent',
                  color: catFilter === f ? 'var(--bg-deep)' : 'var(--muted)',
                  border: `1px solid ${catFilter === f ? 'var(--rose)' : 'var(--glass-border)'}`,
                  fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 200ms ease', whiteSpace: 'nowrap',
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              background: 'var(--bg-card)', color: 'var(--muted)',
              border: '1px solid var(--glass-border)', borderRadius: 'var(--r)',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 400,
              padding: '7px 12px', cursor: 'pointer', outline: 'none',
              letterSpacing: '0.06em',
            }}
          >
            {SORT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* ── Dress Grid ── */}
      <div className="container" style={{ padding: 'clamp(32px, 4vw, 56px) clamp(20px, 4vw, 60px) var(--section-pad)' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}
            >
              {filtered.map((dress, i) => (
                <DressCard
                  key={dress.id}
                  dress={dress}
                  index={i}
                  gradient={GRADIENTS[i % GRADIENTS.length]}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, color: 'var(--muted)' }}>
              No styles match your filters
            </p>
          </div>
        )}
      </div>

      <Footer />
    </motion.div>
  );
}
