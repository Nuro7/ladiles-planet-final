import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useReducedMotion from '../hooks/useReducedMotion';

/**
 * Cinematic pre-roll. Counts 0 → 100 while the page settles, slowly turning
 * the Ladies Planet logo mark, then lifts away as a pair of curtains. Calls
 * `onDone` once the exit begins so the hero can start its entrance in parallel.
 */
export default function LoadingScreen({ onDone }) {
  const reduced = useReducedMotion();
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (reduced) {
      // Skip the count-up; just hold briefly then lift the curtain.
      const t = setTimeout(() => { setGone(true); onDone?.(); }, 350);
      return () => clearTimeout(t);
    }

    let frame;
    let value = 0;
    let settled = false;
    const onLoad = () => { settled = true; };
    if (document.readyState === 'complete') settled = true;
    else window.addEventListener('load', onLoad, { once: true });

    const tick = () => {
      // Ease toward 90 quickly, then let real load finish the last 10.
      const ceiling = settled ? 100 : 90;
      value += (ceiling - value) * 0.045 + 0.35;
      if (value >= 100) value = 100;
      setPct(Math.floor(value));
      if (value >= 100) {
        setTimeout(() => { setGone(true); onDone?.(); }, 480);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('load', onLoad);
    };
  }, [reduced, onDone]);

  const shownPct = reduced ? 100 : pct;

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="cine-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'var(--cine-wine-3)', display: 'grid', placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          {/* twin curtains */}
          <motion.span aria-hidden style={curtain('top')}
            initial={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }} />
          <motion.span aria-hidden style={curtain('bottom')}
            initial={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }} />

          <div style={{ position: 'relative', textAlign: 'center', zIndex: 2 }}>
            {/* Luxury loading emblem — the Ladies Planet logo, slowly turning.
               Only the height is fixed; width is auto so the intrinsic
               1390×1594 ratio is preserved (no stretching / morphing). */}
            <div style={{ position: 'relative', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
              <span aria-hidden style={{ position: 'absolute', width: 168, height: 168, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(var(--cine-gold-rgb),0.26), transparent 68%)', filter: 'blur(6px)' }} />
              <motion.img
                src="/LP%20Logo%20-1.png"
                alt="Ladies Planet"
                style={{ display: 'block', height: 116, width: 'auto',
                  filter: 'drop-shadow(0 0 14px rgba(var(--cine-gold-rgb),0.35))' }}
                initial={{ opacity: 0, scale: 0.82 }}
                animate={reduced ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, rotate: 360 }}
                transition={{
                  opacity: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
                  scale:   { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
                  rotate:  { repeat: Infinity, ease: 'linear', duration: 12 },
                }}
              />
            </div>

            {/* Brand wordmark — exact logo lockup image (white on transparent).
               Fixed width, height auto keeps its 904×169 ratio; centered under
               the emblem via marginInline auto. */}
            <motion.img
              src="/ladies%20plant_word.png"
              alt="Ladies Planet"
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'block',
                width: 'clamp(184px, 42vw, 232px)',
                height: 'auto',
                marginInline: 'auto',
              }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.9 }}
              className="cine-eyebrow"
              style={{ marginTop: 14, color: 'rgba(var(--cine-gold-rgb),0.85)' }}
            >
              Ai&nbsp;·&nbsp;Bridal&nbsp;Studio
            </motion.p>

            {/* progress line */}
            <div style={{
              marginTop: 34, width: 220, height: 1,
              background: 'rgba(255,255,255,0.12)', position: 'relative',
              marginInline: 'auto', overflow: 'hidden',
            }}>
              <span style={{
                position: 'absolute', inset: 0, transformOrigin: 'left',
                transform: `scaleX(${shownPct / 100})`,
                background: 'linear-gradient(90deg, #8E6A3C,#ECD9A8)',
                transition: 'transform 0.1s linear',
              }} />
            </div>
            <div style={{
              marginTop: 14, fontFamily: 'var(--cine-sans)',
              fontSize: '0.72rem', letterSpacing: '0.3em',
              color: 'rgba(var(--cine-ivory-rgb),0.5)',
            }}>
              {String(shownPct).padStart(3, '0')}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const curtain = (edge) => ({
  position: 'absolute', left: 0, right: 0, height: '52%',
  [edge]: 0, background: 'linear-gradient(' + (edge === 'top' ? '180deg' : '0deg') + ', var(--cine-wine-5), var(--cine-wine-4))',
  transformOrigin: edge === 'top' ? 'top' : 'bottom',
  zIndex: 1,
});
