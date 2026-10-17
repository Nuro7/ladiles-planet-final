import { AnimatePresence, motion } from 'framer-motion';
import { SIGNAGE_SLIDES } from '../data';
import useBreakpoint from '../../hooks/useBreakpoint';

/**
 * The rotating TV / signage text — one chaptered slide on stage at a time.
 * Driven entirely by `index` (owned by Hero, shared with the background film),
 * so text and video change together. Each slide runs a luxury, jewelry-grade
 * reveal: a masked word-by-word headline, an Art-Deco divider, and a
 * subheadline that blooms open on its letter-spacing. Under reduced motion the
 * whole thing degrades to a calm crossfade — the 10s cycle still runs.
 *
 * Props:
 *   index    number  — which slide (mod SIGNAGE_SLIDES.length)
 *   reduced  boolean — prefers-reduced-motion
 *   ready    boolean — gate the first reveal until the loader lifts
 */
const ease = [0.16, 1, 0.3, 1];

// ── Full-motion variants ─────────────────────────────────────────
const stage = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.12 } },
  exit: { transition: { staggerChildren: 0.07, staggerDirection: -1 } },
};

const headV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};
const wordV = {
  hidden: { y: '118%' },
  show: { y: '0%', transition: { duration: 1.0, ease } },
  exit: { y: '-118%', transition: { duration: 0.7, ease } },
};

const dividerV = {
  hidden: { opacity: 0, scaleX: 0 },
  show: { opacity: 1, scaleX: 1, transition: { duration: 0.8, ease } },
  exit: { opacity: 0, transition: { duration: 0.45 } },
};

// Italic-serif subheadline — a soft "bloom open" on letter-spacing under the
// Didone headline, plus a gentle rise.
const subV = {
  hidden: { opacity: 0, y: 16, letterSpacing: '0.02em' },
  show: { opacity: 1, y: 0, letterSpacing: '0.08em', transition: { duration: 1.0, ease } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.5, ease } },
};

// ── Reduced-motion: a single, calm crossfade ─────────────────────
const fadeStage = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: 'linear' } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: 'linear' } },
};

export default function HeroSlides({ index, reduced, ready }) {
  const slide = SIGNAGE_SLIDES[index % SIGNAGE_SLIDES.length];
  const words = slide.title.split(/\s+/);
  const animate = ready ? 'show' : 'hidden';
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  return (
    <div className="cine-sig" aria-live="polite">
      <AnimatePresence mode="wait">
        {reduced ? (
          <motion.div
            key={index}
            className="cine-sig-slide"
            variants={fadeStage}
            initial="hidden"
            animate={animate}
            exit="exit"
            style={{
              alignItems: isMobile ? 'center' : 'flex-start',
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            <h1 className="cine-sig-title" style={{ justifyContent: isMobile ? 'center' : 'flex-start' }}><span>{slide.title}</span></h1>
            <div className="cine-deco-divider cine-sig-divider" style={{ margin: isMobile ? '0 auto' : '0' }}><span className="cine-deco-diamond" /></div>
            <p className="cine-sig-sub">{slide.sub}</p>
          </motion.div>
        ) : (
          <motion.div
            key={index}
            className="cine-sig-slide"
            variants={stage}
            initial="hidden"
            animate={animate}
            exit="exit"
            style={{
              alignItems: isMobile ? 'center' : 'flex-start',
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            <motion.h1 className="cine-sig-title" variants={headV} style={{ justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {words.map((w, i) => (
                <span className="cine-sig-word" key={`${index}-${i}`}>
                  <motion.span className="cine-sig-word-inner" variants={wordV}>
                    {w}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            <motion.div
              className="cine-deco-divider cine-sig-divider"
              variants={dividerV}
              style={{
                transformOrigin: 'center',
                margin: isMobile ? '0 auto' : '0',
              }}
            >
              <span className="cine-deco-diamond" />
            </motion.div>

            <motion.p className="cine-sig-sub" variants={subV}>
              {slide.sub}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .cine-sig { position: relative; width: 100%; }
        /* Slides stack in the same cell so mode="wait" swaps in place, left-aligned. */
        .cine-sig-slide {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          gap: clamp(16px, 2.4vh, 28px);
        }

        .cine-sig-title {
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          align-items: flex-end;
          /* Row-gap is 0 — wrapped-line spacing is set by the word box below so
             a 2-line title doesn't open up a big gap. Column-gap = word spacing. */
          gap: 0 0.26em;
          /* High-contrast Didone wordmark — the fashion-maison luxury note.
             optical-sizing: auto lets Bodoni use its display cut (finer hairlines)
             at hero sizes. */
          font-family: var(--cine-didone);
          font-optical-sizing: auto;
          font-weight: 500;
          line-height: 1.04;
          letter-spacing: 0;
          font-size: clamp(2.6rem, 7.2vw, 6.8rem);
          color: var(--cine-white);
          text-shadow: 0 4px 34px rgba(0,0,0,0.6);
          max-width: 16ch;
        }
        /* Masked word reveal: the wrapper clips, the inner glyphs rise into it.
           Bottom padding keeps descenders (J, y, g) from being shaved off during
           the reveal; the matching negative margin cancels that padding from
           layout so wrapped lines sit tight (≈1.06 line-height, not ≈1.22). */
        .cine-sig-word {
          display: block; overflow: hidden;
          padding-bottom: 0.16em;
          margin-bottom: -0.12em;
        }
        .cine-sig-word-inner { display: block; will-change: transform; }

        .cine-sig-divider { max-width: min(300px, 52vw); margin: 0; }

        /* Subheadline — refined Cormorant italic, letter-spaced. Reads luxury
           to match the Didone headline (replaced the cursive script). */
        .cine-sig-sub {
          margin: 0;
          font-family: var(--cine-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(1.15rem, 2.2vw, 1.75rem);
          line-height: 1.5;
          letter-spacing: 0.08em;
          color: var(--cine-ivory);
          text-shadow: 0 2px 22px rgba(0,0,0,0.6);
          max-width: 34ch;
        }

        @media (prefers-reduced-motion: reduce) {
          .cine-sig-title { filter: none; }
        }
      `}</style>
    </div>
  );
}
