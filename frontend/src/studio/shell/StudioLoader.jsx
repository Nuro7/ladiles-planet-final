import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * StudioLoader — the entrance pre-roll for the Bridal Studio.
 *
 * Shown once when the studio shell mounts (i.e. on entering /studio, not on
 * switching between modules). The Ladies Planet emblem eases in and slowly
 * turns over a champagne glow, with the "Bridal Studio" wordmark rising in
 * beneath it, then the whole overlay lifts away. Lives inside `.studio-root`
 * so it inherits the studio design tokens (--ink-900, --gold, …). Fully
 * degrades under prefers-reduced-motion.
 */
export default function StudioLoader({ onDone }) {
  const reduced = useReducedMotion();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const hold = reduced ? 650 : 2000;
    const t = setTimeout(() => { setGone(true); onDone?.(); }, hold);
    return () => clearTimeout(t);
  }, [reduced, onDone]);

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="studio-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="studio-loader__stack">
            {/* Emblem — Ladies Planet mark over a champagne glow, slowly turning.
                Height fixed / width auto keeps its intrinsic ratio. */}
            <div className="studio-loader__emblem">
              <motion.span
                aria-hidden
                className="studio-loader__glow"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.img
                src="/LP%20Logo%20-1.png"
                alt="Ladies Planet"
                className="studio-loader__mark"
                initial={{ opacity: 0, scale: 0.82 }}
                animate={reduced
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: 1, rotate: 360 }}
                transition={{
                  opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                  scale:   { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                  rotate:  { repeat: Infinity, ease: 'linear', duration: 13 },
                }}
              />
            </div>

            {/* Bridal Studio wordmark — source art is black, so invert it to
                white; blur animates while invert stays constant. */}
            <motion.img
              src="/bridalstudio.png"
              alt="Bridal Studio"
              className="studio-loader__wordmark"
              initial={{ opacity: 0, y: 14, filter: 'invert(1) blur(8px)' }}
              animate={{ opacity: 0.96, y: 0, filter: 'invert(1) blur(0px)' }}
              transition={{ delay: 0.28, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Loading rule — a champagne line that draws left→right. */}
            <div className="studio-loader__track" aria-hidden>
              <motion.span
                className="studio-loader__fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: reduced ? 0.5 : 1.7,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.1,
                }}
              />
            </div>
          </div>

          <style>{`
            .studio-loader {
              position: fixed; inset: 0; z-index: 9000;
              display: grid; place-items: center; overflow: hidden;
              background:
                radial-gradient(120% 90% at 50% 30%, var(--ink-800), var(--ink-900) 70%);
            }
            .studio-loader__stack {
              position: relative; display: flex; flex-direction: column;
              align-items: center; text-align: center;
            }
            .studio-loader__emblem {
              position: relative; display: grid; place-items: center;
              margin-bottom: 26px;
            }
            .studio-loader__glow {
              position: absolute; width: 176px; height: 176px; border-radius: 50%;
              background: radial-gradient(circle,
                rgba(212,175,106,0.28), transparent 68%);
              filter: blur(6px);
            }
            .studio-loader__mark {
              display: block; height: 112px; width: auto; position: relative;
              filter: drop-shadow(0 0 15px rgba(212,175,106,0.38));
            }
            .studio-loader__wordmark {
              display: block;
              width: clamp(190px, 44vw, 250px); height: auto;
              margin-inline: auto;
            }
            .studio-loader__track {
              margin-top: 34px; width: 210px; height: 1px;
              margin-inline: auto; overflow: hidden;
              background: rgba(255,255,255,0.10);
            }
            .studio-loader__fill {
              display: block; width: 100%; height: 100%;
              transform-origin: left;
              background: linear-gradient(90deg,
                var(--gold-hover, #8E6A3C), var(--gold-hi, #ECD9A8));
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
