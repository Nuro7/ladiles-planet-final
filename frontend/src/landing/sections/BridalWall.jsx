import { useCallback, useRef, useState } from 'react';
import Reveal from '../primitives/Reveal';
import { VIDEOS, IMG } from '../data';

/**
 * Section 4 — the Bridal Wall. A cinematic "LED screen" where the visitor
 * drags a handle to reveal the AI transformation live: an ordinary portrait
 * on the left resolves into a luxury bridal frame on the right.
 * Draggable by pointer + keyboard (arrow keys on the handle).
 */
export default function BridalWall() {
  const screenRef = useRef(null);
  const [pct, setPct] = useState(52);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX) => {
    const el = screenRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.min(98, Math.max(2, p)));
  }, []);

  const onPointerDown = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e) => { if (dragging.current) setFromClientX(e.clientX); };
  const onPointerUp = () => { dragging.current = false; };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') setPct((p) => Math.max(2, p - 4));
    if (e.key === 'ArrowRight') setPct((p) => Math.min(98, p + 4));
  };

  return (
    <section className="cine-section" style={{ position: 'relative', background: 'var(--cine-bg)' }}>
      <div className="cine-container">
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vh,72px)' }}>
          <Reveal variant="up"><span className="cine-eyebrow">Live Transformation</span></Reveal>
          <Reveal variant="up" delay={0.1}>
            <h2 style={{ fontSize: 'clamp(2.2rem,5.5vw,4.6rem)', marginTop: 14 }}>
              The <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Bridal Wall</em>
            </h2>
          </Reveal>
          <Reveal variant="up" delay={0.2}>
            <p style={{ maxWidth: '44ch', margin: '18px auto 0', color: 'rgba(var(--cine-ivory-rgb),0.66)' }}>
              Drag to watch a single photograph become a luxury bridal frame — in real time.
            </p>
          </Reveal>
        </div>

        <Reveal variant="scale" duration={1.1}>
          <div className="cine-led-bezel">
            <div
              ref={screenRef}
              className="cine-led"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {/* BEFORE — plain portrait */}
              <div className="cine-led-layer cine-led-before">
                <img src={IMG.bride2} alt="Original portrait, before AI styling" />
                <span className="cine-led-tag cine-led-tag-l">Before</span>
              </div>

              {/* AFTER — styled bridal, clipped from the left edge to `pct` */}
              <div className="cine-led-layer cine-led-after"
                style={{ clipPath: `inset(0 0 0 ${pct}%)` }}>
                <img src={VIDEOS.wall.poster} alt="AI-styled bridal frame, after transformation" />
                <span className="cine-led-scan" />
                <span className="cine-led-tag cine-led-tag-r">After</span>
              </div>

              {/* Handle */}
              <button
                className="cine-led-handle"
                style={{ left: `${pct}%` }}
                onKeyDown={onKey}
                aria-label="Drag to compare before and after"
                aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} role="slider"
                data-cursor="hover"
              >
                <span className="cine-led-grip">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 6 4 12l5 6M15 6l5 6-5 6" stroke="var(--cine-wine-5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>

              <span className="cine-led-glow" aria-hidden />
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        .cine-led-bezel {
          position: relative; max-width: 1080px; margin: 0 auto; padding: clamp(10px,1.4vw,18px);
          border-radius: 26px; background: linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
          border: 1px solid var(--cine-glass-border);
          box-shadow: 0 50px 120px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .cine-led {
          position: relative; border-radius: 22px; overflow: hidden;
          aspect-ratio: 16 / 9; touch-action: none; user-select: none;
          background: var(--cine-wine-5); cursor: ew-resize;
        }
        .cine-led-layer { position: absolute; inset: 0; }
        .cine-led-layer img { width: 100%; height: 100%; object-fit: cover; }
        .cine-led-before img { filter: grayscale(0.9) brightness(0.62) contrast(1.02); }
        .cine-led-after img { filter: saturate(1.08) contrast(1.05); }
        .cine-led-after::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(120% 90% at 70% 30%, rgba(var(--cine-gold-rgb),0.16), transparent 60%);
        }
        .cine-led-scan {
          position: absolute; top: 0; bottom: 0; left: 0; width: 3px;
          background: linear-gradient(to bottom, transparent, var(--cine-gold), transparent);
          box-shadow: 0 0 24px 6px rgba(var(--cine-gold-rgb),0.6); opacity: 0.9;
          left: 0; animation: cine-scanmove 4s ease-in-out infinite; display: none;
        }
        .cine-led-tag {
          position: absolute; bottom: 18px; font-family: var(--cine-sans);
          font-size: 0.7rem; letter-spacing: 0.24em; text-transform: uppercase;
          padding: 7px 14px; border-radius: 100px; backdrop-filter: blur(10px);
          background: rgba(var(--cine-wash-rgb),0.5); border: 1px solid var(--cine-glass-border); color: var(--cine-ivory);
        }
        .cine-led-tag-l { left: 18px; }
        .cine-led-tag-r { right: 18px; color: var(--cine-gold); border-color: rgba(var(--cine-gold-rgb),0.4); }

        .cine-led-handle {
          position: absolute; top: 0; bottom: 0; width: 2px; transform: translateX(-50%);
          background: linear-gradient(to bottom, transparent, var(--cine-gold), transparent);
          box-shadow: 0 0 30px rgba(var(--cine-gold-rgb),0.7); z-index: 4; padding: 0;
        }
        .cine-led-grip {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center;
          background: linear-gradient(135deg,#ECD9A8,#BE9352); box-shadow: 0 8px 30px rgba(var(--cine-gold-rgb),0.55);
          transition: transform 0.3s var(--cine-ease);
        }
        .cine-led-handle:hover .cine-led-grip { transform: translate(-50%,-50%) scale(1.12); }
        .cine-led-glow {
          position: absolute; inset: -2px; border-radius: 24px; pointer-events: none;
          box-shadow: inset 0 0 60px rgba(var(--cine-gold-rgb),0.08);
        }
        @keyframes cine-scanmove { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>
    </section>
  );
}
