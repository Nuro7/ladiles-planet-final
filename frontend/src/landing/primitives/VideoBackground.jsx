import { useEffect, useRef, useState } from 'react';
import useBreakpoint from '../../hooks/useBreakpoint';

/**
 * Cinematic background layer. Renders a rich poster (image + gradient) that is
 * always beautiful, then lazily fades in a muted, looping, seamless <video>
 * *on top* once the section nears the viewport and the file actually plays.
 *
 * If no `src` is supplied — or the file is missing / fails to decode — the
 * poster simply stays. Drop real MP4s into /public/videos and they light up
 * automatically. Nothing here ever shows a broken-video state.
 *
 * Props:
 *   src        string | string[]  — one or more source URLs (webm first, mp4 fallback)
 *   poster     string             — image shown beneath / before the video
 *   posterPosition string         — object-position for the poster & video
 *   overlay    'left'|'bottom'|'center'|'vignette'|'none'  — legibility wash
 *   tint       number             — 0..1 extra darkness
 *   kenBurns   boolean            — slow zoom on the poster (used when no video)
 *   eager      boolean            — skip the IntersectionObserver and load at once
 *                                   (used by the always-on TV/signage hero so both
 *                                    clips are warm from the first frame)
 */
export default function VideoBackground({
  src,
  poster,
  posterPosition = 'center',
  overlay = 'bottom',
  tint = 0,
  kenBurns = true,
  eager = false,
  active = true,
  loop = true,
  onEnded,
  className,
  style,
  children,
}) {
  const hostRef = useRef(null);
  const videoRef = useRef(null);
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const [near, setNear] = useState(eager);
  const [playing, setPlaying] = useState(false);
  const sources = Array.isArray(src) ? src : src ? [src] : [];

  const resolvedSources = sources.map((s) => {
    if (isMobile) {
      if (s === '/api/video?id=1eF-lRp7i1bfLAUXSus89I_AkwUEUifD1')
        return '/api/video?id=1dOInq0yUq9TOnny82NWNztNwVuy6KOrW';
      if (s === '/api/video?id=1pgD5n8c-WMb1ujBrTsanncQaTPzY8Ifk')
        return '/api/video?id=14pV_NRMlsjBB_QSG32QUGSeTd9iv4Td-';
      if (s === '/api/video?id=1L582RHeSPVYg13LrGS149e-rpU5LvAEk')
        return '/api/video?id=17engzF5_ScEQuvNWi5lApGletLONR19t';
    }
    return s;
  });

  // Keep the latest onEnded in a ref so the `ended` listener (attached once per
  // mount below) never has to re-subscribe when the callback identity changes.
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; });

  // Only mount / load the video when the section is close to view.
  // `eager` callers are already `near` from mount, so skip the observer.
  useEffect(() => {
    if (eager || !resolvedSources.length || !hostRef.current) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } },
      { rootMargin: '400px' }
    );
    io.observe(hostRef.current);
    return () => io.disconnect();
  }, [resolvedSources.length, eager]);

  // Effect A — listeners only. `playing` is a one-way latch (poster fades out
  // once and the video stays visible), so only `error` ever clears it.
  useEffect(() => {
    if (!near || !videoRef.current) return;
    const v = videoRef.current;
    const onPlay = () => setPlaying(true);
    const onErr = () => setPlaying(false);
    const onEnd = () => { if (onEndedRef.current) onEndedRef.current(); };
    v.addEventListener('playing', onPlay);
    v.addEventListener('error', onErr, true);
    v.addEventListener('ended', onEnd); // inert while loop=true
    return () => {
      v.removeEventListener('playing', onPlay);
      v.removeEventListener('error', onErr, true);
      v.removeEventListener('ended', onEnd);
    };
  }, [near]);

  // Effect B — play/pause driver. When a layer becomes active it restarts from
  // frame 0 and plays; when it goes off-stage it pauses (but stays buffered, so
  // the next crossfade is instant). Runs only on the near/active transition.
  useEffect(() => {
    if (!near || !videoRef.current) return;
    const v = videoRef.current;
    if (active) {
      try { v.currentTime = 0; } catch { /* not seekable yet — harmless */ }
      const p = v.play?.();
      if (p?.catch) p.catch(() => {}); // ignore autoplay/AbortError (poster remains)
    } else {
      v.pause?.();
    }
  }, [near, active]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--cine-wine-5)', ...style }}
      aria-hidden="true"
    >
      {/* Poster layer — always present */}
      {poster && (
        <img
          src={poster}
          alt=""
          className={kenBurns ? 'cine-vbg-poster cine-kenburns' : 'cine-vbg-poster'}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: posterPosition,
            opacity: playing ? 0 : 1, transition: 'opacity 1.1s ease',
          }}
        />
      )}

      {/* Video layer — lazy, muted, looping */}
      {near && resolvedSources.length > 0 && (
        <video
          key={resolvedSources.join(',')}
          ref={videoRef}
          muted
          loop={loop}
          playsInline
          autoPlay={active}
          preload="auto"
          poster={poster}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: posterPosition,
            opacity: playing ? 1 : 0, transition: 'opacity 1.1s ease',
          }}
        >
          {resolvedSources.map((s) => {
            const type = s.endsWith('.webm') ? 'video/webm'
              : s.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
            return <source key={s} src={s} type={type} />;
          })}
        </video>
      )}

      {/* Legibility wash */}
      {overlay !== 'none' && (
        <span className="cine-video-wash" style={{ background: WASH[overlay] || WASH.bottom }} />
      )}
      {tint > 0 && (
        <span style={{ position: 'absolute', inset: 0, background: `rgba(var(--cine-wash-rgb),${tint})`, zIndex: 2 }} />
      )}

      {children}

      <style>{`
        @keyframes cine-kenburns { 0%{transform:scale(1.02) translate(0,0)} 100%{transform:scale(1.14) translate(-1.5%,-1.5%)} }
        .cine-kenburns { animation: cine-kenburns 22s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce){ .cine-kenburns{ animation: none !important; } }
      `}</style>
    </div>
  );
}

const WASH = {
  left:
    'linear-gradient(96deg, rgba(var(--cine-wash-rgb),0.94) 2%, rgba(var(--cine-wash-rgb),0.62) 40%, rgba(var(--cine-wash-rgb),0.14) 72%, transparent 100%),' +
    'linear-gradient(to bottom, rgba(var(--cine-wash-rgb),0.4) 0%, transparent 30%, transparent 60%, rgba(var(--cine-wash-rgb),0.6) 100%)',
  bottom:
    'linear-gradient(to bottom, rgba(var(--cine-wash-rgb),0.55) 0%, rgba(var(--cine-wash-rgb),0.12) 30%, rgba(var(--cine-wash-rgb),0.2) 62%, rgba(var(--cine-wash-rgb),0.9) 100%)',
  center:
    'radial-gradient(120% 90% at 50% 50%, transparent 30%, rgba(var(--cine-wash-rgb),0.7) 100%)',
  vignette:
    'radial-gradient(130% 100% at 50% 40%, transparent 42%, rgba(var(--cine-wash-rgb),0.55) 78%, rgba(var(--cine-wash-rgb),0.92) 100%)',
};
