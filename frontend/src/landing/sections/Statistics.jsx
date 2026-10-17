import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import Reveal, { RevealGroup, RevealItem } from '../primitives/Reveal';
import ParticleField from '../primitives/ParticleField';
import useReducedMotion from '../hooks/useReducedMotion';
import { STATS } from '../data';

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf; const dur = 1900; let start;
    const tick = (t) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.floor(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduced]);

  // Reduced motion → show the final figure immediately (no animation, no setState).
  const shown = reduced ? value : n;
  return (
    <span ref={ref} className="cine-stat-num cine-gold-text">
      {shown.toLocaleString('en-US')}{suffix}
    </span>
  );
}

/** Section 9 — Statistics. Numbers count upward as they enter view. */
export default function Statistics() {
  return (
    <section className="cine-section" style={{ position: 'relative', background: 'linear-gradient(180deg,var(--cine-wine-3),var(--cine-wine-5),var(--cine-wine-3))', overflow: 'hidden' }}>
      <ParticleField density={0.00005} maxOpacity={0.35} />
      <div className="cine-container" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vh,70px)' }}>
          <Reveal variant="up"><span className="cine-eyebrow">By the Numbers</span></Reveal>
          <Reveal variant="up" delay={0.1}>
            <h2 style={{ fontSize: 'clamp(2rem,4.6vw,3.8rem)', marginTop: 14 }}>
              A World of <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Brides</em>
            </h2>
          </Reveal>
          <Reveal variant="fade" delay={0.2}>
            <div className="cine-deco-divider" style={{ maxWidth: 300, margin: '26px auto 0' }}>
              <span className="cine-deco-diamond" />
            </div>
          </Reveal>
        </div>

        <RevealGroup className="cine-stat-grid" stagger={0.12}>
          {STATS.map((s) => (
            <RevealItem key={s.label} variant="up" className="cine-stat">
              <Counter value={s.value} suffix={s.suffix} />
              <span className="cine-stat-label">{s.label}</span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      <style>{`
        .cine-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(20px,3vw,48px); }
        .cine-stat { text-align: center; position: relative; padding: clamp(20px,2vw,32px) 8px; }
        .cine-stat:not(:last-child)::after {
          content: ''; position: absolute; right: calc(-1 * clamp(10px,1.5vw,24px)); top: 20%; bottom: 20%;
          width: 1px; background: linear-gradient(to bottom, transparent, var(--cine-line), transparent);
        }
        .cine-stat-num { display: block; font-family: var(--cine-display); font-weight: 400;
          font-size: clamp(2.6rem, 5.5vw, 5rem); line-height: 1; letter-spacing: -0.02em; }
        .cine-stat-label { display: block; margin-top: 14px; font-family: var(--cine-sans);
          font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(var(--cine-ivory-rgb),0.62); }
        @media (max-width: 780px){
          .cine-stat-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .cine-stat:not(:last-child)::after { display: none; }
        }
      `}</style>
    </section>
  );
}
