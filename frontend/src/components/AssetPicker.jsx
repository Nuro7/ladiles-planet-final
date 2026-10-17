/**
 * AssetPicker.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal that lets the user pick from previously-uploaded brides or dresses
 * instead of re-uploading. Shows a thumbnail grid from /api/brides or /api/dresses.
 * Returns the selected item via onPick({ url, name, id }).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import { Crown, Shirt, X } from 'lucide-react';
import useModalA11y from '../hooks/useModalA11y';

const API = import.meta.env.VITE_API_URL || '/api';

// Champagne-gold on dark cherry — matches the studio system this opens over
// (was an off-brand black + lime-green + hot-pink palette).
const C = {
    panel:    '#3A0A12',                  // --panel
    panel2:   '#46101A',                  // --card
    border:   'rgba(212,175,106,0.20)',   // gold hairline
    text:     '#F7F6F3',
    textDim:  'rgba(247,246,243,0.55)',
    textDim2: 'rgba(247,246,243,0.32)',
    accent:   '#D4AF6A',                  // champagne gold (was lime #caff33)
    ink:      '#2A0207',
};

export default function AssetPicker({ type, onPick, onClose }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const dialogRef = useRef(null);
    useModalA11y(dialogRef, onClose);

    useEffect(() => {
        (async () => {
            try {
                const url = type === 'bride'
                    ? `${API}/brides`
                    : `${API}/dresses`;
                const res = await fetch(url);
                const json = await res.json();
                const raw = json?.data || json?.brides || json?.dresses || [];
                setItems(Array.isArray(raw) ? raw : []);
            } catch { setItems([]); }
            finally { setLoading(false); }
        })();
    }, [type]);

    const getImage = (item) => {
        return item.image_url
            || item.imageUrl
            || item.images?.[0]?.image_url
            || item.front_image_url;
    };

    const filtered = items.filter(i => {
        if (!search) return true;
        const name = (i.name || i.title || i.id || '').toString().toLowerCase();
        return name.includes(search.toLowerCase());
    });

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(30,0,4,0.72)',
            backdropFilter: 'blur(8px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, animation: 'fade-in 0.2s',
        }}>
            <div
                ref={dialogRef}
                role="dialog" aria-modal="true"
                aria-label={type === 'bride' ? 'Pick a bride' : 'Pick a dress'}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()} style={{
                background: C.panel, borderRadius: 18,
                border: `1px solid ${C.border}`,
                maxWidth: 720, width: '100%', maxHeight: '85vh',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', outline: 'none',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            fontFamily: 'var(--font-display, "Cormorant Garamond", Georgia, serif)',
                            fontSize: '1.5em', fontWeight: 600, color: C.text,
                        }}>
                            {type === 'bride'
                                ? <Crown size={20} color={C.accent} strokeWidth={1.75} />
                                : <Shirt size={20} color={C.accent} strokeWidth={1.75} />}
                            {type === 'bride' ? 'Pick a Bride' : 'Pick a Dress'}
                        </div>
                        <div style={{ fontSize: '0.82em', color: C.textDim, marginTop: 2 }}>
                            {items.length} {items.length === 1 ? 'photo' : 'photos'} in your library
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: 'transparent', color: C.textDim,
                        border: `1px solid ${C.border}`, cursor: 'pointer',
                    }}><X size={18} /></button>
                </div>

                {/* Search */}
                <div style={{ padding: '14px 24px',
                    borderBottom: `1px solid ${C.border}` }}>
                    <input
                        type="text"
                        placeholder={`Search ${type}s by name...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '9px 14px', borderRadius: 8,
                            background: C.panel2, color: C.text,
                            border: `1px solid ${C.border}`,
                            fontSize: '0.9em', fontFamily: 'var(--font-body, Inter, sans-serif)',
                            outline: 'none', boxSizing: 'border-box',
                        }} />
                </div>

                {/* Grid */}
                <div style={{
                    flex: 1, overflow: 'auto', padding: 18,
                }}>
                    {loading && (
                        <div style={{ textAlign: 'center', color: C.textDim, padding: 40 }}>
                            Loading...
                        </div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div style={{
                            textAlign: 'center', color: C.textDim, padding: 40,
                            fontStyle: 'italic', fontFamily: 'var(--font-display, "Cormorant Garamond", Georgia, serif)',
                        }}>
                            No {type}s yet. Upload one to get started.
                        </div>
                    )}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: 12,
                    }}>
                        {filtered.map(item => {
                            const imgUrl = getImage(item);
                            const name = item.name || item.title || (item.id?.slice?.(0, 8) ?? '');
                            return (
                                <div key={item.id || imgUrl} onClick={() => {
                                    if (imgUrl) {
                                        onPick({ url: imgUrl, name, id: item.id });
                                        onClose();
                                    }
                                }} style={{
                                    borderRadius: 12, overflow: 'hidden',
                                    background: C.panel2, cursor: 'pointer',
                                    border: `1px solid ${C.border}`,
                                    transition: 'all 0.18s',
                                }} onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.borderColor = C.accent;
                                    e.currentTarget.style.boxShadow = `0 8px 20px ${C.accent}22`;
                                }} onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = C.border;
                                    e.currentTarget.style.boxShadow = 'none';
                                }}>
                                    {imgUrl ? (
                                        <img src={imgUrl} alt="" style={{
                                            width: '100%', height: 160, objectFit: 'cover',
                                            display: 'block',
                                        }} />
                                    ) : (
                                        <div style={{
                                            height: 160, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            color: C.textDim2, fontSize: '0.75em',
                                        }}>No image</div>
                                    )}
                                    <div style={{
                                        padding: '8px 10px',
                                        fontSize: '0.78em', color: C.text,
                                        whiteSpace: 'nowrap', overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>{name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: `1px solid ${C.border}`,
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', fontSize: '0.82em', color: C.textDim,
                }}>
                    <span>Click any photo to use it</span>
                    <button onClick={onClose} style={{
                        background: 'transparent', color: C.textDim,
                        border: `1px solid ${C.border}`,
                        padding: '10px 16px', borderRadius: 8, minHeight: 40,
                        cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)',
                    }}>Cancel</button>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
