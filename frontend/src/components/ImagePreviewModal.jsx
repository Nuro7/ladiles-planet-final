import { useEffect, useRef } from 'react';
import { downloadFile } from '../api/bridalImage';

const C = {
    bg:      'rgba(0,0,0,0.92)',
    panel:   '#161616',
    border:  '#2a2a2a',
    text:    '#f5f5f5',
    textDim: '#888',
    accent:  '#caff33',
};

const FONTS = {
    body: '"Inter", "Jost", system-ui, sans-serif',
};

export default function ImagePreviewModal({ image, onClose }) {
    const overlayRef = useRef(null);
    const imageUrl = image?.video_url || image?.image_url || image?.url;

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    if (!image || !imageUrl) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: C.bg,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: 16,
                backdropFilter: 'blur(6px)',
            }}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'fixed', top: 20, right: 20,
                    background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 12, width: 40, height: 40,
                    color: C.text, cursor: 'pointer', fontSize: '1.2em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1001, fontFamily: FONTS.body,
                    transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseOut={e => e.currentTarget.style.background = C.panel}
            >
                ×
            </button>

            {/* Image */}
            <div style={{
                position: 'relative',
                maxWidth: '90vw', maxHeight: '80vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <img
                    src={imageUrl}
                    alt="Generated bridal poster"
                    style={{
                        maxWidth: '100%', maxHeight: '80vh',
                        objectFit: 'contain',
                        borderRadius: 14,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                        display: 'block',
                    }}
                />
            </div>

            {/* Action bar */}
            <div style={{
                display: 'flex', gap: 12, marginTop: 20,
                fontFamily: FONTS.body,
            }}>
                <button
                    onClick={() => downloadFile(imageUrl, 'ladies-planet-poster')}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: C.accent, color: '#000', border: 'none',
                        padding: '11px 24px', borderRadius: 10,
                        fontWeight: 800, fontSize: '0.92em',
                        cursor: 'pointer',
                        boxShadow: `0 6px 20px ${C.accent}44`,
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                    ⬇ Download
                </button>

                <a
                    href={`https://wa.me/?text=${encodeURIComponent(imageUrl)}`}
                    target="_blank"
                    rel="noopener"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#25D366', color: '#fff',
                        padding: '11px 24px', borderRadius: 10,
                        fontWeight: 700, fontSize: '0.92em',
                        textDecoration: 'none', cursor: 'pointer',
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                    📱 Share
                </a>

                <button
                    onClick={onClose}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'transparent', color: C.textDim,
                        padding: '11px 20px', borderRadius: 10,
                        fontWeight: 600, fontSize: '0.92em',
                        border: `1px solid ${C.border}`, cursor: 'pointer',
                        fontFamily: FONTS.body, transition: 'color 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.color = C.text}
                    onMouseOut={e => e.currentTarget.style.color = C.textDim}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
