/**
 * HiggsfieldConnect.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time admin widget for connecting Higgsfield via OAuth.
 *
 * Shows current connection status + a "Connect Higgsfield" button that opens
 * the OAuth flow in a new browser tab. After the user approves, the backend
 * stores the OAuth token and all video generations charge their existing
 * app.higgsfield.ai subscription credits.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';

// VITE_API_URL is typically "/api" in dev (Vite proxy forwards /api → backend).
// We treat BASE_URL as the prefix that already includes "/api".
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function HiggsfieldConnect() {
    const [status, setStatus]     = useState(null);
    const [loading, setLoading]   = useState(true);
    const [disconnecting, setDis] = useState(false);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/higgsfield-oauth/status`);
            const json = await res.json();
            setStatus(json.data || json);
        } catch (err) {
            setStatus({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStatus(); }, []);

    const handleConnect = () => {
        // Open in same tab — Higgsfield will redirect back to /api/higgsfield-oauth/callback
        window.location.href = `${BASE_URL}/higgsfield-oauth/start`;
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect Higgsfield? You will need to re-authorize.')) return;
        setDis(true);
        try {
            await fetch(`${BASE_URL}/higgsfield-oauth/disconnect`, { method: 'POST' });
            await loadStatus();
        } finally {
            setDis(false);
        }
    };

    if (loading) {
        return <div style={s.card}>Loading Higgsfield status…</div>;
    }

    const connected = status?.connected;
    const expiresAt = status?.expires_at ? new Date(status.expires_at) : null;

    return (
        <div style={s.card}>
            <h2 style={s.title}>🔐 Higgsfield Connection</h2>

            {connected ? (
                <>
                    <div style={s.statusOk}>
                        ✅ <strong>Connected</strong> — generating videos using your Higgsfield subscription credits.
                    </div>
                    <div style={s.meta}>
                        <div>Token expires: <code>{expiresAt?.toLocaleString() || 'unknown'}</code></div>
                        <div>Scope: <code>{status?.scope || '—'}</code></div>
                        <div>Auto-refresh: enabled</div>
                    </div>
                    <button onClick={handleDisconnect} disabled={disconnecting} style={s.btnDanger}>
                        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                </>
            ) : (
                <>
                    <div style={s.statusWarn}>
                        ⚠️ <strong>Not connected.</strong> Click below to authorize this platform to use your
                        Higgsfield subscription credits — works exactly like adding Higgsfield to Claude Desktop.
                    </div>
                    <ol style={s.steps}>
                        <li>Click <strong>Connect Higgsfield</strong> below</li>
                        <li>Log into your app.higgsfield.ai account in the popup</li>
                        <li>Approve access for "Ladies Planet Bridal Studio"</li>
                        <li>You'll be redirected back automatically</li>
                    </ol>
                    <button onClick={handleConnect} style={s.btnPrimary}>
                        🔐 Connect Higgsfield
                    </button>
                    <div style={s.note}>
                        Uses your existing Higgsfield subscription — no separate API billing needed.
                    </div>
                </>
            )}
        </div>
    );
}

const s = {
    card: {
        background     : 'rgba(255,255,255,0.05)',
        border         : '1px solid rgba(241,196,15,0.3)',
        borderRadius   : 12,
        padding        : 24,
        marginBottom   : 20,
        color          : '#eee',
        fontFamily     : 'system-ui, sans-serif'
    },
    title: { marginTop: 0, color: '#f1c40f' },
    statusOk: {
        padding      : 12,
        background   : 'rgba(46,125,50,0.2)',
        borderRadius : 8,
        marginBottom : 14,
        fontSize     : '0.95em'
    },
    statusWarn: {
        padding      : 12,
        background   : 'rgba(245,124,0,0.2)',
        borderRadius : 8,
        marginBottom : 14,
        fontSize     : '0.95em'
    },
    meta: {
        background   : 'rgba(0,0,0,0.3)',
        padding      : 12,
        borderRadius : 8,
        fontSize     : '0.85em',
        color        : '#aaa',
        marginBottom : 14,
        lineHeight   : 1.7
    },
    steps: {
        margin       : '14px 0',
        paddingLeft  : 22,
        fontSize     : '0.9em',
        color        : '#ccc'
    },
    btnPrimary: {
        padding      : '12px 28px',
        background   : 'linear-gradient(135deg, #6e1f8b 0%, #c44569 100%)',
        color        : '#fff',
        border       : 'none',
        borderRadius : 10,
        fontSize     : '1em',
        fontWeight   : 700,
        cursor       : 'pointer'
    },
    btnDanger: {
        padding      : '8px 16px',
        background   : 'transparent',
        color        : '#ff8a80',
        border       : '1px solid #ff8a80',
        borderRadius : 8,
        cursor       : 'pointer',
        fontSize     : '0.9em'
    },
    note: {
        marginTop : 10,
        fontSize  : '0.8em',
        color     : '#888'
    }
};
