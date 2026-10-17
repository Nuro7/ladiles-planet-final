import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Search, SlidersHorizontal,
    Eye, Trash2, Calendar, CheckCircle, Clock, Archive, X, ChevronDown
} from 'lucide-react';
import Layout from '../components/Layout';
import BrideUploadForm from '../components/BrideUploadForm';
import { fetchWithAuth } from '../utils/api';
import { showToast, confirmAction } from '../utils/notifications';

/* ── helpers ──────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
    <p className="label-caps" style={{ marginBottom: 8 }}>{children}</p>
);

const StatCard = ({ label, value, color = 'var(--accent)', icon: Icon, bg }) => (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: bg || 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Icon size={20} color={color} strokeWidth={1.7} />
        </div>
        <div>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1 }}>{value}</p>
        </div>
    </div>
);

const StatusBadge = ({ status }) => {
    const map = {
        active:   { label: 'Active',   bg: 'var(--success-bg)',  color: 'var(--success)',  border: 'var(--success-border)', Icon: CheckCircle },
        draft:    { label: 'Draft',    bg: 'var(--warning-bg)',  color: 'var(--warning)',  border: '#F0CE97',               Icon: Clock       },
        archived: { label: 'Archived', bg: 'var(--surface-alt)', color: 'var(--text-3)',   border: 'var(--border)',          Icon: Archive     },
    };
    const s = map[status] || map.draft;
    const Icon = s.Icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
        }}>
            <Icon size={10} strokeWidth={2.5} />
            {s.label}
        </span>
    );
};

/* ── Avatar with initials ─────────────────────────────── */
const Avatar = ({ name }) => {
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'var(--accent-light)',
            border: '1px solid rgba(168,115,124,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16, color: 'var(--accent)', userSelect: 'none',
            }}>{initials}</span>
        </div>
    );
};

