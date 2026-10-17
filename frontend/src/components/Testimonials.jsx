import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

const TESTIMONIALS = [
  {
    quote: 'I tried on over forty looks from my bedroom in one afternoon. When I finally went to the boutique, I knew exactly what I wanted. AI Bridal Wall saved me months of uncertainty.',
    name: 'Aisha Raza',
    city: 'Lahore',
  },
  {
    quote: 'The way it preserved my face and skin tone while draping the lehenga on me — I was in tears. It felt like seeing myself on my wedding day before the day even arrived.',
    name: 'Priya Sharma',
    city: 'Mumbai',
  },
  {
    quote: 'I live abroad and couldn\'t fly home just to try on dresses. This platform let me explore the entire Ladies Planet collection remotely. My family said yes to the dress over a video call.',
    name: 'Zara Khan',
    city: 'London',
  },
];

const StarDots = () => (
  <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
    {[...Array(5)].map((_, i) => (
      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rose)' }} />
    ))}
  </div>
);

export default function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive(a => (a + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{
      background: 'var(--bg-dark)',
      padding: 'var(--section-pad) 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="ambient-blob ambient-blob-1" style={{
        position: 'absolute', top: '-100px', left: '-100px', opacity: 0.06,
      }} />

      <div className="container">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          viewport={{ once: true, margin: '-80px' }}
          className="label-tag"
          style={{ textAlign: 'center', marginBottom: 16 }}
        >
          Stories
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(30px, 4vw, 52px)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'var(--white)',
            textAlign: 'center',
            marginBottom: 'clamp(48px, 6vw, 72px)',
          }}
        >
          Brides Who Found Their Look
        </motion.h2>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {TESTIMONIALS.map(({ quote, name, city }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.1 }}
              viewport={{ once: true, margin: '-60px' }}
              onClick={() => setActive(i)}
              style={{
                background: 'var(--glass)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid',
                borderColor: i === active ? 'var(--rose)' : 'var(--glass-border)',
                borderRadius: 'var(--r-md)',
                padding: 'clamp(28px, 3vw, 40px)',
                cursor: 'pointer',
                transition: 'transform 400ms var(--ease-cinematic), border-color 400ms ease, box-shadow 400ms ease',
                transform: i === active ? 'scale(1.03)' : 'scale(1)',
                boxShadow: i === active ? '0 16px 48px rgba(201,131,106,0.12)' : 'none',
                position: 'relative',
              }}
            >
              {/* Big quote mark */}
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 80,
                color: 'var(--rose)',
                lineHeight: 0.6,
                marginBottom: 20,
                opacity: 0.7,
                userSelect: 'none',
              }}>
                "
              </div>

              {/* Stars */}
              <StarDots />

              {/* Quote */}
              <blockquote style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(15px, 1.6vw, 18px)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--white)',
                lineHeight: 1.7,
                marginBottom: 28,
              }}>
                {quote}
              </blockquote>

              {/* Divider */}
              <div style={{
                width: 40, height: 1,
                background: 'var(--gold-dim)',
                marginBottom: 16,
              }} />

              {/* Bride info */}
              <div>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--rose-light)',
                  marginBottom: 2,
                }}>
                  {name}
                </p>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  fontWeight: 300,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}>
                  {city}
                </p>
              </div>

              {/* Active indicator */}
              <AnimatePresence>
                {i === active && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    style={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      height: 2,
                      background: 'var(--rose)',
                      borderBottomLeftRadius: 'var(--r-md)',
                      borderBottomRightRadius: 'var(--r-md)',
                      transformOrigin: 'left',
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Dot indicator */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 10, marginTop: 36,
        }}>
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: i === active ? 24 : 6,
                height: 6,
                borderRadius: '100px',
                background: i === active ? 'var(--rose)' : 'var(--gold-dim)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 400ms var(--ease-cinematic), background 300ms ease',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
