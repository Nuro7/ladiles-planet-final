import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import './filmPlayer.css';

const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function FilmPlayer({ src, title = 'Bridal film', onError, autoPlay = false }) {
  const shell = useRef(null);
  const video = useRef(null);
  const backdrop = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [ratio, setRatio] = useState(9 / 16);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handle = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', handle);
    return () => document.removeEventListener('fullscreenchange', handle);
  }, []);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, [src]);

  function syncBackdrop() {
    if (video.current && backdrop.current && Math.abs(backdrop.current.currentTime - video.current.currentTime) > 0.15) {
      backdrop.current.currentTime = video.current.currentTime;
    }
  }

  async function toggle() {
    if (!video.current) return;
    if (video.current.paused) {
      try { await video.current.play(); } catch { /* Keep the player visible if autoplay is blocked. */ }
    } else video.current.pause();
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement === shell.current) await document.exitFullscreen();
    else await shell.current?.requestFullscreen?.();
  }

  return <div ref={shell} className="bridal-film-player" style={{ '--film-ratio': ratio }}>
    <div className="bridal-film-player__stage">
      <video ref={backdrop} src={src} className="bridal-film-player__backdrop" muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
      <div className="bridal-film-player__vignette" />
      <div className="bridal-film-player__portrait-frame">
        <video ref={video} src={src} className="bridal-film-player__main" playsInline preload="metadata" autoPlay={autoPlay}
          aria-label={title} onError={onError}
          onLoadedMetadata={event => {
            const element = event.currentTarget;
            setDuration(element.duration || 0);
            if (element.videoWidth && element.videoHeight) setRatio(element.videoWidth / element.videoHeight);
          }}
          onTimeUpdate={event => { setTime(event.currentTarget.currentTime); syncBackdrop(); }}
          onPlay={() => { setPlaying(true); syncBackdrop(); backdrop.current?.play().catch(() => {}); }}
          onPause={() => { setPlaying(false); backdrop.current?.pause(); }}
          onEnded={() => { setPlaying(false); backdrop.current?.pause(); }}
          onClick={toggle} />
      </div>
    </div>
    <div className="bridal-film-player__controls">
      <button type="button" aria-label={playing ? 'Pause film' : 'Play film'} onClick={toggle}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <span className="bridal-film-player__time">{clock(time)} / {clock(duration)}</span>
      <input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(time, duration || 1)}
        aria-label="Seek film" onChange={event => { if (video.current) { video.current.currentTime = Number(event.target.value); syncBackdrop(); } }} />
      <button type="button" aria-label={muted ? 'Unmute film' : 'Mute film'} onClick={() => setMuted(value => {
        if (video.current) video.current.muted = !value;
        return !value;
      })}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      <button type="button" aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
    </div>
  </div>;
}
