import { useRef, useState, useEffect, useCallback } from 'react';
import {
    Play, Pause, Download, Share2,
    Volume2, VolumeX, Maximize2, Minimize2,
    Shield, CheckCircle, RotateCcw,
} from 'lucide-react';

const fmt = (s) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

const IconBtn = ({ onClick, children, title }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.8)', padding: '4px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s', borderRadius: 6, flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#FFF'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
    >
        {children}
    </button>
);

const VideoPlayer = ({ video }) => {
    const videoRef     = useRef(null);
    const backdropRef  = useRef(null);
    const containerRef = useRef(null);
    const seekRef      = useRef(null);
    const hideTimer    = useRef(null);

    const [isPlaying,    setIsPlaying]    = useState(false);
    const [isMuted,      setIsMuted]      = useState(false);
    const [volume,       setVolume]       = useState(1);
    const [currentTime,  setCurrentTime]  = useState(0);
    const [duration,     setDuration]     = useState(video.duration || 15);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isDragging,   setIsDragging]   = useState(false);
    const [showVolSlider, setShowVolSlider] = useState(false);

    const resetHideTimer = useCallback(() => {
        clearTimeout(hideTimer.current);
        setShowControls(true);
        if (isPlaying) {
            hideTimer.current = setTimeout(() => setShowControls(false), 3000);
        }
    }, [isPlaying]);

    useEffect(() => {
        resetHideTimer();
        return () => clearTimeout(hideTimer.current);
    }, [resetHideTimer]);

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (isPlaying) { v.pause(); setShowControls(true); }
        else { v.play(); resetHideTimer(); }
        setIsPlaying(p => !p);
    };

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !isMuted;
        setIsMuted(m => !m);
    };

    const handleVolume = (e) => {
        const val = parseFloat(e.target.value);
        if (videoRef.current) videoRef.current.volume = val;
        setVolume(val);
        setIsMuted(val === 0);
    };

    const handleSeekClick = (e) => {
        if (!seekRef.current || !videoRef.current) return;
        const rect = seekRef.current.getBoundingClientRect();
        const pct  = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        videoRef.current.currentTime = pct * duration;
        setCurrentTime(pct * duration);
    };

    const handleSeekDrag = (e) => {
        if (!isDragging || !seekRef.current || !videoRef.current) return;
        const rect = seekRef.current.getBoundingClientRect();
        const pct  = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        videoRef.current.currentTime = pct * duration;
        setCurrentTime(pct * duration);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
    };

    const handleDownload = async () => {
        try {
            const res  = await fetch(video.url);
            const blob = await res.blob();
            const url  = window.URL.createObjectURL(blob);
            const a    = Object.assign(document.createElement('a'), {
                href: url, download: `bridal-film-${video.id || 'output'}.mp4`
            });
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch { window.open(video.url, '_blank'); }
    };

    const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <CheckCircle size={18} color="#22C55E" strokeWidth={1.8} />
                    </div>
                    <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, color: '#FFF', margin: 0, lineHeight: 1.2 }}>
                            Your Bridal Film is Ready
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                            16:9 cinematic video · watch, download or share below
                        </p>
                    </div>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 100,
                    background: 'var(--bg-dark)', border: '1px solid var(--glass-border)',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)',
                }}>
                    <Shield size={10} strokeWidth={2} />
                    SECURE_{video.id?.toString().slice(0, 5) || '001'}
                </div>
            </div>

            {/* ── Player shell ── */}
            <div style={{
                background: '#090607',
                borderRadius: 18,
                border: '1px solid rgba(212,175,106,.72)',
                boxShadow: '0 0 0 1px rgba(212,175,106,.12), 0 18px 55px rgba(0,0,0,.42)',
                overflow: 'hidden',
            }}>
                {/* Video + overlay container */}
                <div
                    ref={containerRef}
                    style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        background: '#090607',
                        borderRadius: 14,
                        overflow: 'hidden',
                        cursor: showControls ? 'default' : 'none',
                    }}
                    onMouseMove={resetHideTimer}
                    onMouseLeave={() => isPlaying && setShowControls(false)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseMoveCapture={handleSeekDrag}
                >
                    {/* A softened copy fills portrait side space without changing
                        the sharp video's aspect ratio or cropping its content. */}
                    <video
                        ref={backdropRef}
                        src={video.url}
                        muted
                        loop
                        autoPlay
                        playsInline
                        aria-hidden="true"
                        tabIndex={-1}
                        style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%',
                            objectFit: 'cover', objectPosition: 'center',
                            filter: 'blur(24px) brightness(.42) saturate(1.18)',
                            transform: 'scale(1.08)', opacity: .9, pointerEvents: 'none',
                        }}
                    />
                    {/* The original video stays sharp, centered, and uncropped. */}
                    <video
                        ref={videoRef}
                        src={video.url}
                        style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: 'transparent', borderRadius: 12 }}
                        onTimeUpdate={() => {
                            const time = videoRef.current?.currentTime || 0;
                            if (!isDragging) setCurrentTime(time);
                            if (backdropRef.current && Math.abs(backdropRef.current.currentTime - time) > .15) backdropRef.current.currentTime = time;
                        }}
                        onLoadedMetadata={() => setDuration(videoRef.current?.duration || video.duration || 15)}
                        onPlay={() => { setIsPlaying(true); backdropRef.current?.play().catch(() => {}); }}
                        onPause={() => { setIsPlaying(false); backdropRef.current?.pause(); }}
                        onEnded={() => { setIsPlaying(false); setShowControls(true); backdropRef.current?.pause(); }}
                        onClick={togglePlay}
                    />

                    {/* Centre play button (shown when paused) */}
                    {!isPlaying && (
                        <div
                            onClick={togglePlay}
                            style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 2,
                                background: 'rgba(0,0,0,0.18)',
                            }}
                        >
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1.5px solid rgba(255,255,255,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'transform 0.2s, background 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <Play size={28} color="#FFF" fill="#FFF" style={{ marginLeft: 4 }} />
                            </div>
                        </div>
                    )}

                    {/* Controls bar — fades in/out */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                        padding: '32px 16px 14px',
                        transition: 'opacity 0.3s',
                        opacity: showControls ? 1 : 0,
                        pointerEvents: showControls ? 'auto' : 'none',
                    }}>
                        {/* Seek bar */}
                        <div
                            ref={seekRef}
                            onClick={handleSeekClick}
                            onMouseDown={() => setIsDragging(true)}
                            style={{
                                width: '100%', height: 4, borderRadius: 4,
                                background: 'rgba(255,255,255,0.2)',
                                cursor: 'pointer', marginBottom: 12,
                                position: 'relative',
                            }}
                        >
                            {/* Filled portion */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0,
                                height: '100%', width: `${seekPct}%`,
                                background: '#FFF', borderRadius: 4,
                                transition: isDragging ? 'none' : 'width 0.25s linear',
                            }} />
                            {/* Scrubber thumb */}
                            <div style={{
                                position: 'absolute', top: '50%',
                                left: `${seekPct}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 12, height: 12, borderRadius: '50%',
                                background: '#FFF',
                                boxShadow: '0 0 6px rgba(0,0,0,0.6)',
                                transition: isDragging ? 'none' : 'left 0.25s linear',
                            }} />
                        </div>

                        {/* Controls row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {/* Play / Pause */}
                            <IconBtn onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                                {isPlaying
                                    ? <Pause size={18} fill="#FFF" strokeWidth={0} />
                                    : <Play  size={18} fill="#FFF" strokeWidth={0} />
                                }
                            </IconBtn>

                            {/* Restart */}
                            <IconBtn onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; setCurrentTime(0); } }} title="Restart">
                                <RotateCcw size={14} strokeWidth={2} />
                            </IconBtn>

                            {/* Time */}
                            <span style={{
                                fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
                                color: 'rgba(255,255,255,0.75)', marginLeft: 4, flexShrink: 0,
                            }}>
                                {fmt(currentTime)} / {fmt(duration)}
                            </span>

                            {/* Spacer */}
                            <div style={{ flex: 1 }} />

                            {/* Volume */}
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                onMouseEnter={() => setShowVolSlider(true)}
                                onMouseLeave={() => setShowVolSlider(false)}
                            >
                                <IconBtn onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                                    {isMuted || volume === 0
                                        ? <VolumeX size={16} strokeWidth={2} />
                                        : <Volume2 size={16} strokeWidth={2} />
                                    }
                                </IconBtn>
                                <div style={{
                                    width: showVolSlider ? 80 : 0,
                                    overflow: 'hidden',
                                    transition: 'width 0.2s ease',
                                }}>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolume}
                                        style={{
                                            width: 80, cursor: 'pointer',
                                            accentColor: '#FFF', display: 'block',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Fullscreen */}
                            <IconBtn onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                                {isFullscreen
                                    ? <Minimize2 size={15} strokeWidth={2} />
                                    : <Maximize2 size={15} strokeWidth={2} />
                                }
                            </IconBtn>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Action buttons ── */}
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                <button
                    onClick={handleDownload}
                    className="btn-primary"
                    style={{ gap: 8, padding: '13px 18px', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}
                >
                    <Download size={15} strokeWidth={2} />
                    Download Video
                </button>
                <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Check out my bridal visualization!')}`, '_blank')}
                    className="btn-secondary"
                    style={{ gap: 8, padding: '13px 18px', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}
                >
                    <Share2 size={15} strokeWidth={2} />
                    Share on WhatsApp
                </button>
            </div>
        </div>
    );
};

export default VideoPlayer;
