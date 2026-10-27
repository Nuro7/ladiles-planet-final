import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import VideoBackground from '../primitives/VideoBackground';
import ParticleField from '../primitives/ParticleField';
import MagneticButton from '../primitives/MagneticButton';
import Reveal from '../primitives/Reveal';
import { VIDEOS, STUDIO_URL } from '../data';

const Arrow = (p) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Section 10 — the closing frame. A full-bleed cinematic scene (a bride
 * walking away) with the final invitation to begin.
 */
export default function FinalCTA() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.18, 1.02]);

  return (
    <section id="cine-experience" ref={ref} style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <motion.div style={{ position: 'absolute', inset: 0, scale }}>
        <VideoBackground
          src={VIDEOS.cta.src}
          poster={VIDEOS.cta.poster}
          posterPosition="50% 18%"
          overlay="vignette"
          tint={0.32}
        />
      </motion.div>
      <ParticleField density={0.00009} maxOpacity={0.5} style={{ zIndex: 2 }} />
      <span className="cine-grain" aria-hidden />

      <div className="cine-container" style={{ position: 'relative', zIndex: 4, textAlign: 'center' }}>
        <Reveal variant="fade" duration={1.2}>
          <span style={{ display: 'inline-flex', marginBottom: 22 }}>
            <img
              src="/LP%20Logo%20-1.png"
              alt="Ladies Planet"
              style={{ height: 64, width: 'auto', display: 'block' }}
            />
          </span>
        </Reveal>
        <Reveal variant="fade" duration={1.2} delay={0.1}>
          <span className="cine-eyebrow" style={{ display: 'block', marginBottom: 26 }}>The Beginning</span>
        </Reveal>
        <h2 className="cine-cta-title">
          <Reveal as="span" variant="blur" style={{ display: 'block' }}>Your Wedding Story</Reveal>
          <Reveal as="span" variant="blur" delay={0.15} style={{ display: 'block' }}>
            Begins <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Here</em>
          </Reveal>
        </h2>
        <Reveal variant="up" delay={0.35}>
          <div style={{ marginTop: 'clamp(32px,5vh,52px)', display: 'flex', justifyContent: 'center' }}>
            <MagneticButton href={STUDIO_URL} strength={0.5} className="cine-btn cine-btn-gold cine-sweep-host" style={{ minHeight: 62, padding: '0 42px', fontSize: '0.92rem' }}>
              Create My Bridal Experience <Arrow />
            </MagneticButton>
          </div>
        </Reveal>
      </div>

      <style>{`
        .cine-cta-title {
          font-family: var(--cine-didone); font-optical-sizing: auto;
          font-weight: 500; color: #fff;
          line-height: 0.98; letter-spacing: -0.015em;
          font-size: clamp(2.8rem, 8vw, 8rem); text-shadow: 0 4px 50px rgba(0,0,0,0.6);
        }
      `}</style>
    </section>
  );
}
