import { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import useReducedMotion from '../hooks/useReducedMotion';

/**
 * BodoniText — animated editorial display text in Bodoni Moda.
 *
 * A single phrase (kicker · title · italic sub) plays a full come-and-go inside
 * a 5s window, then loops or advances to the next phrase:
 *
 *   0.0s ─ enter   kicker tracks in · title rises word-by-word (masked) · rule draws
 *   1.2s ─ hold    the line sits, a slow gold sheen crossing the title
 *   4.1s ─ exit    words lift out (ease-in, ~65% of enter) · kicker + sub fade
 *   4.85s─ breath   0.15s of empty, then the next phrase enters
 *
 * Bodoni Moda is a Didone — its razor thin/thick contrast is the couture-magazine
 * look. It's paired with a GEOMETRIC accent (Jost) for the kicker, the classic
 * fashion-editorial contrast. The accent is selectable via `font`.
 *
 * Props
 *   phrases  {kicker,title,sub}[]  — cycles one per window (or pass title/kicker/sub)
 *   font     'jost'|'grotesk'|'cormorant'  — the ACCENT pairing (display stays Bodoni)
 *   cycle    number   — ms per come-and-go window (default 5000)
 *   align    'left'|'center'  — text alignment (default 'left')
 *   ready    boolean  — gate the first reveal (e.g. until a loader lifts)
 *   loop     boolean  — keep cycling (default true); false plays once
 */

// House ease-out (expo) for entrances; a sharp ease-in for exits so leaving
// reads faster than arriving (exit ≈ 65% of enter).
const easeOut = [0.16, 1, 0.3, 1];
const easeIn = [0.7, 0, 0.84, 0];

// Curated accent pairings. The display is ALWAYS Bodoni Moda (the brief);
// `font` only swaps the geometric/serif accent used for the kicker.
const FONT_SETS = {
  jost: { accent: "'Jost', system-ui, sans-serif", accentWeight: 500, accentTrack: '0.42em' },
  grotesk: { accent: "'Space Grotesk', system-ui, sans-serif", accentWeight: 500, accentTrack: '0.38em' },
  cormorant: { accent: "'Cormorant Garamond', Georgia, serif", accentWeight: 600, accentTrack: '0.30em' },
};
const DISPLAY = "'Bodoni Moda', 'Playfair Display', Georgia, serif";

// ── Full-motion variants ─────────────────────────────────────────
const stage = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};

const kickerV = {
  hidden: { opacity: 0, y: 12, letterSpacing: '0.18em' },
  show: (t) => ({ opacity: 1, y: 0, letterSpacing: t, transition: { duration: 0.9, ease: easeOut } }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.4, ease: easeIn } },
};

const headV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};
const wordV = {
  hidden: { y: '118%' },
  show: { y: '0%', transition: { duration: 1.0, ease: easeOut } },
  exit: { y: '-118%', transition: { duration: 0.65, ease: easeIn } },
};

const ruleV = {
  hidden: { opacity: 0, scaleX: 0 },
  show: { opacity: 1, scaleX: 1, transition: { duration: 0.8, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: 0.35 } },
};

const subV = {
  hidden: { opacity: 0, y: 14, letterSpacing: '0.02em' },
  show: { opacity: 1, y: 0, letterSpacing: '0.14em', transition: { duration: 1.0, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.45, ease: easeIn } },
};

// ── Reduced motion: one calm crossfade, same 5s rhythm ───────────
const fadeStage = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: 'linear' } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: 'linear' } },
};