/* ══════════════════════════════════════════════════════ */
const BrideManagementPage = () => {
    const [brides,          setBrides]          = useState([]);
    const [isLoading,       setIsLoading]       = useState(false);
    const [showUploadForm,  setShowUploadForm]  = useState(false);
    const [searchTerm,      setSearchTerm]      = useState('');
    const [statusFilter,    setStatusFilter]    = useState('all');
    const [selectedBride,   setSelectedBride]   = useState(null);

    useEffect(() => { fetchBrides(); }, [statusFilter]);

    const fetchBrides = async () => {
        setIsLoading(true);
        try {
            const url = statusFilter === 'all' ? '/api/brides' : `/api/brides?status=${statusFilter}`;
            const res = await fetchWithAuth(url);
            if (!res.ok) throw new Error();
            const result = await res.json();
            setBrides(result.data || []);
        } catch {
            setBrides([
                { id: '1', name: 'Emma Smith',    status: 'active',   created_at: new Date().toISOString() },
                { id: '2', name: 'Sophia Johnson', status: 'draft',   created_at: new Date().toISOString() },
                { id: '3', name: 'Mia Williams',  status: 'archived', created_at: new Date(Date.now() - 86400000).toISOString() },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewBride = async (bride) => {
        try {
            const res = await fetchWithAuth(`/api/brides/${bride.id}/with-images`);
            if (!res.ok) throw new Error();
            const result = await res.json();
            setSelectedBride(result.data);
        } catch {
            showToast('Failed to load bride details', 'error');
        }
    };

    const handleDeleteBride = async (bride) => {
        const ok = await confirmAction('Delete Bride', `Delete "${bride.name}"? This also removes all photos.`, 'Delete', 'warning');
        if (!ok) return;
        try {
            const res = await fetchWithAuth(`/api/brides/${bride.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            showToast(`${bride.name} deleted`, 'success');
            fetchBrides();
        } catch {
            showToast('Failed to delete bride', 'error');
        }
    };

    const handleUpdateStatus = async (bride, newStatus) => {
        try {
            const res = await fetchWithAuth(`/api/brides/${bride.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error();
            showToast(`Status updated to ${newStatus}`, 'success');
            fetchBrides();
        } catch {
            showToast('Failed to update status', 'error');
        }
    };

    const filteredBrides = brides.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = [
        { label: 'Total',    value: brides.length,                                         icon: Users,        color: 'var(--accent)',  bg: 'var(--accent-light)' },
        { label: 'Active',   value: brides.filter(b => b.status === 'active').length,      icon: CheckCircle,  color: 'var(--success)', bg: 'var(--success-bg)'  },
        { label: 'Draft',    value: brides.filter(b => b.status === 'draft').length,       icon: Clock,        color: 'var(--warning)', bg: 'var(--warning-bg)'  },
        { label: 'Archived', value: brides.filter(b => b.status === 'archived').length,    icon: Archive,      color: 'var(--text-3)',  bg: 'var(--surface-alt)' },
    ];

    return (
        <Layout>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 32px 80px' }}>

                {/* ── Page header ─────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span className="badge badge-accent">
                                <Users size={10} strokeWidth={2} />
                                Bride Profiles
                            </span>
                        </div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 300,
                            color: 'var(--text-1)', letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 6,
                        }}>
                            Bride Management
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>
                            Manage bride profiles and their reference photos.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowUploadForm(v => !v)}
                        className={`btn btn-lg ${showUploadForm ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ gap: 8, marginTop: 4 }}
                    >
                        {showUploadForm
                            ? <><X size={16} strokeWidth={2} /> Cancel</>
                            : <><Plus size={16} strokeWidth={2} /> Add Bride</>
                        }
                    </button>
                </div>

                {/* ── Stats row ───────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                    {stats.map(s => <StatCard key={s.label} {...s} />)}
                </div>

                {/* ── Upload form ──────────────────────────────── */}
                {showUploadForm && (
                    <div style={{ marginBottom: 24, animation: 'fadeUp 0.25s var(--ease-out) forwards' }}>
                        <div className="card" style={{ padding: 24 }}>
                            <BrideUploadForm onSuccess={() => { setShowUploadForm(false); fetchBrides(); }} />
                        </div>
                    </div>
                )}

                {/* ── Search & filter row ─────────────────────── */}
                <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Search */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={14} strokeWidth={1.8} color="var(--text-3)"
                            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by bride name…"
                            className="input"
                            style={{ paddingLeft: 36 }}
                        />
                    </div>

                    {/* Status filter */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <SlidersHorizontal size={14} color="var(--text-3)"
                            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="input"
                            style={{ paddingLeft: 36, paddingRight: 32, width: 160, cursor: 'pointer', appearance: 'none' }}
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                        </select>
                        <ChevronDown size={13} color="var(--text-3)"
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
                            <X size={13} /> Clear
                        </button>
                    )}
                </div>

                {/* ── Brides grid ─────────────────────────────── */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ width: 36, height: 36, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 14px' }} className="animate-spin" />
                        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading profiles…</p>
                    </div>
                ) : filteredBrides.length === 0 ? (
                    <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: 'var(--accent-light)', border: '1px solid rgba(168,115,124,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <Users size={24} color="var(--accent)" strokeWidth={1.5} />
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text-1)', marginBottom: 6 }}>
                            {searchTerm ? 'No matching brides' : 'No brides yet'}
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
                            {searchTerm ? 'Try a different name' : 'Start by adding your first bride profile.'}
                        </p>
                        {!searchTerm && (
                            <button onClick={() => setShowUploadForm(true)} className="btn btn-primary">
                                <Plus size={15} strokeWidth={2} /> Add First Bride
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {filteredBrides.map(bride => (
                            <div key={bride.id} className="card" style={{ padding: 20, transition: 'box-shadow 0.2s var(--ease)' }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                            >
                                {/* Card header */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Avatar name={bride.name} />
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)', marginBottom: 3 }}>{bride.name}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Calendar size={10} strokeWidth={2} />
                                                {new Date(bride.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status={bride.status} />
                                </div>

                                {/* Divider */}
                                <div style={{ height: 1, background: 'var(--border)', margin: '0 0 14px' }} />

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => handleViewBride(bride)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: 1, gap: 6 }}
                                    >
                                        <Eye size={13} strokeWidth={1.8} /> View
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBride(bride)}
                                        className="btn btn-danger btn-sm"
                                        style={{ gap: 6 }}
                                    >
                                        <Trash2 size={13} strokeWidth={1.8} />
                                    </button>
                                </div>

                                {bride.status !== 'active' && (
                                    <button
                                        onClick={() => handleUpdateStatus(bride, 'active')}
                                        style={{
                                            marginTop: 10, width: '100%',
                                            padding: '7px 12px', borderRadius: 'var(--r)',
                                            background: 'var(--success-bg)', color: 'var(--success)',
                                            border: '1px solid var(--success-border)',
                                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                            transition: 'all 0.15s var(--ease)',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                                    >
                                        Set as Active
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Bride detail modal ─────────────────────────── */}
            {selectedBride && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s var(--ease-out)' }}
                    onClick={() => setSelectedBride(null)}
                >
                    <div
                        className="card"
                        style={{ maxWidth: 720, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text-1)', marginBottom: 2 }}>{selectedBride.name}</h2>
                                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Bride profile & reference images</p>
                            </div>
                            <button onClick={() => setSelectedBride(null)} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
                                <X size={15} strokeWidth={2} /> Close
                            </button>
                        </div>

                        <div style={{ padding: 24 }}>
                            {/* Info grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                                {[
                                    { label: 'Status',  value: <StatusBadge status={selectedBride.status} /> },
                                    { label: 'Created', value: new Date(selectedBride.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ background: 'var(--surface-alt)', borderRadius: 'var(--r)', padding: '12px 14px', border: '1px solid var(--border)' }}>
                                        <p className="label-caps" style={{ marginBottom: 5 }}>{label}</p>
                                        <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Images */}
                            <SectionLabel>Reference Photos ({selectedBride.images?.length || 0})</SectionLabel>
                            {selectedBride.images?.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                    {selectedBride.images.map(img => (
                                        <div key={img.id} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
                                            <div style={{ aspectRatio: '3/4', position: 'relative' }}>
                                                <img src={img.image_url} alt={img.angle} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                                            </div>
                                            <div style={{ padding: '7px 10px' }}>
                                                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', textTransform: 'capitalize' }}>{img.angle}</p>
                                                <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{img.image_type}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>No images uploaded yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default BrideManagementPage;
