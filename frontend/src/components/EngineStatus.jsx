/**
 * EngineStatus.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tiny status badge — just shows "Active" / "Not Active" for the AI engine
 * connection. Click → manage (re-auth or disconnect). No vendor branding.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function EngineStatus() {
    const [status, setStatus]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen]       = useState(false);

    const loadStatus = async () => {
        try {
            const res = await fetch(`${BASE_URL}/higgsfield-oauth/status`);
            const json = await res.json();
            setStatus(json.data || json);
        } catch (err) {
            setStatus({ connected: false, error: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
        const interval = setInterval(loadStatus, 60000); // recheck every minute
        return () => clearInterval(interval);
    }, []);

    const handleActivate = () => {
        window.location.href = `${BASE_URL}/higgsfield-oauth/start`;
    };

    const handleDeactivate = async () => {
        if (!confirm('Deactivate AI engine? You\'ll need to re-activate before generating.')) return;
        try {
            await fetch(`${BASE_URL}/higgsfield-oauth/disconnect`, { method: 'POST' });
            await loadStatus();
            setOpen(false);
        } catch {}
    };

    const connected = status?.connected;
    const dot   = connected ? '#66bb6a' : '#ef5350';
    const label = loading ? '…' : (connected ? 'Active' : 'Not Active');

    return (
        <div style={{ position: 'relative', marginBottom: 12 }}>
            <button onClick={() => setOpen(!open)} style={{
                width: '100%', padding: '8px 12px',
                background: connected ? 'rgba(102,187,106,0.08)' : 'rgba(239,83,80,0.08)',
                border: `1px solid ${connected ? '#66bb6a44' : '#ef535044'}`,
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: connected ? '#a5d6a7' : '#ef9a9a',
                fontSize: '0.85em', fontWeight: 600,
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: dot,
                        boxShadow: connected ? `0 0 8px ${dot}` : 'none',
                        animation: connected ? 'pulse-dot 2s infinite' : 'none',
                    }} />
                    AI Engine: {label}
                </span>
                <span style={{ fontSize: '0.7em', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div style={{
                    marginTop: 6, padding: 12,
                    background: '#1f1f1f', border: '1px solid #2a2a2a',
                    borderRadius: 8, fontSize: '0.82em',
                }}>
                    {connected ? (
                        <>
                            <div style={{ color: '#888', marginBottom: 8 }}>
                                Engine is active. Generations will be charged from your subscription.
                            </div>
                            <button onClick={handleDeactivate} style={{
                                width: '100%', padding: '8px',
                                background: 'transparent', color: '#ef5350',
                                border: '1px solid #ef535066', borderRadius: 6,
                                cursor: 'pointer', fontSize: '0.85em',
                            }}>
                                Deactivate
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{ color: '#888', marginBottom: 8 }}>
                                Activate to start generating videos.
                            </div>
                            <button onClick={handleActivate} style={{
                                width: '100%', padding: '8px',
                                background: '#caff33', color: '#000',
                                border: 'none', borderRadius: 6,
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.85em',
                            }}>
                                Activate Engine
                            </button>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
