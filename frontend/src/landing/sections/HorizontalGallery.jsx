import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from '../primitives/Reveal';
import useReducedMotion from '../hooks/useReducedMotion';
import useBreakpoint from '../../hooks/useBreakpoint';
import { GALLERY } from '../data';

gsap.registerPlugin(ScrollTrigger);

/** A card that swaps to an autoplaying muted loop on hover; poster otherwise. */
function GalleryCard({ item }) {
  const vidRef = useRef(null);
  const [hover, setHover] = useState(false);

  const onEnter = () => {
    setHover(true);
    const v = vidRef.current;
    if (v) { const p = v.play?.(); if (p?.catch) p.catch(() => {}); }
  };
  const onLeave = () => {
    setHover(false);
    vidRef.current?.pause?.();
  };

  return (
    <article
      className="cine-gcard cine-sweep-host"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      data-cursor="hover"
    >
      <div className="cine-gcard-media">
        <img src={item.poster} alt={item.title} className="cine-gcard-img"
          style={{ opacity: hover ? 0 : 1 }} loading="lazy" />
        <video ref={vidRef} muted loop playsInline preload="none" poster={item.poster}
          className="cine-gcard-vid" style={{ opacity: hover ? 1 : 0 }}>
          <source src={item.video} type="video/mp4" />
        </video>
        <span className="cine-gcard-wash" />
      </div>
      <div className="cine-gcard-meta">
        <span className="cine-eyebrow" style={{ color: 'var(--cine-gold)' }}>{item.tag}</span>
        <h3 style={{ fontSize: '1.7rem', marginTop: 8, color: '#fff' }}>{item.title}</h3>
      </div>
    </article>
  );
}

/**
 * Section 2 — pinned horizontal gallery. Scroll drives a horizontal reveal of
 * oversized luxury cards. Under reduced motion it becomes a native swipe row.
 */
export default function HorizontalGallery() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const reduced = useReducedMotion();
  const isMobile = useBreakpoint() === 'mobile';
  // On phones (and reduced-motion) use the native swipe row, not GSAP scroll-jack.
  const lite = reduced || isMobile;

  useEffect(() => {
    if (lite) return;
    const track = trackRef.current;
    const section = sectionRef.current;
    if (!track || !section) return;

    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + distance(),
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, [lite]);

  return (
    <section id="cine-gallery" ref={sectionRef}
      style={{ position: 'relative', background: 'var(--cine-bg)', overflow: 'hidden' }}>

      <div className="cine-container" style={{ paddingTop: 'clamp(80px,10vh,120px)', paddingBottom: 40 }}>
        <Reveal variant="up">
          <span className="cine-eyebrow">The Gallery</span>
        </Reveal>
        <Reveal variant="up" delay={0.1}>
          <h2 style={{ fontSize: 'clamp(2.2rem,5vw,4.4rem)', marginTop: 14, maxWidth: '16ch' }}>
            A Collection Rendered <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>in Light</em>
          </h2>
        </Reveal>
      </div>

      <div className={lite ? 'cine-gtrack cine-gtrack-native' : 'cine-gtrack-pin'}
        style={lite ? undefined : { minHeight: '100svh', display: 'flex', alignItems: 'center' }}>
        <div ref={trackRef} className="cine-gtrack" style={lite ? undefined : { willChange: 'transform' }}>
          {GALLERY.map((item) => <GalleryCard key={item.id} item={item} />)}
          <div className="cine-gcta" aria-hidden={false}>
            <span className="cine-eyebrow" style={{ color: 'var(--cine-gold)' }}>And every look</span>
            <h3 style={{ fontSize: '2.4rem', margin: '10px 0 0', lineHeight: 1.05 }}>Made only<br />for you</h3>
          </div>
        </div>
      </div>

      <style>{`
        .cine-gtrack { display: flex; gap: clamp(20px,2.4vw,40px); padding: 0 clamp(22px,5vw,72px); }
        .cine-gtrack-native { overflow-x: auto; scroll-snap-type: x mandatory;
          padding-bottom: 40px; -webkit-overflow-scrolling: touch; }
        .cine-gtrack-native .cine-gcard { scroll-snap-align: center; }

        .cine-gcard {
          position: relative; flex: 0 0 auto;
          width: clamp(280px, 34vw, 520px); height: clamp(420px, 66vh, 680px);
          border-radius: 20px; overflow: hidden;
          border: 1px solid var(--cine-glass-border);
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        }
        .cine-gcard-media { position: absolute; inset: 0; }
        .cine-gcard-img, .cine-gcard-vid {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; transition: opacity 0.6s ease, transform 1.1s var(--cine-ease);
        }
        .cine-gcard:hover .cine-gcard-img, .cine-gcard:hover .cine-gcard-vid { transform: scale(1.06); }
        .cine-gcard-wash { position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(var(--cine-wash-rgb),0.85) 6%, transparent 46%); }
        .cine-gcard-meta { position: absolute; left: 26px; bottom: 26px; z-index: 2; }

        .cine-gcta {
          flex: 0 0 auto; width: clamp(260px, 30vw, 420px);
          height: clamp(420px, 66vh, 680px);
          display: flex; flex-direction: column; justify-content: center;
          padding-left: 12px;
        }
        @media (prefers-reduced-motion: reduce){
          .cine-gcard:hover .cine-gcard-img, .cine-gcard:hover .cine-gcard-vid { transform: none; }
        }
      `}</style>
    </section>
  );
}
