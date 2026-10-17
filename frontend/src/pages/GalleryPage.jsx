import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Play, Download, Share2, Trash2, Upload,
    LayoutGrid, List, Video, Search, X, Sparkles
} from 'lucide-react';
import Layout from '../components/Layout';
import { fetchWithAuth } from '../utils/api';
import { showToast, confirmAction, showAlert } from '../utils/notifications';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/* ── helpers ──────────────────────────────────────────── */
const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/* ══════════════════════════════════════════════════════ */
const GalleryPage = () => {
    const navigate = useNavigate();
    const [generatedVideos,  setGeneratedVideos]  = useState([]);
    const [uploadedVideos,   setUploadedVideos]   = useState([]);
    const [viewMode,         setViewMode]         = useState('grid');
    const [selectedVideo,    setSelectedVideo]    = useState(null);
    const [searchQuery,      setSearchQuery]      = useState('');
    const [activeTab,        setActiveTab]        = useState('generated');
    const [showUploadModal,  setShowUploadModal]  = useState(false);
    const [uploading,        setUploading]        = useState(false);
    const [uploadForm,       setUploadForm]       = useState({ title: '', description: '', videoFile: null });

    useEffect(() => { fetchVideos(); }, []);

    const fetchVideos = async () => {
        try {
            const [genRes, upRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/videos?type=generated`),
                fetchWithAuth(`${API_BASE_URL}/videos?type=uploaded`),
            ]);
            if (genRes.ok) { const d = await genRes.json(); setGeneratedVideos(d.data || []); }
            if (upRes.ok)  { const d = await upRes.json();  setUploadedVideos(d.data  || []); }
        } catch {
            setGeneratedVideos([{ id: 'g1', title: 'Sample Bridal Film',   description: 'AI-generated demo.', video_url: 'https://vjs.zencdn.net/v/oceans.mp4', created_at: new Date().toISOString() }]);
            setUploadedVideos([{  id: 'u1', title: 'Boutique Overview',    description: 'Uploaded demo.',     video_url: 'https://vjs.zencdn.net/v/oceans.mp4', created_at: new Date().toISOString() }]);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) return showToast('Please select a video file', 'error');
        if (file.size > 100 * 1024 * 1024)  return showToast('File must be under 100 MB', 'error');
        setUploadForm(f => ({ ...f, videoFile: file }));
    };

    const handleUploadVideo = async (e) => {
        e.preventDefault();
        if (!uploadForm.videoFile || !uploadForm.title) return showToast('Title and video file required', 'error');
        try {
            setUploading(true);
            const fd = new FormData();
            fd.append('video', uploadForm.videoFile);
            fd.append('title', uploadForm.title);
            fd.append('description', uploadForm.description);
            fd.append('type', 'uploaded');
            const res  = await fetchWithAuth(`${API_BASE_URL}/videos/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                setShowUploadModal(false);
                setUploadForm({ title: '', description: '', videoFile: null });
                fetchVideos();
                showToast('Video uploaded ✓', 'success');
            } else {
                showAlert('Upload Failed', data.error || 'Failed to upload video', 'error');
            }
        } catch {
            showToast('Upload failed — please try again', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirmAction('Delete Video', 'This action is permanent. Continue?', 'Delete', 'warning');
        if (!ok) return;
        try {
            const res  = await fetchWithAuth(`${API_BASE_URL}/videos/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { showToast('Deleted', 'success'); fetchVideos(); }
            else showToast(data.error || 'Delete failed', 'error');
        } catch { showToast('Delete failed', 'error'); }
    };

    const handleShare    = (v) => window.open(`https://wa.me/?text=${encodeURIComponent(`Bridal film: ${v.title}`)}`, '_blank');
    const handleDownload = (v) => {
        const a = document.createElement('a');
        a.href = v.video_url; a.download = `${v.title}.mp4`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const currentVideos  = activeTab === 'generated' ? generatedVideos : uploadedVideos;
    const filteredVideos = currentVideos.filter(v =>
        v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /* ── Video card ──────────────────────────────────── */
    const VideoCard = ({ video }) => (
        <div className="card" style={{
            overflow: 'hidden', transition: 'box-shadow 0.2s var(--ease)',
        }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
        >
            {viewMode === 'grid' ? (
                <>
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                        <video src={video.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} preload="metadata" />
                        {/* Play overlay */}
                        <div
                            onClick={() => setSelectedVideo(video)}
                            style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.2s var(--ease)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                        >
                            <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transition: 'opacity 0.2s var(--ease)',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.parentElement.style.background = 'rgba(0,0,0,0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                            >
                                <Play size={20} color="var(--accent)" fill="var(--accent)" />
                            </div>
                        </div>
                        {/* Type badge */}
                        {activeTab === 'uploaded' && (
                            <span className="badge badge-accent" style={{ position: 'absolute', top: 10, left: 10 }}>
                                <Upload size={9} strokeWidth={2} /> Uploaded
                            </span>
                        )}
                    </div>
                    {/* Meta */}
                    <div style={{ padding: '16px 18px' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400, color: 'var(--text-1)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {video.title}
                        </p>
                        {video.description && (
                            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
                                {video.description}
                            </p>
                        )}
                        <p className="label-caps" style={{ marginBottom: 14 }}>{fmtDate(video.created_at)}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleShare(video)}    className="btn btn-secondary btn-sm" style={{ flex: 1, gap: 5 }}><Share2 size={13} /> Share</button>
                            <button onClick={() => handleDownload(video)} className="btn btn-ghost btn-sm" style={{ gap: 5 }}><Download size={13} /></button>
                            <button onClick={() => handleDelete(video.id)} className="btn btn-danger btn-sm" style={{ gap: 5 }}><Trash2 size={13} /></button>
                        </div>
                    </div>
                </>
            ) : (
                /* ── List row ── */
                <div style={{ display: 'flex', gap: 20, padding: 18, alignItems: 'center' }}>
                    <div
                        onClick={() => setSelectedVideo(video)}
                        style={{ width: 180, flexShrink: 0, aspectRatio: '16/9', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface-alt)', cursor: 'pointer', position: 'relative' }}
                    >
                        <video src={video.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 400, color: 'var(--text-1)', marginBottom: 4 }}>{video.title}</p>
                        {video.description && <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>{video.description}</p>}
                        <p className="label-caps">{fmtDate(video.created_at)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => setSelectedVideo(video)}  className="btn btn-primary btn-sm" style={{ gap: 5 }}><Play size={13} /> Play</button>
                        <button onClick={() => handleShare(video)}       className="btn btn-secondary btn-sm" style={{ gap: 5 }}><Share2 size={13} /></button>
                        <button onClick={() => handleDownload(video)}    className="btn btn-ghost btn-sm"><Download size={13} /></button>
                        <button onClick={() => handleDelete(video.id)}   className="btn btn-danger btn-sm"><Trash2 size={13} /></button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <Layout>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 32px 80px' }}>

                {/* ── Page header ─────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span className="badge badge-accent">
                                <Video size={10} strokeWidth={2} /> Gallery
                            </span>
                        </div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 300,
                            color: 'var(--text-1)', letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 6,
                        }}>
                            {activeTab === 'generated' ? 'Generated Films' : 'Uploaded Videos'}
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
                            {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'} in this collection
                        </p>
                    </div>

                    <button onClick={() => setShowUploadModal(true)} className="btn btn-primary btn-lg" style={{ gap: 8, marginTop: 4 }}>
                        <Upload size={16} strokeWidth={2} /> Upload Video
                    </button>
                </div>

                {/* ── Tab + controls ───────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    {/* Tabs */}
                    <div className="pill-group">
                        <button onClick={() => setActiveTab('generated')} className={`pill-option${activeTab === 'generated' ? ' pill-option-active' : ''}`}>
                            <Sparkles size={13} strokeWidth={1.8} />
                            AI Generated
                            <span className="badge badge-neutral" style={{ fontSize: 10, marginLeft: 2 }}>{generatedVideos.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('uploaded')} className={`pill-option${activeTab === 'uploaded' ? ' pill-option-active' : ''}`}>
                            <Upload size={13} strokeWidth={1.8} />
                            Uploaded
                            <span className="badge badge-neutral" style={{ fontSize: 10, marginLeft: 2 }}>{uploadedVideos.length}</span>
                        </button>
                    </div>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Search */}
                    <div style={{ position: 'relative', width: 240 }}>
                        <Search size={14} color="var(--text-3)" strokeWidth={1.8}
                            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                            type="text" placeholder="Search videos…"
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="input" style={{ paddingLeft: 36, paddingRight: searchQuery ? 32 : 14 }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* View toggle */}
                    <div className="pill-group">
                        <button onClick={() => setViewMode('grid')} className={`pill-option${viewMode === 'grid' ? ' pill-option-active' : ''}`} style={{ padding: '7px 12px' }}>
                            <LayoutGrid size={14} strokeWidth={1.8} />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`pill-option${viewMode === 'list' ? ' pill-option-active' : ''}`} style={{ padding: '7px 12px' }}>
                            <List size={14} strokeWidth={1.8} />
                        </button>
                    </div>
                </div>

                {/* ── Video list / grid ────────────────────────── */}
                {filteredVideos.length === 0 ? (
                    <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: 'var(--accent-light)', border: '1px solid rgba(168,115,124,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            {activeTab === 'generated'
                                ? <Video size={24} color="var(--accent)" strokeWidth={1.5} />
                                : <Upload size={24} color="var(--accent)" strokeWidth={1.5} />}
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text-1)', marginBottom: 6 }}>
                            {searchQuery ? 'No matching videos' : `No ${activeTab} videos yet`}
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
                            {searchQuery ? 'Try different search terms.' : activeTab === 'generated'
                                ? 'Generate your first bridal film from the Generate page.'
                                : 'Upload a boutique showcase video to get started.'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => activeTab === 'generated' ? navigate('/') : setShowUploadModal(true)}
                                className="btn btn-primary"
                            >
                                {activeTab === 'generated' ? 'Create First Film' : 'Upload Video'}
                            </button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {filteredVideos.map(v => <VideoCard key={v.id} video={v} />)}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filteredVideos.map(v => <VideoCard key={v.id} video={v} />)}
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════
                UPLOAD MODAL
            ════════════════════════════════════════════════ */}
            {showUploadModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s var(--ease-out)' }}
                    onClick={() => !uploading && setShowUploadModal(false)}
                >
                    <div className="card" style={{ maxWidth: 560, width: '100%', padding: 0 }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--text-1)', marginBottom: 2 }}>Upload Video</h3>
                                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>MP4, MOV, AVI · max 100 MB</p>
                            </div>
                            <button onClick={() => !uploading && setShowUploadModal(false)} className="btn btn-ghost btn-sm" disabled={uploading}>
                                <X size={15} strokeWidth={2} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadVideo} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* File drop zone */}
                            <div>
                                <p className="label-caps" style={{ marginBottom: 8 }}>Video File *</p>
                                <div
                                    className="upload-zone"
                                    onClick={() => document.getElementById('vid-file-input').click()}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {uploadForm.videoFile ? (
                                        <>
                                            <Video size={28} color="var(--accent)" strokeWidth={1.5} style={{ margin: '0 auto 10px' }} />
                                            <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-1)', marginBottom: 3 }}>{uploadForm.videoFile.name}</p>
                                            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{(uploadForm.videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={28} color="var(--text-3)" strokeWidth={1.5} style={{ margin: '0 auto 10px' }} />
                                            <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-2)', marginBottom: 3 }}>Click to select video</p>
                                            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>MP4, MOV, AVI up to 100 MB</p>
                                        </>
                                    )}
                                </div>
                                <input id="vid-file-input" type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </div>

                            {/* Title */}
                            <div>
                                <p className="label-caps" style={{ marginBottom: 8 }}>Title *</p>
                                <input
                                    type="text" value={uploadForm.title}
                                    onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g., Spring Bridal Collection 2026"
                                    className="input" required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <p className="label-caps" style={{ marginBottom: 8 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>optional</span></p>
                                <textarea
                                    value={uploadForm.description}
                                    onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Describe the video…"
                                    className="input"
                                    style={{ minHeight: 80, resize: 'vertical' }}
                                />
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-secondary" style={{ flex: 1 }} disabled={uploading}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>
                                    {uploading
                                        ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%' }} className="animate-spin" /> Uploading…</>
                                        : <><Upload size={14} /> Upload Video</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════
                VIDEO PLAYER MODAL
            ════════════════════════════════════════════════ */}
            {selectedVideo && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s var(--ease-out)' }}
                    onClick={() => setSelectedVideo(null)}
                >
                    <div className="card" style={{ maxWidth: 820, width: '100%', padding: 0 }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--text-1)', marginBottom: 2 }}>{selectedVideo.title}</h3>
                                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(selectedVideo.created_at)}</p>
                            </div>
                            <button onClick={() => setSelectedVideo(null)} className="btn btn-ghost btn-sm"><X size={15} strokeWidth={2} /></button>
                        </div>
                        <div style={{ background: '#0f0f0f', borderRadius: '0 0 var(--r-lg) var(--r-lg)', overflow: 'hidden' }}>
                            <video controls autoPlay style={{ width: '100%', display: 'block', maxHeight: '72vh' }} src={selectedVideo.video_url} />
                        </div>
                        <div style={{ padding: '14px 22px', display: 'flex', gap: 10 }}>
                            <button onClick={() => handleDownload(selectedVideo)} className="btn btn-primary" style={{ flex: 1, gap: 7 }}><Download size={15} /> Download</button>
                            <button onClick={() => handleShare(selectedVideo)}   className="btn btn-secondary" style={{ flex: 1, gap: 7 }}><Share2 size={15} /> Share</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default GalleryPage;
