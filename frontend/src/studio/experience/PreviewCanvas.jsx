/**
 * PreviewCanvas.jsx — large result viewer with zoom, pan, before/after compare,
 * and fullscreen. Action buttons (download / share / print / regenerate) are
 * supplied by the module via the `actions` slot so the studio keeps its
 * download/proxy logic in one place.
 */
import { useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Columns2 } from 'lucide-react';
import { IconButton } from '../primitives';
import FilmPlayer from './FilmPlayer';

export default function PreviewCanvas({
  type = 'image', src, beforeSrc, beforeLabel = 'Before', afterLabel = 'After', actions,
}) {
  const stageRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(50);
  const canCompare = type === 'image' && !!beforeSrc;
  const canZoom = type === 'image' && !compare;

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const onWheel = useCallback((e) => {
    if (!canZoom) return;
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, +(z - e.deltaY * 0.0016).toFixed(2))));
  }, [canZoom]);

  const onPointerDown = (e) => {
    if (canZoom && zoom > 1) { setDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y }); e.currentTarget.setPointerCapture(e.pointerId); }
  };
  const onPointerMove = (e) => { if (drag) setPan({ x: e.clientX - drag.x, y: e.clientY - drag.y }); };
  const onPointerUp = () => setDrag(null);

  const onSplitMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    setSplit(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const fullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div className="s-preview">
      <div className="s-preview__stage" ref={stageRef} onWheel={onWheel}
        style={{ cursor: canZoom && zoom > 1 ? (drag ? 'grabbing' : 'grab') : 'default' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>

        {compare && canCompare ? (
          <div className="s-compare" onPointerMove={(e) => e.buttons === 1 && onSplitMove(e)}
            onPointerDown={onSplitMove} style={{ cursor: 'ew-resize' }}>
            <img src={src} alt={afterLabel} style={{ display: 'block', maxHeight: '72vh', maxWidth: '100%' }} draggable={false} />
            <div className="s-compare__after" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
              <img src={beforeSrc} alt={beforeLabel} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
            </div>
            <Tag side="left" hidden={split < 12}>{beforeLabel}</Tag>
            <Tag side="right" hidden={split > 88}>{afterLabel}</Tag>
            <div className="s-compare__divider" style={{ left: `${split}%` }}>
              <span className="s-compare__grip"><Columns2 size={15} /></span>
            </div>
          </div>
        ) : type === 'video' ? (
          <FilmPlayer src={src} title={afterLabel} autoPlay />
        ) : (
          <img src={src} alt="Result" className="s-preview__media"
            draggable={false}
            style={{ maxHeight: '74vh', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: drag ? 'none' : 'transform .18s var(--ease)' }} />
        )}
      </div>

      <div className="s-preview__toolbar">
        {canZoom && (
          <>
            <IconButton icon={ZoomOut} label="Zoom out" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} />
            <span className="s-mono" style={{ fontSize: 11.5, color: 'var(--text-2)', width: 42, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <IconButton icon={ZoomIn} label="Zoom in" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} />
            <IconButton icon={RotateCcw} label="Reset view" onClick={reset} />
            <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
          </>
        )}
        {canCompare && (
          <IconButton icon={Columns2} label={compare ? 'Exit compare' : 'Before / after'} active={compare}
            onClick={() => { setCompare((c) => !c); reset(); }} />
        )}
        <IconButton icon={Maximize2} label="Fullscreen" onClick={fullscreen} />
        <div style={{ flex: 1 }} />
        {actions}
      </div>
    </div>
  );
}

function Tag({ side, hidden, children }) {
  if (hidden) return null;
  return (
    <span className="s-mono" style={{
      position: 'absolute', top: 12, [side]: 12, padding: '3px 8px', borderRadius: 6,
      background: 'rgba(0,0,0,.6)', border: '1px solid var(--border)', color: 'var(--text-2)',
      fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', backdropFilter: 'blur(6px)',
    }}>{children}</span>
  );
}
