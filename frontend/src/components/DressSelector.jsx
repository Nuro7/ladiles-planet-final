import { useState, useEffect } from 'react';
import { Package, Upload, Search, X, Check } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const CATEGORIES = ['All','Bridal Gown','Evening Gown','Cocktail Dress','Traditional','Contemporary','Lehenga','Saree','Anarkali'];

export default function DressSelector({ selectedDress, onDressSelect, onDirectUpload }) {
    const [mode,             setMode]             = useState('select');
    const [dresses,          setDresses]          = useState([]);
    const [loading,          setLoading]          = useState(false);
    const [searchTerm,       setSearchTerm]       = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [uploadPreview,    setUploadPreview]    = useState(null);

    useEffect(() => {
        if (mode === 'select') fetchDresses();
    }, [mode, searchTerm, selectedCategory]);

    const fetchDresses = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
            params.append('availability', 'true');
            params.append('sortBy', 'created_at');
            params.append('sortOrder', 'desc');
            const response = await fetchWithAuth(`${API_BASE_URL}/dresses?${params}`);
            const data = await response.json();
            if (data.success) setDresses(data.data);
        } catch {
            setDresses([
                { id: '1', name: 'Vintage Lace (Offline)', category: 'A-Line',  image_url: 'https://images.unsplash.com/photo-1594552072238-18eafceb545f?w=500' },
                { id: '2', name: 'Modern Silk (Offline)',  category: 'Mermaid', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleDressClick = (dress) => {
        fetch(dress.image_url)
            .then(r => r.blob())
            .then(blob => {
                const file = new File([blob], `${dress.name}.jpg`, { type: 'image/jpeg' });
                onDressSelect(file, dress);
            });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setUploadPreview(reader.result);
        reader.readAsDataURL(file);
        onDirectUpload(file);
    };

    const clearUpload = () => {
        setUploadPreview(null);
        onDirectUpload(null);
    };

    /* shared tab style */
    const tabStyle = (active) => ({
        flex: 1,
        padding: '10px 14px',
        borderRadius: 8,
        border: 'none',
        background: active ? 'var(--white)' : 'transparent',
        color: active ? 'var(--text-inv)' : 'var(--muted)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        transition: 'all 0.2s',
        fontFamily: 'var(--font-body)',
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* ── Mode toggle ── */}
            <div style={{
                display: 'flex',
                gap: 4,
                padding: 4,
                background: 'var(--bg-card)',
                borderRadius: 10,
                border: '1px solid var(--glass-border)',
            }}>
                <button onClick={() => setMode('select')} style={tabStyle(mode === 'select')}>
                    <Package size={14} strokeWidth={1.8} /> Select from Catalog
                </button>
                <button onClick={() => setMode('upload')} style={tabStyle(mode === 'upload')}>
                    <Upload size={14} strokeWidth={1.8} /> Upload New
                </button>
            </div>

            {/* ── Catalog mode ── */}
            {mode === 'select' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Search + Filter */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={14} color="var(--muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search dresses…"
                                style={{
                                    width: '100%',
                                    paddingLeft: 32, paddingRight: 12,
                                    paddingTop: 9, paddingBottom: 9,
                                    borderRadius: 8,
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-dark)',
                                    color: '#FFF',
                                    fontSize: 13,
                                    outline: 'none',
                                    fontFamily: 'var(--font-body)',
                                }}
                                onFocus={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                                onBlur={e   => { e.target.style.borderColor = 'var(--glass-border)'; }}
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            style={{
                                padding: '9px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--glass-border)',
                                background: 'var(--bg-dark)',
                                color: '#FFF',
                                fontSize: 13,
                                outline: 'none',
                                fontFamily: 'var(--font-body)',
                                cursor: 'pointer',
                            }}
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat === 'All' ? '' : cat} style={{ background: '#111', color: '#FFF' }}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dress Grid */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div className="spin-ring" style={{ margin: '0 auto 12px' }} />
                            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading dresses…</p>
                        </div>
                    ) : dresses.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '40px 16px',
                            background: 'var(--bg-dark)', borderRadius: 10,
                            border: '1px solid var(--glass-border)',
                        }}>
                            <Package size={36} color="var(--muted)" strokeWidth={1} style={{ margin: '0 auto 10px' }} />
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#FFF', marginBottom: 4 }}>No dresses found</p>
                            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 10,
                            maxHeight: 380,
                            overflowY: 'auto',
                            paddingRight: 4,
                        }}>
                            {dresses.map(dress => {
                                const isSelected = selectedDress?.id === dress.id;
                                return (
                                    <button
                                        key={dress.id}
                                        onClick={() => handleDressClick(dress)}
                                        style={{
                                            position: 'relative',
                                            aspectRatio: '3/4',
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            border: isSelected ? '2px solid #FFF' : '2px solid var(--glass-border)',
                                            background: 'var(--bg-dark)',
                                            cursor: 'pointer',
                                            padding: 0,
                                            transition: 'border-color 0.2s',
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                                    >
                                        <img
                                            src={dress.image_url}
                                            alt={dress.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)',
                                            display: 'flex', flexDirection: 'column',
                                            justifyContent: 'flex-end',
                                            padding: 10,
                                        }}>
                                            <p style={{ color: '#FFF', fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{dress.name}</p>
                                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>{dress.category}</p>
                                        </div>
                                        {isSelected && (
                                            <div style={{
                                                position: 'absolute', top: 8, right: 8,
                                                width: 22, height: 22, borderRadius: '50%',
                                                background: '#FFF',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Check size={12} color="#000" strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Selected info */}
                    {selectedDress && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 8,
                        }}>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>Selected: {selectedDress.name}</p>
                                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{selectedDress.category}</p>
                            </div>
                            <button onClick={() => onDressSelect(null, null)} style={{
                                padding: 6, borderRadius: 6, border: 'none',
                                background: 'rgba(255,255,255,0.08)', color: 'var(--muted)',
                                cursor: 'pointer', display: 'flex', transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#FFF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--muted)'; }}
                            >
                                <X size={15} strokeWidth={2} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Upload mode ── */}
            {mode === 'upload' && (
                <div>
                    {uploadPreview ? (
                        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                            <img src={uploadPreview} alt="Uploaded dress" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                            <button
                                onClick={clearUpload}
                                style={{
                                    position: 'absolute', top: 10, right: 10,
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
                                    color: '#FFF', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X size={15} strokeWidth={2} />
                            </button>
                        </div>
                    ) : (
                        <div
                            onClick={() => document.getElementById('dress-upload-input').click()}
                            className="upload-zone"
                            style={{ cursor: 'pointer', textAlign: 'center', padding: '36px 20px' }}
                        >
                            <Upload size={32} color="var(--muted)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} />
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#FFF', marginBottom: 4 }}>Click to upload dress image</p>
                            <p style={{ fontSize: 12, color: 'var(--muted)' }}>PNG, JPG, WEBP up to 10MB</p>
                        </div>
                    )}
                    <input id="dress-upload-input" type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </div>
            )}
        </div>
    );
}
