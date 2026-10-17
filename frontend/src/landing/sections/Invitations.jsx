import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Reveal from '../primitives/Reveal';
import useReducedMotion from '../hooks/useReducedMotion';
import { INVITATIONS } from '../data';

function InviteCard({ item, i, progress }) {
  const reduced = useReducedMotion();
  // Each card rotates + rises through the section at a slightly different rate.
  const dir = i === 1 ? 0 : i === 0 ? -1 : 1;
  const rotateY = useTransform(progress, [0, 0.5, 1], [dir * 22, 0, dir * -22]);
  const y = useTransform(progress, [0, 1], [70 + i * 20, -70 - i * 20]);
  const style = reduced ? {} : { rotateY, y, transformPerspective: 1200 };

  return (
    <motion.article className="cine-invite" style={style} data-cursor="hover">
      <div className="cine-invite-inner cine-glass">
        <span className="cine-invite-corner tl" /><span className="cine-invite-corner tr" />
        <span className="cine-invite-corner bl" /><span className="cine-invite-corner br" />
        <img src={item.poster} alt="" aria-hidden className="cine-invite-bg" />
        <div className="cine-invite-body">
          <span className="cine-eyebrow" style={{ color: 'var(--cine-gold)' }}>{item.sub}</span>
          <h3 className="cine-invite-name cine-gold-text">{item.title}</h3>
          <span className="cine-invite-rule" />
          <p style={{ fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(var(--cine-ivory-rgb),0.6)' }}>
            Together with their families
          </p>
          <p style={{ fontFamily: 'var(--cine-display)', fontSize: '1.4rem', fontStyle: 'italic', color: '#fff', marginTop: 10 }}>
            request your presence
          </p>
        </div>
      </div>
    </motion.article>
  );
}

/**
 * Section 7 — Wedding Invitations. Three glass cards float and rotate through
 * the viewport on scroll, like keepsakes suspended in light.
 */
export default function Invitations() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  return (
    <section ref={ref} className="cine-section" style={{ position: 'relative', background: 'linear-gradient(180deg,var(--cine-wine-3),var(--cine-wine-5),var(--cine-wine-3))', overflow: 'hidden' }}>
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 50% at 50% 40%, rgba(var(--cine-gold-rgb),0.4), transparent 70%)' }} />
      <div className="cine-container" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,7vh,80px)' }}>
          <Reveal variant="up"><span className="cine-eyebrow">Stationery</span></Reveal>
          <Reveal variant="up" delay={0.1}>
            <h2 style={{ fontSize: 'clamp(2.2rem,5.5vw,4.6rem)', marginTop: 14 }}>
              Invitations Worth <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Keeping</em>
            </h2>
          </Reveal>
        </div>

        <div className="cine-invite-row">
          {INVITATIONS.map((item, i) => (
            <InviteCard key={item.id} item={item} i={i} progress={scrollYProgress} />
          ))}
        </div>
      </div>

      <style>{`
        .cine-invite-row {
          display: flex; justify-content: center; align-items: center;
          gap: clamp(18px,3vw,56px); flex-wrap: wrap; perspective: 1400px;
        }
        .cine-invite { width: clamp(240px, 26vw, 320px); will-change: transform; }
        .cine-invite-inner {
          position: relative; aspect-ratio: 3/4.4; border-radius: 24px; overflow: hidden;
          padding: 30px 26px; display: flex; align-items: center;
          box-shadow: 0 40px 90px rgba(0,0,0,0.55);
          animation: cine-float 7s ease-in-out infinite;
        }
        .cine-invite:nth-child(2) .cine-invite-inner { animation-delay: -2.2s; }
        .cine-invite:nth-child(3) .cine-invite-inner { animation-delay: -4.4s; }
        .cine-invite-bg { position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; opacity: 0.16; filter: saturate(0.7); }
        .cine-invite-body { position: relative; z-index: 2; text-align: center; width: 100%; }
        .cine-invite-name { font-family: var(--cine-display); font-weight: 400; font-size: clamp(2rem,3vw,2.8rem);
          margin: 10px 0 14px; letter-spacing: 0.01em; }
        .cine-invite-rule { display: block; width: 46px; height: 1px; margin: 0 auto 16px;
          background: linear-gradient(90deg, transparent, var(--cine-gold), transparent); }
        .cine-invite-corner { position: absolute; width: 22px; height: 22px; border: 1px solid rgba(var(--cine-gold-rgb),0.5); }
        .cine-invite-corner.tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
        .cine-invite-corner.tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
        .cine-invite-corner.bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
        .cine-invite-corner.br { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }
        @media (prefers-reduced-motion: reduce){ .cine-invite-inner { animation: none !important; } }
      `}</style>
    </section>
  );
}
