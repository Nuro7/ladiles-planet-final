import { useRef, useState } from 'react';
import Reveal from '../primitives/Reveal';
import { FILMS } from '../data';

function FilmCard({ film }) {
  const vidRef = useRef(null);
  const [hover, setHover] = useState(false);
  const onEnter = () => { setHover(true); const p = vidRef.current?.play?.(); if (p?.catch) p.catch(() => {}); };
  const onLeave = () => { setHover(false); vidRef.current?.pause?.(); };

  return (
    <article className="cine-film" onMouseEnter={onEnter} onMouseLeave={onLeave} data-cursor="hover">
      <div className="cine-film-media">
        <img src={film.poster} alt={film.title} loading="lazy" style={{ opacity: hover ? 0 : 1 }} />
        <video ref={vidRef} muted loop playsInline preload="none" poster={film.poster} style={{ opacity: hover ? 1 : 0 }}>
          <source src={film.video} type="video/mp4" />
        </video>
        <span className="cine-film-grad" />
        <span className="cine-film-play"><svg width="16" height="16" viewBox="0 0 12 12"><path d="M2 1.5v9l8-4.5z" fill="currentColor"/></svg></span>
        <span className="cine-film-run">{film.runtime}</span>
      </div>
      <h3 className="cine-film-title">{film.title}</h3>
    </article>
  );
}

/**
 * Section 6 — Bridal Films. A Netflix-style rail: cards enlarge on hover and
 * auto-preview a muted loop. Arrow controls glide the rail; native swipe on touch.
 */
export default function BridalFilms() {
  const railRef = useRef(null);
  const scrollBy = (dir) => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  return (
    <section className="cine-section" style={{ position: 'relative', background: 'var(--cine-bg)' }}>
      <div className="cine-container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 'clamp(30px,5vh,54px)' }}>
        <div>
          <Reveal variant="up"><span className="cine-eyebrow">Bridal Films</span></Reveal>
          <Reveal variant="up" delay={0.1}>
            <h2 style={{ fontSize: 'clamp(2.2rem,5.5vw,4.6rem)', marginTop: 14, maxWidth: '14ch' }}>
              Cinema, <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Made Personal</em>
            </h2>
          </Reveal>
        </div>
        <div className="cine-film-nav">
          <button onClick={() => scrollBy(-1)} aria-label="Previous films" data-cursor="hover"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <button onClick={() => scrollBy(1)} aria-label="Next films" data-cursor="hover"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>
      </div>

      <div ref={railRef} className="cine-film-rail">
        {FILMS.map((f) => <FilmCard key={f.id} film={f} />)}
      </div>

      <style>{`
        .cine-film-nav { display: flex; gap: 12px; }
        .cine-film-nav button { width: 48px; height: 48px; border-radius: 50%;
          display: grid; place-items: center; color: var(--cine-ivory);
          background: var(--cine-glass-bg); border: 1px solid var(--cine-glass-border);
          transition: border-color 0.3s ease, color 0.3s ease; }
        .cine-film-nav button:hover { border-color: rgba(var(--cine-gold-rgb),0.6); color: var(--cine-gold); }

        .cine-film-rail {
          display: flex; gap: clamp(16px,1.6vw,26px); overflow-x: auto;
          padding: 20px clamp(22px,5vw,72px) 30px;
          scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .cine-film-rail::-webkit-scrollbar { display: none; }
        .cine-film {
          flex: 0 0 auto; width: clamp(260px, 30vw, 420px); scroll-snap-align: start;
          transition: transform 0.5s var(--cine-ease); transform-origin: center;
        }
        .cine-film:hover { transform: scale(1.05); z-index: 3; }
        .cine-film-media {
          position: relative; aspect-ratio: 16/10; border-radius: 22px; overflow: hidden;
          border: 1px solid var(--cine-glass-border); box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .cine-film-media img, .cine-film-media video {
          position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
          transition: opacity 0.5s ease;
        }
        .cine-film-grad { position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(var(--cine-wash-rgb),0.7), transparent 55%); }
        .cine-film-play {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.8);
          width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center;
          color: var(--cine-wine-5); background: linear-gradient(140deg, #ECD9A8, #D4AF6A 55%, #8E6A3C);
          box-shadow: 0 8px 26px rgba(var(--cine-gold-rgb),0.45); opacity: 0;
          transition: opacity 0.4s ease, transform 0.4s var(--cine-ease); }
        .cine-film:hover .cine-film-play { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        .cine-film-run { position: absolute; right: 12px; top: 12px; font-family: var(--cine-sans);
          font-size: 0.68rem; letter-spacing: 0.16em; padding: 5px 10px; border-radius: 100px;
          background: rgba(var(--cine-wash-rgb),0.55); backdrop-filter: blur(8px); color: var(--cine-ivory); }
        .cine-film-title { font-size: 1.35rem; margin-top: 16px; color: #fff; }
      `}</style>
    </section>
  );
}
