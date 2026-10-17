import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Reveal, { RevealGroup, RevealItem } from '../primitives/Reveal';
import ParticleField from '../primitives/ParticleField';
import { PROCESS } from '../data';

const ICONS = {
  '01': (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 16V4m0 0L8 8m4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>),
  '02': (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M9 10h.01M15 10h.01M9.5 13c.7.6 1.6.9 2.5.9s1.8-.3 2.5-.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M12 16v5M8 21h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>),
  '03': (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l2.1 5.2L20 9l-4 3.9L17 19l-5-2.8L7 19l1-6.1L4 9l5.9-.8L12 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>),
  '04': (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 8h18M10 12l4 2-4 2v-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>),
};

/**
 * Section 3 — the AI process, told as four monumental cards linked by a
 * scroll-drawn gold line. Each card reveals and lifts independently.
 */
export default function AIProcess() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.4'] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={ref} className="cine-section" style={{ position: 'relative', background: 'linear-gradient(180deg,var(--cine-wine-3),var(--cine-wine-5) 50%,var(--cine-wine-3))' }}>
      <ParticleField density={0.00004} maxOpacity={0.3} />
      <div className="cine-container" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(50px,8vh,90px)' }}>
          <Reveal variant="up"><span className="cine-eyebrow">The Process</span></Reveal>
          <Reveal variant="up" delay={0.1}>
            <h2 style={{ fontSize: 'clamp(2.2rem,5.5vw,4.6rem)', marginTop: 14 }}>
              Four Steps to <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>the Extraordinary</em>
            </h2>
          </Reveal>
        </div>

        <div className="cine-proc-wrap">
          {/* connector */}
          <div className="cine-proc-line" aria-hidden>
            <motion.span style={{ scaleY: lineScale, transformOrigin: 'top' }} />
          </div>

          <RevealGroup className="cine-proc-grid" stagger={0.16}>
            {PROCESS.map((s) => {
              const Icon = ICONS[s.n];
              return (
                <RevealItem key={s.n} variant="blur" className="cine-proc-card cine-glass" data-cursor="hover">
                  <div className="cine-proc-node" aria-hidden />
                  <div className="cine-proc-head">
                    <span className="cine-proc-num cine-gold-text">{s.n}</span>
                    <span className="cine-proc-icon"><Icon width="26" height="26" /></span>
                  </div>
                  <h3 style={{ fontSize: 'clamp(1.5rem,2.4vw,2.1rem)', color: '#fff', marginBottom: 12 }}>{s.title}</h3>
                  <p style={{ color: 'rgba(var(--cine-ivory-rgb),0.66)', fontSize: '0.98rem', lineHeight: 1.65 }}>{s.body}</p>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </div>

      <style>{`
        .cine-proc-wrap { position: relative; }
        .cine-proc-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: clamp(18px, 1.8vw, 28px); position: relative; z-index: 2;
        }
        .cine-proc-card {
          position: relative; border-radius: 20px; padding: clamp(26px,2.4vw,38px);
          min-height: 300px; overflow: hidden;
          transition: transform 0.5s var(--cine-ease), border-color 0.5s ease, box-shadow 0.5s ease;
        }
        .cine-proc-card:hover {
          transform: translateY(-10px);
          border-color: rgba(var(--cine-gold-rgb),0.45);
          box-shadow: 0 30px 70px rgba(0,0,0,0.5);
        }
        .cine-proc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .cine-proc-num { font-family: var(--cine-display); font-size: clamp(2.6rem,4vw,3.6rem); font-weight: 400; line-height: 1; }
        .cine-proc-icon { width: 52px; height: 52px; display: grid; place-items: center;
          border-radius: 50%; border: 1px solid var(--cine-line); color: var(--cine-gold); }
        .cine-proc-node { display: none; }

        /* Desktop connector line behind the row */
        .cine-proc-line {
          position: absolute; left: 0; right: 0; top: 74px; height: 1px;
          background: rgba(var(--cine-gold-rgb),0.14); z-index: 1; display: none;
        }
        .cine-proc-line span { position: absolute; inset: 0; display: block;
          background: linear-gradient(90deg, var(--cine-gold-muted), var(--cine-gold)); }

        @media (min-width: 981px){ .cine-proc-line { display: block; transform: scaleX(1); } }

        @media (max-width: 980px){
          .cine-proc-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 620px){
          .cine-proc-grid { grid-template-columns: 1fr; gap: 16px; }
          .cine-proc-card { min-height: auto; }
        }
      `}</style>
    </section>
  );
}