export default function BodoniText({
  phrases,
  kicker,
  title,
  sub,
  font = 'jost',
  cycle = 5000,
  align = 'left',
  ready = true,
  loop = true,
}) {
  const reduced = useReducedMotion();
  const set = FONT_SETS[font] || FONT_SETS.jost;

  // Normalise to a list; a single phrase loops (comes and goes) in place.
  const list = phrases?.length ? phrases : [{ kicker, title, sub }];

  const [n, setN] = useState(0);
  const controls = useAnimationControls();

  // One window = enter → hold → exit → breath. Framer controls drive the phrase
  // in ('show'), then out ('exit') ~0.9s before the boundary; at the boundary
  // `n` advances, the element re-keys, and the next phrase enters. Driving via
  // controls (an external system) keeps React state out of the effect body.
  useEffect(() => {
    if (!ready) return undefined;
    controls.start('show');

    const last = n >= list.length - 1;
    if (!loop && last) return undefined; // play-once: hold the final phrase

    const EXIT = reduced ? 520 : 750;
    const GAP = 150;
    const exitAt = setTimeout(() => controls.start('exit'), Math.max(0, cycle - EXIT - GAP));
    const advance = setTimeout(() => setN((v) => (v + 1) % list.length), cycle);
    return () => { clearTimeout(exitAt); clearTimeout(advance); };
  }, [n, ready, cycle, loop, reduced, list.length, controls]);

  const slide = list[n % list.length];
  const words = String(slide.title || '').split(' ').filter(Boolean);
  const stageVariants = reduced ? fadeStage : stage;
  const rootStyle = {
    '--bmx-display': DISPLAY,
    '--bmx-accent': set.accent,
    textAlign: align,
    alignItems: align === 'center' ? 'center' : 'flex-start',
  };

  return (
    <div className="bmx-root" style={rootStyle} aria-live="polite">
      {/* Re-keyed on `n` so each phrase remounts fresh at "hidden"; `controls`
          then plays it in and (before the boundary) out. */}
      <motion.div
        key={n}
        className="bmx-slide"
        variants={stageVariants}
        initial="hidden"
        animate={controls}
      >
        {slide.kicker && (
          <motion.div
            className="bmx-kicker"
            variants={reduced ? undefined : kickerV}
            custom={set.accentTrack}
            style={{ fontWeight: set.accentWeight, letterSpacing: reduced ? set.accentTrack : undefined }}
          >
            {slide.kicker}
          </motion.div>
        )}

        {reduced ? (
          <h2 className="bmx-title"><span>{slide.title}</span></h2>
        ) : (
          <motion.h2 className="bmx-title" variants={headV}>
            {words.map((w, i) => (
              <span className="bmx-word" key={`${n}-${i}`}>
                <motion.span className="bmx-word-inner" variants={wordV}>{w}</motion.span>
              </span>
            ))}
          </motion.h2>
        )}

        <motion.div
          className="bmx-rule"
          variants={reduced ? undefined : ruleV}
          style={{ transformOrigin: align === 'center' ? 'center' : 'left' }}
          aria-hidden
        >
          <span className="bmx-diamond" />
        </motion.div>

        {slide.sub && (
          <motion.p className="bmx-sub" variants={reduced ? undefined : subV}>
            {slide.sub}
          </motion.p>
        )}
      </motion.div>

      <style>{`
        .bmx-root { position: relative; width: 100%; display: flex; flex-direction: column; }
        /* One phrase on stage at a time; re-keyed remount swaps it in place. */
        .bmx-slide {
          display: flex; flex-direction: column;
          align-items: inherit;
          gap: clamp(14px, 2.2vh, 26px);
        }

        .bmx-kicker {
          font-family: var(--bmx-accent);
          text-transform: uppercase;
          font-size: clamp(0.72rem, 1.05vw, 0.92rem);
          color: var(--cine-gold, #D4AF6A);
          text-shadow: 0 1px 14px rgba(0,0,0,0.45);
        }

        .bmx-title {
          margin: 0;
          display: flex; flex-wrap: wrap;
          justify-content: inherit; align-items: flex-end;
          gap: 0.02em 0.26em;
          font-family: var(--bmx-display);
          font-weight: 600;
          font-optical-sizing: auto;   /* let Bodoni's opsz thin the hairlines at size */
          line-height: 1.0;
          letter-spacing: 0.005em;
          font-size: clamp(2.6rem, 7.2vw, 6.8rem);
        }
        /* Masked word rise: wrapper clips, inner glyphs slide up into it.
           Bottom padding protects descenders (g, y, J). */
        .bmx-word { display: block; overflow: hidden; padding-bottom: 0.16em; }

        /* The gilding lives on the glyph-bearing element (word-inner, or the
           single span in the reduced-motion fallback) — background-clip:text
           only works where the text actually is. Two layers: a moving specular
           sheen over a static ivory→champagne engrave, both clipped to the text. */
        .bmx-word-inner,
        .bmx-title > span {
          display: block;
          will-change: transform;
          background-image:
            linear-gradient(105deg, transparent 42%,
              rgba(var(--cine-gold-hi-rgb, 236,217,168), 0.75) 50%, transparent 58%),
            linear-gradient(178deg,
              var(--cine-ivory, #F7EFE7) 0%,
              var(--cine-ivory, #F7EFE7) 50%,
              var(--cine-gold-hi, #ECD9A8) 76%,
              var(--cine-gold, #D4AF6A) 100%);
          background-size: 220% 100%, 100% 100%;
          background-position: 160% 0, 0 0;
          background-repeat: no-repeat;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: bmx-sheen 5s ease-in-out infinite;
        }
        /* Sweep only the sheen layer (2nd position kept at 0 0). */
        @keyframes bmx-sheen {
          0%, 24%  { background-position: 160% 0, 0 0; }
          52%      { background-position: 38% 0, 0 0; }
          80%, 100% { background-position: -80% 0, 0 0; }
        }

        .bmx-rule {
          position: relative;
          width: min(300px, 52vw); height: 1px;
          background: linear-gradient(90deg,
            transparent, rgba(var(--cine-gold-rgb, 212,175,106), 0.85), transparent);
        }
        .bmx-diamond {
          position: absolute; top: 50%; left: 50%;
          width: 7px; height: 7px; transform: translate(-50%, -50%) rotate(45deg);
          background: var(--cine-gold, #D4AF6A);
          box-shadow: 0 0 12px rgba(var(--cine-gold-rgb, 212,175,106), 0.7);
        }

        .bmx-sub {
          margin: 0;
          font-family: var(--bmx-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(1.05rem, 2vw, 1.6rem);
          line-height: 1.55;
          color: var(--cine-ivory, #F7EFE7);
          text-shadow: 0 2px 20px rgba(0,0,0,0.5);
          max-width: 34ch;
        }

        @media (prefers-reduced-motion: reduce) {
          .bmx-word-inner, .bmx-title > span {
            animation: none; background-position: 0 0, 0 0;
          }
        }
      `}</style>
    </div>
  );
}
