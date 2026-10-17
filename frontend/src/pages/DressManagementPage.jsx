import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import Layout from '../components/Layout';
import DressUploadForm from '../components/DressUploadForm';
import DressGrid from '../components/DressGrid';
import DressFilters from '../components/DressFilters';
import DressStats from '../components/DressStats';
import { Package, Plus, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function DressManagementPage() {
    const [dresses,        setDresses]        = useState([]);
    const [stats,          setStats]          = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [filters,        setFilters]        = useState({
        category: '', availability: '', search: '', sortBy: 'created_at', sortOrder: 'desc',
    });

    const fetchDresses = async () => {
        try {
            setLoading(true);
            const qp = new URLSearchParams();
            if (filters.category)          qp.append('category',     filters.category);
            if (filters.availability !== '') qp.append('availability', filters.availability);
            if (filters.search)            qp.append('search',       filters.search);
            if (filters.sortBy)            qp.append('sortBy',       filters.sortBy);
            if (filters.sortOrder)         qp.append('sortOrder',    filters.sortOrder);

            const res  = await fetchWithAuth(`${API_BASE_URL}/dresses?${qp}`);
            const data = await res.json();
            if (data.success) setDresses(data.data);
        } catch {
            setDresses([
                { id: '1', name: 'Elegant A-Line',  category: 'A-Line',    availability: 'available',   image_url: 'https://images.unsplash.com/photo-1594552072238-18eafceb545f?w=500', created_at: new Date().toISOString() },
                { id: '2', name: 'Royal Ball Gown', category: 'Ball Gown', availability: 'available',   image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500', created_at: new Date().toISOString() },
                { id: '3', name: 'Mermaid Silk',    category: 'Mermaid',   availability: 'rented_out',  image_url: 'https://images.unsplash.com/photo-1546171927-bacc560e9d69?w=500',  created_at: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res  = await fetchWithAuth(`${API_BASE_URL}/dresses/stats`);
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch {
            setStats({ total: 3, available: 2, rentedOut: 1, categories: 3 });
        }
    };

    useEffect(() => { fetchDresses(); fetchStats(); }, [filters]);

    const handleUploadSuccess = () => { setShowUploadForm(false); fetchDresses(); fetchStats(); };
    const handleDressUpdate   = () => { fetchDresses(); fetchStats(); };

    return (
        <Layout>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 32px 80px' }}>

                {/* ── Page header ─────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span className="badge badge-accent">
                                <Package size={10} strokeWidth={2} />
                                Dress Catalog
                            </span>
                        </div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 300,
                            color: 'var(--text-1)', letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 6,
                        }}>
                            Dress Catalog
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>
                            Manage your boutique's dress collection and availability.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowUploadForm(v => !v)}
                        className={`btn btn-lg ${showUploadForm ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ gap: 8, marginTop: 4 }}
                    >
                        {showUploadForm
                            ? <><X size={16} strokeWidth={2} /> Cancel</>
                            : <><Plus size={16} strokeWidth={2} /> Upload Dress</>
                        }
                    </button>
                </div>

                {/* ── Stats ───────────────────────────────────── */}
                {stats && (
                    <div style={{ marginBottom: 24 }}>
                        <DressStats stats={stats} />
                    </div>
                )}

                {/* ── Upload form ──────────────────────────────── */}
                {showUploadForm && (
                    <div style={{ marginBottom: 24, animation: 'fadeUp 0.25s var(--ease-out) forwards' }}>
                        <div className="card" style={{ padding: 24 }}>
                            <DressUploadForm onSuccess={handleUploadSuccess} />
                        </div>
                    </div>
                )}

                {/* ── Filters ─────────────────────────────────── */}
                <div style={{ marginBottom: 20 }}>
                    <DressFilters filters={filters} onFilterChange={setFilters} />
                </div>

                {/* ── Dress grid ───────────────────────────────── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ width: 36, height: 36, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 14px' }} className="animate-spin" />
                        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading dresses…</p>
                    </div>
                ) : dresses.length === 0 ? (
                    <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: 'var(--accent-light)', border: '1px solid rgba(168,115,124,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <Package size={24} color="var(--accent)" strokeWidth={1.5} />
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text-1)', marginBottom: 6 }}>
                            {(filters.search || filters.category || filters.availability) ? 'No dresses match your filters' : 'No dresses yet'}
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
                            {(filters.search || filters.category || filters.availability)
                                ? 'Try adjusting your filter criteria'
                                : 'Start by uploading your first dress.'}
                        </p>
                        {!showUploadForm && (
                            <button onClick={() => setShowUploadForm(true)} className="btn btn-primary">
                                <Plus size={15} strokeWidth={2} /> Upload First Dress
                            </button>
                        )}
                    </div>
                ) : (
                    <DressGrid dresses={dresses} onUpdate={handleDressUpdate} />
                )}
            </div>
        </Layout>
    );
}
