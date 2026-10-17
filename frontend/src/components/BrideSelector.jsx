import React, { useState, useEffect } from 'react';
import { User, ChevronDown, Check, Search, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { showToast } from '../utils/notifications';

const BrideSelector = ({ selectedBride, onBrideSelect, imageType = 'identity', angle = 'front' }) => {
    const [brides, setBrides] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrideData, setSelectedBrideData] = useState(null);

    useEffect(() => { fetchBrides(); }, []);

    const fetchBrides = async () => {
        setIsLoading(true);
        try {
            const response = await fetchWithAuth('/api/brides?status=active');
            if (!response.ok) throw new Error('Failed to fetch brides');
            const result = await response.json();
            setBrides(result.data || []);
        } catch (error) {
            showToast('Showing offline brides', 'info');
            setBrides([
                { id: '1', name: 'Emma Smith (Offline)',    created_at: new Date().toISOString() },
                { id: '2', name: 'Sophia Johnson (Offline)', created_at: new Date().toISOString() },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBrideSelect = async (bride) => {
        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`/api/brides/${bride.id}/with-images`);
            if (!response.ok) throw new Error('Failed to fetch bride images');
            const result = await response.json();
            const brideData = result.data;
            const images = brideData.images || [];
            const organizedImages = {
                front: images.find(img => img.angle === 'front')?.image_url,
                left:  images.find(img => img.angle === 'left')?.image_url,
                right: images.find(img => img.angle === 'right')?.image_url,
                back:  images.find(img => img.angle === 'back')?.image_url,
            };
            const missingAngles = ['front', 'left', 'right', 'back'].filter(a => !organizedImages[a]);
            if (missingAngles.length > 0) throw new Error(`Missing angles: ${missingAngles.join(', ')}`);
            setSelectedBrideData(brideData);
            onBrideSelect(organizedImages, brideData);
            setIsOpen(false);
            showToast(`Selected ${bride.name}`, 'success');
        } catch (error) {
            showToast(error.message || 'Failed to load bride images', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredBrides = brides.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ position: 'relative' }}>
            {/* ── Trigger button ── */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${isOpen ? 'rgba(255,255,255,0.35)' : 'var(--glass-border)'}`,
                    background: 'var(--bg-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36, height: 36,
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid var(--glass-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <User size={16} color="#FFF" strokeWidth={1.5} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        {selectedBrideData ? (
                            <>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>{selectedBrideData.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                                    {imageType === 'identity' ? 'Original' : 'With Dress'} · {angle} view
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#FFF' }}>Select Bride</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Choose from saved brides</div>
                            </>
                        )}
                    </div>
                </div>
                <ChevronDown
                    size={16}
                    color="var(--muted)"
                    strokeWidth={1.8}
                    style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
                />
            </button>

            {/* ── Dropdown ── */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    zIndex: 50,
                    width: '100%',
                    marginTop: 6,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                }}>
                    {/* Search */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} color="var(--muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search brides…"
                                style={{
                                    width: '100%',
                                    paddingLeft: 32, paddingRight: 12,
                                    paddingTop: 8, paddingBottom: 8,
                                    borderRadius: 8,
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-dark)',
                                    color: '#FFF',
                                    fontSize: 13,
                                    outline: 'none',
                                    fontFamily: 'var(--font-body)',
                                }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                                onBlur={e =>  { e.target.style.borderColor = 'var(--glass-border)'; }}
                            />
                        </div>
                    </div>

                    {/* Refresh */}
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--glass-border)' }}>
                        <button
                            type="button"
                            onClick={fetchBrides}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '7px 12px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--muted)',
                                fontSize: 13,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 7,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s, color 0.2s',
                                fontFamily: 'var(--font-body)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#FFF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                        >
                            <RefreshCw size={13} strokeWidth={1.8} style={isLoading ? { animation: 'spin-ring 1s linear infinite' } : {}} />
                            Refresh List
                        </button>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {isLoading ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                <div className="spin-ring" style={{ margin: '0 auto 12px' }} />
                                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading brides…</p>
                            </div>
                        ) : filteredBrides.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                <User size={36} color="var(--muted)" strokeWidth={1} style={{ margin: '0 auto 10px' }} />
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#FFF', marginBottom: 4 }}>No brides found</p>
                                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                                    {searchTerm ? 'Try a different search' : 'Upload a bride to get started'}
                                </p>
                            </div>
                        ) : (
                            filteredBrides.map((bride, i) => (
                                <button
                                    key={bride.id}
                                    type="button"
                                    onClick={() => handleBrideSelect(bride)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderTop: i > 0 ? '1px solid var(--glass-border)' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        textAlign: 'left',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 8,
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid var(--glass-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <span style={{ color: '#FFF', fontWeight: 700, fontSize: 13 }}>
                                                {bride.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>{bride.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                                                Added {new Date(bride.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedBrideData?.id === bride.id && (
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: '#22C55E',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <Check size={11} color="#FFF" strokeWidth={2.5} />
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
};

export default BrideSelector;
