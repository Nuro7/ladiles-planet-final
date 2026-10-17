import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import VideoBackground from '../primitives/VideoBackground';
import ParticleField from '../primitives/ParticleField';
import Reveal from '../primitives/Reveal';
import DecoMotif from '../primitives/DecoMotif';
import { VIDEOS } from '../data';

/**
 * Section 1 — the opening line of the story. A full-bleed video scene with a
 * single, enormous editorial statement that drifts on scroll.
 */
export default function StorySection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.02, 1.12]);

  return (
    <section
      id="cine-experience"
      ref={ref}
      style={{
        position: 'relative', minHeight: '108svh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      <motion.div style={{ position: 'absolute', inset: 0, y, scale }}>
        <VideoBackground
          src={VIDEOS.story.src}
          poster={VIDEOS.story.poster}
          posterPosition="52% 20%"
          overlay="vignette"
          tint={0.24}
        />
      </motion.div>
      <ParticleField density={0.00006} maxOpacity={0.4} style={{ zIndex: 2 }} />

      <div className="cine-container" style={{ position: 'relative', zIndex: 4, textAlign: 'center' }}>
        <Reveal variant="fade" duration={1.2}>
          <span style={{ display: 'inline-flex', color: 'var(--cine-gold)', marginBottom: 18 }}>
            <DecoMotif size={46} />
          </span>
        </Reveal>
        <Reveal variant="fade" duration={1.2} delay={0.1}>
          <span className="cine-eyebrow" style={{ display: 'block', marginBottom: 28 }}>Chapter One</span>
        </Reveal>

        <h2 className="cine-story-title">
          <Reveal as="span" variant="blur" delay={0.05} style={{ display: 'block' }}>Every&nbsp;Bride&nbsp;Deserves</Reveal>
          <Reveal as="span" variant="blur" delay={0.2} style={{ display: 'block' }}>
            Her&nbsp;Own <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Story</em>
          </Reveal>
        </h2>

        <Reveal variant="up" delay={0.4}>
          <p style={{
            maxWidth: '46ch', margin: '32px auto 0', fontSize: 'clamp(1rem,1.2vw,1.15rem)',
            lineHeight: 1.7, fontWeight: 300, color: 'rgba(var(--cine-ivory-rgb),0.8)',
          }}>
            Not just a photograph — a cinematic memory, told in light, fabric and gold.
            This is where yours begins.
          </p>
        </Reveal>
      </div>

      <style>{`
        .cine-story-title {
          font-family: var(--cine-display); font-weight: 300; color: #fff;
          line-height: 1.02; letter-spacing: -0.01em;
          font-size: clamp(2.6rem, 7.5vw, 7rem);
          text-shadow: 0 4px 50px rgba(0,0,0,0.55);
        }
      `}</style>
    </section>
  );
}
