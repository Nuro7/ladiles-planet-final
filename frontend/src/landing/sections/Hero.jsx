import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import VideoBackground from '../primitives/VideoBackground';
import ParticleField from '../primitives/ParticleField';
import MagneticButton from '../primitives/MagneticButton';
import HeroSlides from './HeroSlides';
import useReducedMotion from '../hooks/useReducedMotion';
import useBreakpoint from '../../hooks/useBreakpoint';
import { SIGNAGE_BG } from '../data';

const Arrow = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ease = [0.16, 1, 0.3, 1];
// Watchdog only: if the active clip stalls / is missing / fails to decode, the
// `ended` event never fires. This must sit safely above the longest clip (~9s)
// plus the crossfade, so in the healthy case `ended` always wins the race.
const STALL_MS = 14000;

/**
 * Full-bleed cinematic hero, built for an always-on TV: the background film plays
 * each clip through once and advances to the next the instant it ENDS (see the
 * `onEnded` wiring below), with each clip paired 1:1 to its chaptered slide
 * (index → SIGNAGE_BG[index] / SIGNAGE_SLIDES[index]). `ready` gates the first
 * reveal so it plays as the loader lifts.
 */
export default function Hero({ ready }) {
  const reduced = useReducedMotion();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const [index, setIndex] = useState(0);
  const activeLayer = index % SIGNAGE_BG.length;

  // Single advance step — drives both the film and the text (functional update,
  // so the two callers (video `ended` + watchdog) never read a stale index).
  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % SIGNAGE_BG.length);
  }, []);

  // Watchdog so the always-on signage never freezes. Re-armed on every index
  // change; a real `ended` advances `index` first, whose cleanup clears this
  // pending timer — so it never double-advances in the healthy case.
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(advance, STALL_MS);
    return () => clearTimeout(id);
  }, [index, ready, advance]);

  // Buttons stay static beneath the rotating copy; only fade in once as the loader lifts.
  const btnFade = reduced ? { initial: false } : ({
    initial: { opacity: 0, y: 22 },
    animate: ready ? { opacity: 1, y: 0 } : {},
    transition: { duration: 1.1, delay: 1.1, ease },
  });

  return (
    <section
      id="cine-top"
      style={{
        position: 'relative', minHeight: '100svh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      {/* Cinematic film — all clips stacked and eager (buffered) so the swap is
          instant with no black flash. Only the active layer plays; when it ENDS
          it fires `advance`, the next layer restarts from frame 0, and the two
          crossfade by opacity. */}
      <div style={{ position: 'absolute', inset: '-4%', zIndex: 0, transform: 'scale(1.05)' }}>
        {SIGNAGE_BG.map((bg, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', inset: 0,
              opacity: activeLayer === i ? 1 : 0,
              transition: `opacity ${reduced ? 0.4 : 1.2}s ease`,
            }}
          >
            <VideoBackground
              src={bg.src}
              poster={bg.poster}
              posterPosition="50% 22%"
              overlay="none"
              kenBurns={false}
              eager
              active={activeLayer === i}
              loop={false}
              onEnded={advance}
            />
          </div>
        ))}

        {/* Legibility wash — weighted to the left where the copy sits */}
        <span aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background:
            'linear-gradient(96deg, rgba(var(--cine-wash-rgb),0.92) 0%, rgba(var(--cine-wash-rgb),0.62) 36%, rgba(var(--cine-wash-rgb),0.16) 68%, transparent 100%),' +
            'linear-gradient(to bottom, rgba(var(--cine-wash-rgb),0.40) 0%, transparent 24%, transparent 60%, rgba(var(--cine-wash-rgb),0.55) 100%)',
        }} />
      </div>

      {/* Volumetric light — champagne key light (upper right) over an ember (lower left).
          Drifts slowly on its own; no longer chases the pointer. */}
      <span aria-hidden className="cine-hero-glow-a" style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '58vw', height: '58vw',
        background: 'radial-gradient(circle, rgba(var(--cine-gold-rgb),0.22), transparent 62%)',
        filter: 'blur(34px)', zIndex: 1, pointerEvents: 'none',
      }} />
      <span aria-hidden className="cine-hero-glow-b" style={{
        position: 'absolute', bottom: '-24%', left: '-12%', width: '54vw', height: '54vw',
        background: 'radial-gradient(circle, rgba(var(--cine-glow-rgb),0.38), transparent 60%)',
        filter: 'blur(40px)', zIndex: 1, pointerEvents: 'none',
      }} />

      <ParticleField style={{ zIndex: 2 }} density={0.00010} maxOpacity={0.6} />
      <span className="cine-grain" aria-hidden />

      {/* Content — left-anchored column, read from across the room */}
      <div className="cine-container" style={{ position: 'relative', zIndex: 4, width: '100%' }}>
        <div style={{
          maxWidth: 'min(820px, 92vw)',
          textAlign: isMobile ? 'center' : 'left',
          margin: isMobile ? '0 auto' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          <HeroSlides index={index} reduced={reduced} ready={ready} />

          <motion.div {...btnFade} style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            width: '100%',
            gap: 18,
            justifyContent: isMobile ? 'center' : 'flex-start',
            marginTop: 'clamp(30px, 4.4vh, 52px)',
          }}>
            <MagneticButton to="/studio" className="cine-btn cine-btn-gold cine-sweep-host" style={{
              justifyContent: 'center',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? '340px' : 'none',
            }}>
              Enter Studio <Arrow />
            </MagneticButton>

            <MagneticButton to="/studio" className="cine-btn cine-btn-ghost" style={{
              justifyContent: 'center',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? '340px' : 'none',
            }}>
              <span className="cine-play" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1.5v9l8-4.5z" fill="currentColor" /></svg>
              </span>
              Watch Experience
            </MagneticButton>
          </motion.div>
        </div>
      </div>

      <style>{`
        /* Ambient light drift — slow, autonomous, pointer-independent */
        @keyframes cine-drift-a { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(10px,-14px,0)} }
        @keyframes cine-drift-b { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(-12px,10px,0)} }
        .cine-hero-glow-a { animation: cine-drift-a 22s ease-in-out infinite; }
        .cine-hero-glow-b { animation: cine-drift-b 27s ease-in-out infinite; }

        .cine-play {
          display: inline-grid; place-items: center; width: 26px; height: 26px;
          border-radius: 50%; border: 1px solid rgba(var(--cine-gold-rgb),0.7);
          color: var(--cine-gold); position: relative;
        }
        .cine-play::before {
          content: ''; position: absolute; inset: -1px; border-radius: 50%;
          border: 1px solid rgba(var(--cine-gold-rgb),0.5); animation: cine-ping 2.4s ease-out infinite;
        }
        @keyframes cine-ping { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.9);opacity:0} }

        @media (prefers-reduced-motion: reduce){
          .cine-hero-glow-a, .cine-hero-glow-b, .cine-play::before { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
