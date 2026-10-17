import { useState } from 'react';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { showToast, confirmAction } from '../utils/notifications';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function DressCard({ dress, onEdit, onUpdate }) {
    const [loading,    setLoading]    = useState(false);
    const [imageError, setImageError] = useState(false);

    const isAvailable = dress.is_available ?? dress.isAvailable;
    const imageUrl    = dress.image_url    ?? dress.imageUrl;
    const createdAt   = dress.created_at   ?? dress.createdAt;

    const handleToggleAvailability = async () => {
        try {
            setLoading(true);
            const res  = await fetchWithAuth(`${API_BASE_URL}/dresses/${dress.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: !isAvailable }),
            });
            const data = await res.json();
            if (data.success && onUpdate) { showToast(`${dress.name} updated`, 'success'); onUpdate(); }
        } catch { /* silent */ } finally { setLoading(false); }
    };

    const handleDelete = async () => {
        const ok = await confirmAction('Delete Dress', `Permanently delete "${dress.name}"?`, 'Delete', 'warning');
        if (!ok) return;
        try {
            setLoading(true);
            const res  = await fetchWithAuth(`${API_BASE_URL}/dresses/${dress.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success && onUpdate) { showToast('Dress deleted', 'success'); onUpdate(); }
        } catch { showToast('Delete failed', 'error'); } finally { setLoading(false); }
    };

    return (
        <div
            className="card"
            style={{ overflow: 'hidden', transition: 'box-shadow 0.2s var(--ease)', position: 'relative' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
        >
            {/* ── Image ── */}
            <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                {!imageError && imageUrl ? (
                    <img
                        src={imageUrl} alt={dress.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block', transition: 'transform 0.4s var(--ease)' }}
                        onError={() => setImageError(true)}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={32} color="var(--border-strong)" strokeWidth={1.5} />
                    </div>
                )}

                {/* Availability badge */}
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                    {isAvailable
                        ? <span className="badge badge-success">Available</span>
                        : <span className="badge badge-neutral">Rented Out</span>}
                </div>

                {/* Category badge */}
                {dress.category && (
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                        <span className="badge badge-accent">{dress.category}</span>
                    </div>
                )}
            </div>

            {/* ── Info ── */}
            <div style={{ padding: '14px 16px' }}>
                <p style={{
                    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400, color: 'var(--text-1)',
                    marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {dress.name}
                </p>

                {dress.description && (
                    <p style={{
                        fontSize: 12, color: 'var(--text-3)', marginBottom: 8,
                        overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, minHeight: 34,
                    }}>
                        {dress.description}
                    </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    {dress.sku
                        ? <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', letterSpacing: '0.05em' }}>{dress.sku}</span>
                        : <span />}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => onEdit(dress)} disabled={loading}
                        className="btn btn-secondary btn-sm" style={{ flex: 1, gap: 5 }}
                    >
                        <Edit2 size={12} strokeWidth={2} /> Edit
                    </button>
                    <button
                        onClick={handleToggleAvailability} disabled={loading}
                        className="btn btn-ghost btn-sm"
                        style={{
                            flex: 1, fontSize: 11, gap: 4,
                            color: isAvailable ? 'var(--warning)' : 'var(--success)',
                            borderColor: isAvailable ? 'transparent' : 'transparent',
                        }}
                    >
                        {isAvailable ? 'Mark Rented' : 'Mark Available'}
                    </button>
                    <button
                        onClick={handleDelete} disabled={loading}
                        className="btn btn-danger btn-sm"
                    >
                        <Trash2 size={12} strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>
    );
}
