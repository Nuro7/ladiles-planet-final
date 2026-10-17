/**
 * ViewAllModal.jsx — premium "liquid glass" popup shared by the Video & Image
 * studios. Centered dialog on desktop/tablet, bottom-sheet on mobile.
 *
 * Design notes (per UI/UX guidelines):
 *  • Frosted, saturated backdrop scrim (≈55% black) isolates foreground.
 *  • Translucent glass panel with a gradient hairline + top accent bar.
 *  • Sticky header, scrollable body with a styled thin scrollbar.
 *  • Escape to close, click-scrim to dismiss, body-scroll lock, focus on open.
 *  • Motion is spring-ish on enter, faster on exit, and fully disabled under
 *    prefers-reduced-motion.
 */
import { useEffect, useRef } from 'react';
import useBreakpoint from '../hooks/useBreakpoint';

const T = {
    scrim:   'rgba(6,6,6,0.62)',
    panel:   'rgba(20,20,20,0.86)',
    panelSolid: '#161616',
    border:  'rgba(245,245,245,0.10)',
    text:    '#f5f5f5',
    textDim: '#9a9a9a',
    accent:  '#caff33',
    primary: '#c44569',
};

const FONTS = {
    display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    body:    '"Inter", "Jost", system-ui, sans-serif',
};

export default function ViewAllModal({ title, subtitle, icon, onClose, children }) {
    const bp = useBreakpoint();
    const isMobile = bp === 'mobile';
    const panelRef = useRef(null);

    // Esc to close + lock background scroll while open
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // Move focus into the dialog for keyboard users
        panelRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    return (
        <div
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{
                position: 'fixed', inset: 0, zIndex: 1200,
                background: T.scrim,
                backdropFilter: 'blur(14px) saturate(1.1)',
                WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                padding: isMobile ? 0 : 24,
                animation: 'lpvm-scrim 0.22s ease-out',
            }}
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    background: T.panel,
                    backdropFilter: 'blur(20px) saturate(1.3)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                    border: `1px solid ${T.border}`,
                    borderRadius: isMobile ? '22px 22px 0 0' : 22,
                    width: '100%',
                    maxWidth: isMobile ? '100%' : 780,
                    maxHeight: isMobile ? '88vh' : '85vh',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', outline: 'none',
                    boxShadow: '0 -10px 60px rgba(0,0,0,0.5), 0 30px 90px rgba(0,0,0,0.6)',
                    animation: isMobile
                        ? 'lpvm-sheet 0.32s cubic-bezier(0.22,1,0.36,1)'
                        : 'lpvm-pop 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}
            >
                {/* Top accent bar — brand gradient hairline */}
                <div style={{
                    height: 3, flexShrink: 0,
                    background: `linear-gradient(90deg, ${T.accent}, ${T.primary})`,
                }} />

                {/* Mobile grab handle */}
                {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                        <div style={{ width: 38, height: 4, borderRadius: 99,
                            background: 'rgba(245,245,245,0.22)' }} />
                    </div>
                )}

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 14,
                    padding: isMobile ? '14px 18px 14px' : '20px 24px',
                    borderBottom: `1px solid ${T.border}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                        {icon && (
                            <div aria-hidden="true" style={{
                                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25em',
                                background: 'linear-gradient(135deg, rgba(202,255,51,0.16), rgba(196,69,105,0.16))',
                                border: `1px solid ${T.border}`,
                            }}>{icon}</div>
                        )}
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontFamily: FONTS.display, fontWeight: 800,
                                fontSize: isMobile ? '1.3em' : '1.55em',
                                color: T.text, lineHeight: 1.1,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{title}</div>
                            {subtitle && (
                                <div style={{
                                    fontSize: '0.8em', color: T.textDim, marginTop: 3,
                                    fontFamily: FONTS.body,
                                }}>{subtitle}</div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            background: 'rgba(245,245,245,0.05)',
                            border: `1px solid ${T.border}`,
                            color: T.text, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.18s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = T.accent;
                            e.currentTarget.style.color = '#000';
                            e.currentTarget.style.borderColor = T.accent;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(245,245,245,0.05)';
                            e.currentTarget.style.color = T.text;
                            e.currentTarget.style.borderColor = T.border;
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="lpvm-body" style={{
                    padding: isMobile ? 16 : 24,
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : 24,
                }}>
                    {children}
                </div>
            </div>

            <style>{`
                @keyframes lpvm-scrim { from { opacity: 0; } to { opacity: 1; } }
                @keyframes lpvm-pop {
                    from { opacity: 0; transform: translateY(10px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes lpvm-sheet {
                    from { transform: translateY(100%); }
                    to   { transform: translateY(0); }
                }
                .lpvm-body::-webkit-scrollbar { width: 9px; }
                .lpvm-body::-webkit-scrollbar-track { background: transparent; }
                .lpvm-body::-webkit-scrollbar-thumb {
                    background: rgba(245,245,245,0.14);
                    border-radius: 99px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                .lpvm-body::-webkit-scrollbar-thumb:hover {
                    background: rgba(202,255,51,0.4);
                    background-clip: padding-box;
                }
                @media (prefers-reduced-motion: reduce) {
                    [role="dialog"], [role="dialog"] * { animation: none !important; }
                }
            `}</style>
        </div>
    );
}
