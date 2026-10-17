import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import VideoBackground from '../primitives/VideoBackground';
import ParticleField from '../primitives/ParticleField';
import Reveal from '../primitives/Reveal';
import DecoMotif from '../primitives/DecoMotif';
import BodoniText from '../primitives/BodoniText';
import { VIDEOS } from '../data';

/**
 * Animated words — an editorial interlude built around <BodoniText/>.
 * A single full-bleed cinematic frame where a trio of brand phrases plays a
 * come-and-go loop (kicker · masked word-rise title · italic sub), each on its
 * own 5s window. This is the home-page home for the animated display type that
 * previously only lived on the /type-lab preview route.
 */
const PHRASES = [
  { kicker: 'Ladies Planet · Est. MMXXV', title: 'Bridal, Reimagined',    sub: 'An AI atelier for the modern bride.' },
  { kicker: 'The Signature Wall',          title: 'Every Gown a Portrait',  sub: 'Curated, cinematic, unmistakably you.' },
  { kicker: 'Champagne & Cherry',          title: 'Dressed in Light',       sub: 'Where couture meets computation.' },
];

export default function AnimatedWords() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.14, 1.02]);

  return (
    <section
      id="cine-words"
      ref={ref}
      style={{
        position: 'relative', minHeight: '100svh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      <motion.div style={{ position: 'absolute', inset: 0, scale }}>
        <VideoBackground
          src={VIDEOS.wall.src}
          poster={VIDEOS.wall.poster}
          posterPosition="50% 22%"
          overlay="vignette"
          tint={0.34}
        />
      </motion.div>
      <ParticleField density={0.00007} maxOpacity={0.45} style={{ zIndex: 2 }} />
      <span className="cine-grain" aria-hidden />

      <div className="cine-container" style={{ position: 'relative', zIndex: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Reveal variant="fade" duration={1.2}>
          <span style={{ display: 'inline-flex', color: 'var(--cine-gold)', marginBottom: 20 }}>
            <DecoMotif size={50} />
          </span>
        </Reveal>
        <Reveal variant="fade" duration={1.2} delay={0.1}>
          <span className="cine-eyebrow" style={{ display: 'block', marginBottom: 'clamp(30px, 5vh, 56px)' }}>In a Few Words</span>
        </Reveal>

        <Reveal variant="up" delay={0.2} style={{ width: '100%', maxWidth: 'min(820px, 92vw)' }}>
          <BodoniText phrases={PHRASES} font="jost" cycle={5000} align="center" />
        </Reveal>
      </div>
    </section>
  );
}
