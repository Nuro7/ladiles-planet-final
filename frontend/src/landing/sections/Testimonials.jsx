import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Reveal, { RevealGroup, RevealItem } from '../primitives/Reveal';
import useReducedMotion from '../hooks/useReducedMotion';
import { TESTIMONIALS } from '../data';

function Stars() {
  const reduced = useReducedMotion();
  return (
    <div style={{ display: 'flex', gap: 5 }} aria-label="5 out of 5 stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.svg key={i} width="17" height="17" viewBox="0 0 24 24"
          initial={reduced ? false : { opacity: 0, scale: 0.4, rotate: -30 }}
          whileInView={reduced ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.09, type: 'spring', stiffness: 320, damping: 16 }}>
          <path d="M12 2l2.6 6.3L21 9l-4.9 4.6L17.5 21 12 17.3 6.5 21l1.4-7.4L3 9l6.4-.7L12 2z" fill="#D4AF6A" />
        </motion.svg>
      ))}
    </div>
  );
}

function Card({ t }) {
  const vidRef = useRef(null);
  const [hover, setHover] = useState(false);
  const onEnter = () => { setHover(true); const p = vidRef.current?.play?.(); if (p?.catch) p.catch(() => {}); };
  const onLeave = () => { setHover(false); vidRef.current?.pause?.(); };

  return (
    <RevealItem variant="blur" className="cine-testi cine-glass" data-cursor="hover">
      <div className="cine-testi-media" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <img src={t.poster} alt={t.name} loading="lazy" style={{ opacity: hover ? 0 : 1 }} />
        <video ref={vidRef} muted loop playsInline preload="none" poster={t.poster} style={{ opacity: hover ? 1 : 0 }}>
          <source src={`/videos/testimonial-${t.id}.mp4`} type="video/mp4" />
        </video>
        <span className="cine-testi-play"><svg width="13" height="13" viewBox="0 0 12 12"><path d="M2 1.5v9l8-4.5z" fill="currentColor"/></svg></span>
      </div>
      <div className="cine-testi-body">
        <Stars />
        <p className="cine-testi-quote">&ldquo;{t.quote}&rdquo;</p>
        <div className="cine-testi-by">
          <span className="cine-testi-name">{t.name}</span>
          <span className="cine-testi-place">{t.place}</span>
        </div>
      </div>
    </RevealItem>
  );
}

/** Section 8 — Testimonials. Glass cards with hover video previews + animated stars. */
export default function Testimonials() {
  return (
    <section className="cine-section" style={{ position: 'relative', background: 'var(--cine-bg)' }}>
      <div className="cine-container">
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vh,72px)' }}>
          <Reveal variant="up"><span className="cine-eyebrow">Loved by Brides</span></Reveal>
          <Reveal variant="up" delay={0.1}>
            <h2 style={{ fontSize: 'clamp(2.2rem,5.5vw,4.6rem)', marginTop: 14 }}>
              Stories They <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Treasure</em>
            </h2>
          </Reveal>
        </div>

        <RevealGroup className="cine-testi-grid" stagger={0.14}>
          {TESTIMONIALS.map((t) => <Card key={t.id} t={t} />)}
        </RevealGroup>
      </div>

      <style>{`
        .cine-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(18px,2vw,30px); }
        .cine-testi { border-radius: 20px; overflow: hidden; display: flex; flex-direction: column;
          transition: transform 0.5s var(--cine-ease), border-color 0.5s ease; }
        .cine-testi:hover { transform: translateY(-8px); border-color: rgba(var(--cine-gold-rgb),0.4); }
        .cine-testi-media { position: relative; aspect-ratio: 16/11; overflow: hidden; }
        .cine-testi-media img, .cine-testi-media video { position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; transition: opacity 0.5s ease; }
        .cine-testi-play { position: absolute; bottom: 14px; right: 14px; width: 40px; height: 40px;
          border-radius: 50%; display: grid; place-items: center; color: var(--cine-wine-5);
          background: linear-gradient(140deg, #ECD9A8, #D4AF6A 55%, #8E6A3C);
          box-shadow: 0 6px 20px rgba(var(--cine-gold-rgb),0.4); }
        .cine-testi-body { padding: clamp(22px,2vw,30px); display: flex; flex-direction: column; gap: 16px; }
        .cine-testi-quote { font-family: var(--cine-display); font-size: clamp(1.15rem,1.5vw,1.4rem);
          font-style: italic; line-height: 1.45; color: var(--cine-ivory); }
        .cine-testi-by { display: flex; flex-direction: column; gap: 2px; margin-top: auto; }
        .cine-testi-name { font-family: var(--cine-sans); font-size: 0.95rem; font-weight: 500; color: #fff; letter-spacing: 0.04em; }
        .cine-testi-place { font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--cine-gold); }
        @media (max-width: 900px){ .cine-testi-grid { grid-template-columns: 1fr; max-width: 460px; margin: 0 auto; } }
      `}</style>
    </section>
  );
}
