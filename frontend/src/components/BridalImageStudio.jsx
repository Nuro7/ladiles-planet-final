/**
 * BridalImageStudio.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Image generation studio for Ladies Planet — produces bridal fashion poster
 * stills with the uploaded bride + dress as references. Mirrors the video
 * studio UX (3-column dark theme, scenario presets, model picker, history).
 *
 * The Ladies Planet logo is overlaid on every generated image via canvas
 * before download, giving the result a premium poster look.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useEffect, useRef, useState } from 'react';
import LadiesPlanetLogo from './LadiesPlanetLogo';
import AssetPicker      from './AssetPicker';
import ImagePreviewModal from './ImagePreviewModal';
import ViewAllModal     from './ViewAllModal';
import useBreakpoint    from '../hooks/useBreakpoint';
import {
    getPoses, calculateImageCost, generateImage,
    getImageHistory, composeWithLogo, saveCompositedImage, downloadFile,
} from '../api/bridalImage';

const API = import.meta.env.VITE_API_URL || '/api';

// Use our backend logo proxy so canvas compose doesn't taint the image
// (Netlify origin doesn't send Access-Control-Allow-Origin headers).
const LOGO_URL = `${API}/images/logo`;

const MODELS = [
    { id: 'chatgpt-image', label: 'GPT Image 2 · Medium · 2K', hint: 'Uses the connected AI Engine', supports: [] },
];

const ASPECTS = [
    { id: '3:4',  label: '3:4 Poster' },
    { id: '1:1',  label: '1:1 Square' },
    { id: '9:16', label: '9:16 Story' },
    { id: '4:3',  label: '4:3 Wide' },
    { id: '16:9', label: '16:9 Cinema' },
];
const RESOLUTIONS = ['1k', '2k', '4k'];
const QUALITIES   = ['low', 'medium', 'high'];

const POSE_LOOK = {
    royal_seated    : { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconCrown },
    floral_stage    : { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconFlower },
    custom          : { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconPencil },
};

// Glossy-black surfaces (gradient sheen) + champagne-gold accent — matches the
// Video Studio and the primary-button gradient.
const C = {
    bg:     'linear-gradient(180deg, #161616 0%, #0b0b0b 52%, #070707 100%)',
    panel:  'linear-gradient(180deg, #1f1f1f 0%, #131313 100%)',
    panel2: 'linear-gradient(180deg, #262626 0%, #181818 100%)',
    border: '#333333', text: '#f5f5f5',
    textDim: '#9a9a9a', textDim2: '#5f5f5f',
    accent: '#B24A60', primary: '#c44569', cream: '#FFFFFF',
};

const FONTS = {
    display: '"Playfair Display", Georgia, serif',
    body   : 'Inter, system-ui, sans-serif',
};

// ─── SVG icons (no emoji); hoisted for the pose presets below ───
function IconBase({ size = 16, children, ...p }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }} {...p}>{children}</svg>
    );
}
function IconImage(p)    { return <IconBase {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5L5 20" /></IconBase>; }
function IconVideo(p)    { return <IconBase {...p}><rect x="2.5" y="6" width="14" height="12" rx="2.5" /><path d="M16.5 10l5-2.5v9l-5-2.5" /></IconBase>; }
function IconCrown(p)    { return <IconBase {...p}><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z" /></IconBase>; }
function IconFlower(p)   { return <IconBase {...p}><circle cx="12" cy="12" r="2.4" /><path d="M12 2.5c2 0 3 1.6 3 3.2S13.7 9.6 12 9.6 9 8.3 9 6.7 10 2.5 12 2.5ZM12 21.5c-2 0-3-1.6-3-3.2s1.3-3.3 3-3.3 3 1.3 3 2.9-1 3.6-3 3.6ZM2.5 12c0-2 1.6-3 3.2-3S9 10.3 9 12s-1.3 3-2.9 3-3.6-1-3.6-3ZM21.5 12c0 2-1.6 3-3.2 3S15 13.7 15 12s1.3-3 2.9-3 3.6 1 3.6 3Z" /></IconBase>; }
function IconPencil(p)   { return <IconBase {...p}><path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" /><path d="M14 7l3 3" /></IconBase>; }
function IconUser(p)     { return <IconBase {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></IconBase>; }
function IconDress(p)    { return <IconBase {...p}><path d="M9 3l3 2 3-2 1.5 4L15 9l1.8 7c.4 1.5-.6 3-2.1 3H9.3c-1.5 0-2.5-1.5-2.1-3L9 9 7.5 7 9 3Z" /></IconBase>; }
function IconSpark(p)    { return <IconBase {...p}><path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" fill="currentColor" stroke="none" /></IconBase>; }
function IconWarn(p)     { return <IconBase {...p}><path d="M12 4l9 16H3l9-16Z" /><path d="M12 10v4M12 17.5v.5" /></IconBase>; }
function IconDownload(p) { return <IconBase {...p}><path d="M12 4v11M7.5 11l4.5 4 4.5-4M5 20h14" /></IconBase>; }
function IconSend(p)     { return <IconBase {...p}><path d="M21 4L3 11l7 2.5L13 21l8-17Z" /><path d="M10 13.5L21 4" /></IconBase>; }
function IconTag(p)      { return <IconBase {...p}><path d="M4 4h7l9 9-7 7-9-9V4Z" /><circle cx="8" cy="8" r="1.4" /></IconBase>; }
function IconUpload(p)   { return <IconBase {...p}><path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M5 20h14" /></IconBase>; }
function IconFolder(p)   { return <IconBase {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></IconBase>; }
function IconBolt(p)     { return <IconBase {...p}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none" /></IconBase>; }

const SectionHeader = ({ children }) => (
    <div style={{
        fontSize: '0.74em', fontWeight: 700, color: C.textDim,
        textTransform: 'uppercase', letterSpacing: '1.3px',
        marginTop: 18, marginBottom: 10, fontFamily: FONTS.body,
    }}>{children}</div>
);

const chip = (active) => ({
    padding: '8px 14px', borderRadius: 10, fontSize: '0.85em',
    border: active ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
    background: active ? 'rgba(178,74,96,0.12)' : C.panel2,
    color: active ? C.accent : C.text,
    cursor: 'pointer', fontWeight: active ? 600 : 500,
    fontFamily: FONTS.body, whiteSpace: 'nowrap', transition: 'all 0.15s',
});

export default function BridalImageStudio() {
    // Responsive breakpoint — drives the column layout below
    const bp = useBreakpoint();
    const isMobile  = bp === 'mobile';
    const isTablet  = bp === 'tablet';
    const isDesktop = bp === 'desktop';

    // File state
    const [brideImage,  setBrideImage]  = useState(null);
    const [bridePrev,   setBridePrev]   = useState(null);
    const [dressImage,  setDressImage]  = useState(null);
    const [dressPrev,   setDressPrev]   = useState(null);

    // Settings
    const [pose,         setPose]         = useState('front_portrait');
    const [customPrompt, setCustomPrompt] = useState('');
    const [model,        setModel]        = useState('chatgpt-image');
    const [aspectRatio,  setAspectRatio]  = useState('3:4');
    const [resolution,   setResolution]   = useState('2k');
    const [quality,      setQuality]      = useState('medium');
    const [addLogo,      setAddLogo]      = useState(true);

    // API state
    const [poses,        setPoses]        = useState([]);
    const [cost,         setCost]         = useState({ credits: 0 });
    const [costLoading,  setCostLoading]  = useState(false);
    const [recent,       setRecent]       = useState([]);

    // Generation state
    const [generating,   setGenerating]   = useState(false);
    const [imageUrl,     setImageUrl]     = useState(null);
    const [compositedUrl,setCompositedUrl]= useState(null);
    const [error,        setError]        = useState(null);

    // Gallery picker
    const [pickerOpen,   setPickerOpen]   = useState(null);

    // In-platform image preview
    const [previewImage, setPreviewImage] = useState(null);

    // Track image URLs that fail to load (expired Higgsfield CDN links) so we hide them
    const [failedUrls, setFailedUrls] = useState(() => new Set());

    // "View all" popups — Pose presets + History
    const [showAllPoses,   setShowAllPoses]   = useState(false);
    const [showAllHistory, setShowAllHistory] = useState(false);


    // Cost fetch race-safe versioning
    const costRequestId = useRef(0);
    // Holds { startedAt, beforeTop } when a generation is in progress — survives
    // tab switches (the tabs are full <a href> reloads) via localStorage.
    const pendingRef = useRef(null);

    // Load poses + history on mount, then auto-sync from Higgsfield every 10s
    useEffect(() => {
        getPoses().then(setPoses).catch(() => {});

        // Restore the last generated poster so the middle preview survives tab switches
        const lastResult = localStorage.getItem('lp_img_result');
        if (lastResult) setImageUrl(lastResult);

        // Restore an in-progress generation started before a tab switch / reload
        try {
            const pending = JSON.parse(localStorage.getItem('lp_img_generating') || 'null');
            if (pending && Date.now() - pending.startedAt < 180000) {
                pendingRef.current = pending;
                setGenerating(true);
            } else {
                localStorage.removeItem('lp_img_generating');
            }
        } catch { localStorage.removeItem('lp_img_generating'); }

        loadRecent();

        const syncNow = () => loadRecent();
        syncNow();
        const timer = setInterval(syncNow, 10000);
        return () => clearInterval(timer);
    }, []);

    // Live cost fetch on settings change
    useEffect(() => {
        const id = ++costRequestId.current;
        setCostLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await calculateImageCost({ model, aspectRatio, resolution, quality });
                if (id === costRequestId.current) {
                    setCost(data);
                    setCostLoading(false);
                }
            } catch {
                if (id === costRequestId.current) setCostLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [model, aspectRatio, resolution, quality]);

    async function loadRecent() {
        try {
            const items = await getImageHistory();
            // Filter out items with no valid image URL (old bad sync records)
            const valid = items.filter(v => v.video_url || v.url);
            setRecent(valid.slice(0, 18));

            // If a generation was pending (e.g. user switched tabs mid-generation),
            // detect the new result: the newest history item's path differs from before.
            if (pendingRef.current && valid.length) {
                const newestUrl  = valid[0].video_url || valid[0].url;
                const newestPath = (newestUrl || '').split('?')[0];
                if (newestPath && newestPath !== pendingRef.current.beforeTop) {
                    setImageUrl(newestUrl);
                    setCompositedUrl(null);
                    localStorage.setItem('lp_img_result', newestUrl);
                    localStorage.removeItem('lp_img_generating');
                    pendingRef.current = null;
                    setGenerating(false);
                }
            }
        } catch { setRecent([]); }
    }

    const onPickFile = (kind) => (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (kind === 'bride') { setBrideImage(file); setBridePrev(url); }
        if (kind === 'dress') { setDressImage(file); setDressPrev(url); }
    };

    const handlePickFromGallery = (kind) => (item) => {
        const virtualFile = { _galleryUrl: item.url, name: item.name || 'gallery' };
        if (kind === 'bride') { setBrideImage(virtualFile); setBridePrev(item.url); }
        if (kind === 'dress') { setDressImage(virtualFile); setDressPrev(item.url); }
    };

    const handleGenerate = async () => {
        if (!brideImage) {
            setError('Upload a bride photo first.');
            return;
        }
        if (pose === 'custom' && customPrompt.trim().length < 5) {
            setError('Write at least 5 characters describing the pose.');
            return;
        }
        setError(null);
        setImageUrl(null);
        setCompositedUrl(null);
        setGenerating(true);

        // Persist generating state so it survives a tab switch (full page reload).
        // beforeTop = newest history path now, used to detect the new result later.
        const beforeTop = ((recent[0]?.video_url || recent[0]?.url) || '').split('?')[0];
        const pending = { startedAt: Date.now(), beforeTop };
        pendingRef.current = pending;
        localStorage.setItem('lp_img_generating', JSON.stringify(pending));
        localStorage.removeItem('lp_img_result');

        try {
            const res = await generateImage({
                brideImage, dressImage,
                pose,
                customPrompt: pose === 'custom' ? customPrompt : '',
                model, aspectRatio, resolution, quality,
            });
            const data = res?.data;
            if (!data?.imageUrl) throw new Error('No image URL returned');
            setImageUrl(data.imageUrl);
            // Persist result + clear pending so the middle preview survives tab switches
            localStorage.setItem('lp_img_result', data.imageUrl);
            localStorage.removeItem('lp_img_generating');
            pendingRef.current = null;

            // Logo overlay (canvas) — automatic if user kept it enabled
            if (addLogo) {
                try {
                    const blob = await composeWithLogo(data.imageUrl, LOGO_URL, {
                        corner: 'top-right', logoScale: 0.18, padding: 0.04, shadow: true,
                    });
                    const localUrl = URL.createObjectURL(blob);
                    setCompositedUrl(localUrl);
                    // Save composited version permanently in background
                    saveCompositedImage(blob, data.imageUrl)
                        .then(r => console.log('Saved composited:', r?.data?.url))
                        .catch(e => console.warn('Composited save failed:', e.message));
                } catch (e) {
                    console.warn('Logo compose failed (CORS?):', e.message);
                }
            }
            // Optimistic update — push image into history immediately without waiting for DB round-trip
            const newItem = {
                id           : Date.now(),
                video_url    : data.imageUrl,
                thumbnail_url: data.imageUrl,
                type         : 'image_generated',
                created_at   : new Date().toISOString(),
            };
            setRecent(prev => [newItem, ...prev].slice(0, 18));
            // Also refresh from DB after a short delay to get the real saved record
            setTimeout(() => loadRecent(), 1500);
        } catch (err) {
            setError(err.message || 'Generation failed');
            localStorage.removeItem('lp_img_generating');
            pendingRef.current = null;
        } finally {
            setGenerating(false);
        }
    };

    // Determine which resolution + quality options the selected model supports
    const modelMeta  = MODELS.find(m => m.id === model) || MODELS[0];
    const showQuality = modelMeta.supports.includes('quality');
    const showRes     = modelMeta.supports.includes('resolution');

    const displayUrl = compositedUrl || imageUrl;

    // ─── Responsive layout primitives ─────────────────
    const gridCols = isDesktop ? '380px 1fr 320px' : isTablet ? '340px 1fr' : '1fr';
    const railScroll = isDesktop
        ? { overflow: 'auto', maxHeight: 'calc(100vh - 60px)' }
        : { overflow: 'visible', maxHeight: 'none' };
    const rightRailSpan = isTablet ? { gridColumn: '1 / -1' } : {};
    const previewMinH = isMobile ? 280 : 460;
    const pad = isMobile ? 14 : 18;

    // Dashed "View all →" pill used under collapsed Pose / History sections
    const viewAllBtn = {
        width: '100%', padding: '11px 14px', borderRadius: 12,
        background: 'transparent', color: C.accent,
        border: `1px dashed ${C.accent}55`, cursor: 'pointer',
        fontFamily: FONTS.body, fontSize: '0.82em', fontWeight: 700,
        letterSpacing: '0.3px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, transition: 'all 0.15s',
    };

    // ─── Pose presets: show a few inline, rest behind "View all" ───
    const POSE_PREVIEW = 3;
    let visiblePoses = poses.slice(0, POSE_PREVIEW);
    // Always keep the currently-selected pose visible even if it's deeper in the list
    if (!visiblePoses.some(p => p.id === pose)) {
        const sel = poses.find(p => p.id === pose);
        if (sel) visiblePoses = [sel, ...visiblePoses.slice(0, POSE_PREVIEW - 1)];
    }

    // Renders one pose preset card. `closeModalAfter` dismisses the
    // "View all poses" popup once a pose is chosen.
    const renderPoseCard = (p, closeModalAfter = false) => {
        const look = POSE_LOOK[p.id] || POSE_LOOK.custom;
        const active = pose === p.id;
        return (
            <button key={p.id}
                onClick={() => {
                    setPose(p.id);
                    if (p.id !== 'custom') setCustomPrompt('');
                    if (closeModalAfter) setShowAllPoses(false);
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    background: active ? 'rgba(178,74,96,0.12)' : C.panel2,
                    border: active ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
                    color: C.text, cursor: 'pointer',
                    textAlign: 'left', fontFamily: FONTS.body,
                    transition: 'all 0.15s', width: '100%',
                }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 9,
                    background: look.grad, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: active ? C.accent : C.textDim, flexShrink: 0,
                }}><look.Icon size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92em' }}>{p.label}</div>
                    <div style={{ fontSize: '0.78em', color: C.textDim,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: closeModalAfter ? 'normal' : 'nowrap' }}>
                        {p.description}
                    </div>
                </div>
                {active && <div style={{ color: C.accent, fontSize: '1.05em' }}>✓</div>}
            </button>
        );
    };

    // ─── History: show a few thumbnails inline, rest behind "View all" ───
    const visibleHistory = recent.filter(item => {
        const url = item.thumbnail_url || item.video_url;
        return url && !failedUrls.has(url);
    });
    const HISTORY_PREVIEW = 4;

    // Renders one history poster thumbnail. `closeModalAfter` dismisses the
    // "View all" popup after a poster is opened in the preview modal.
    const renderHistoryThumb = (item, closeModalAfter = false) => {
        const url = item.thumbnail_url || item.video_url;
        return (
            <div key={item.id}
                onClick={() => { setPreviewImage(item); if (closeModalAfter) setShowAllHistory(false); }}
                style={{ cursor: 'pointer', position: 'relative' }}
                title="Click to preview">
                <img src={url} alt=""
                    onError={() => setFailedUrls(prev => new Set(prev).add(url))}
                    style={{
                        width: '100%', aspectRatio: '3/4', objectFit: 'cover',
                        borderRadius: 8, border: `1px solid ${C.border}`,
                        transition: 'opacity 0.15s', display: 'block',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'} />
            </div>
        );
    };

    return (
        <div style={{
            background: C.bg, color: C.text, minHeight: '100vh',
            fontFamily: FONTS.body, fontSize: '14px',
        }}>
            {/* In-platform image preview modal */}
            {previewImage && (
                <ImagePreviewModal
                    image={previewImage}
                    onClose={() => setPreviewImage(null)}
                />
            )}

            {/* TOP BAR */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap',
                padding: isMobile ? '11px 16px' : '14px 24px',
                borderBottom: `1px solid ${C.border}`,
                background: C.bg, position: 'sticky', top: 0, zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center',
                    gap: isMobile ? 16 : 28 }}>
                    <a href="/" style={{ textDecoration: 'none' }}>
                        <LadiesPlanetLogo height={isMobile ? 22 : 26} variant="cream" />
                    </a>
                    <nav style={{ display: 'flex', gap: isMobile ? 14 : 22, color: C.textDim,
                        fontSize: '0.78em', fontWeight: 500,
                        textTransform: 'uppercase', letterSpacing: '0.16em',
                        fontFamily: FONTS.body }}>
                        <a href="/studio"       style={{ color: C.textDim, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}><IconVideo size={14} /> Video</a>
                        <a href="/image-studio" style={{ color: C.text, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
                            borderBottom: `2px solid ${C.accent}`, paddingBottom: 4 }}><IconImage size={14} /> Image</a>
                        <a href="/pricing"      style={{ color: C.textDim, textDecoration: 'none' }}>Pricing</a>
                    </nav>
                </div>
                <div style={{ fontSize: '0.84em', color: C.textDim, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Cost preview: <strong style={{ color: C.accent, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{costLoading ? '…' : <><IconSpark size={13} /> {cost.credits}</>}</strong>
                </div>
            </header>

            {/* RESPONSIVE GRID */}
            <div style={{
                display: 'grid', gridTemplateColumns: gridCols,
                gap: 1, minHeight: 'calc(100vh - 60px)', background: C.border,
            }}>
                {/* LEFT — settings */}
                <aside style={{
                    background: C.panel, padding: pad, ...railScroll,
                }}>
                    {/* Bride upload */}
                    <SectionHeader>Bride photo</SectionHeader>
                    <UploadBox preview={bridePrev}
                        Icon={IconUser}
                        onPickFile={onPickFile('bride')}
                        onPickGallery={() => setPickerOpen('bride')}
                        label="Upload bride photo" />

                    {/* Dress upload (optional) */}
                    <SectionHeader>Dress photo (optional)</SectionHeader>
                    <UploadBox preview={dressPrev}
                        onPickFile={onPickFile('dress')}
                        onPickGallery={() => setPickerOpen('dress')}
                        label="Upload dress photo"
                        Icon={IconDress} />

                    {/* Pose presets */}
                    {pickerOpen && (
                        <AssetPicker
                            type={pickerOpen}
                            onPick={handlePickFromGallery(pickerOpen)}
                            onClose={() => setPickerOpen(null)} />
                    )}

                    <SectionHeader>Pose</SectionHeader>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {visiblePoses.map(p => renderPoseCard(p, false))}
                        {poses.length > visiblePoses.length && (
                            <button onClick={() => setShowAllPoses(true)} style={viewAllBtn}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(178,74,96,0.07)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                View all poses ({poses.length}) →
                            </button>
                        )}
                    </div>

                    {pose === 'custom' && (
                        <div style={{ marginTop: 12 }}>
                            <textarea value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder={`Type a few keywords… e.g. "bride seated romantic pose"`}
                                rows={3}
                                style={{
                                    width: '100%', padding: 10, borderRadius: 10,
                                    background: C.panel2, color: C.text,
                                    border: `1px solid ${C.border}`,
                                    fontFamily: FONTS.body, fontSize: '0.88em',
                                    boxSizing: 'border-box', resize: 'vertical',
                                    outline: 'none',
                                }} />
                            {customPrompt.trim().length >= 3 && (
                                <div style={{ marginTop: 8, padding: 8,
                                    background: 'rgba(178,74,96,0.06)',
                                    border: `1px solid ${C.accent}33`, borderRadius: 8,
                                    fontSize: '0.78em', color: C.accent, lineHeight: 1.5 }}>
                                    Your keywords will auto-expand into a rich poster direction at generation.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Model picker */}
                    <SectionHeader>Model</SectionHeader>
                    <select value={model} onChange={(e) => setModel(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: 10,
                            background: C.panel2, color: C.text,
                            border: `1px solid ${C.border}`,
                            fontSize: '0.92em', fontFamily: FONTS.body, fontWeight: 500,
                            cursor: 'pointer', marginBottom: 14,
                        }}>
                        {MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.label} — {m.hint}</option>
                        ))}
                    </select>

                    {/* Settings chips */}
                    <SectionHeader>Settings</SectionHeader>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {ASPECTS.map(a => (
                            <button key={a.id} onClick={() => setAspectRatio(a.id)}
                                style={chip(aspectRatio === a.id)}>{a.label}</button>
                        ))}
                    </div>
                    {showRes && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                            {RESOLUTIONS.map(r => (
                                <button key={r} onClick={() => setResolution(r)}
                                    style={{ ...chip(resolution === r), display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconImage size={13} /> {r}</button>
                            ))}
                        </div>
                    )}
                    {showQuality && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                            {QUALITIES.map(q => (
                                <button key={q} onClick={() => setQuality(q)}
                                    style={{ ...chip(quality === q), display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconBolt size={13} /> {q}</button>
                            ))}
                        </div>
                    )}
                    <button onClick={() => setAddLogo(!addLogo)} style={{ ...chip(addLogo), display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <IconTag size={14} /> Add Ladies Planet logo
                    </button>

                    {/* Generate button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || costLoading || !brideImage}
                        onMouseEnter={(e) => { if (!generating) { e.currentTarget.style.boxShadow = '0 14px 44px rgba(178,74,96,0.48)'; e.currentTarget.style.filter = 'brightness(1.05)'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = generating ? 'none' : '0 10px 32px rgba(178,74,96,0.30)'; e.currentTarget.style.filter = 'none'; }}
                        style={{
                            width: '100%', marginTop: 18, padding: '16px', borderRadius: 12,
                            border: 'none',
                            background: generating ? '#3a3a3a' : 'linear-gradient(135deg, #C96A80 0%, #B24A60 52%, #8C2F43 100%)',
                            color: generating ? C.textDim : '#FFFFFF',
                            boxShadow: generating ? 'none' : '0 10px 32px rgba(178,74,96,0.30)',
                            fontSize: '1.05em', fontWeight: 800,
                            fontFamily: FONTS.body,
                            cursor: generating ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 10, letterSpacing: '0.3px', transition: 'all 0.2s',
                        }}>
                        {generating ? 'Generating image…'
                            : <>Generate <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconSpark size={14} /> {cost.credits}</span></>}
                    </button>
                    <div style={{ fontSize: '0.78em', color: C.textDim,
                        textAlign: 'center', marginTop: 8, minHeight: 18 }}>
                        {costLoading ? <span style={{ color: C.accent }}>Calculating…</span>
                            : <>{aspectRatio} · {showRes ? resolution : 'auto'}{showQuality ? ` · ${quality}` : ''}
                                {cost.source === 'engine' && (
                                    <span title="Exact cost from engine"
                                        style={{ marginLeft: 6, color: C.accent }}>●</span>
                                )}
                            </>
                        }
                    </div>

                    {error && (
                        <div style={{ marginTop: 12, padding: 10,
                            background: 'rgba(239,83,80,0.15)', color: '#ff8a80',
                            borderRadius: 8, fontSize: '0.82em',
                            display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <IconWarn size={14} style={{ marginTop: 2, flexShrink: 0 }} /> <span>{error}</span>
                        </div>
                    )}
                </aside>

                {/* CENTER — output */}
                <main style={{ background: C.bg, padding: isMobile ? 16 : 24,
                    display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: 24, marginBottom: 20,
                        borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                        <span style={{ color: C.text, fontWeight: 600,
                            borderBottom: `2px solid ${C.accent}`, paddingBottom: 10,
                            fontFamily: FONTS.body,
                            display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconImage size={15} /> Poster preview</span>
                    </div>

                    <div style={{
                        flex: 1, background: C.panel,
                        borderRadius: 14, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minHeight: previewMinH, position: 'relative',
                    }}>
                        {displayUrl ? (
                            <img src={displayUrl} alt="Generated poster"
                                style={{ maxWidth: '100%', maxHeight: '74vh', borderRadius: 10 }} />
                        ) : generating ? (
                            <div style={{ textAlign: 'center', color: C.text }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, color: C.accent }}><IconSpark size={38} /></div>
                                <div style={{ fontFamily: FONTS.display, fontSize: '1.3em', fontWeight: 500 }}>
                                    Generating your poster…
                                </div>
                                <div style={{ marginTop: 8, fontSize: '0.92em', color: C.textDim }}>
                                    {modelMeta.label} is crafting your poster…
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: C.textDim2, padding: '0 24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, color: C.textDim }}><IconImage size={48} /></div>
                                <div style={{ fontFamily: FONTS.display,
                                    fontSize: '1.5em', fontWeight: 400, color: C.text, fontStyle: 'italic' }}>
                                    Your bridal poster appears here
                                </div>
                                <div style={{ marginTop: 10, fontSize: '0.9em', color: C.textDim, letterSpacing: '0.03em' }}>
                                    Upload a bride photo, pick a pose, then press Generate
                                </div>
                            </div>
                        )}
                    </div>

                    {displayUrl && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button onClick={() => downloadFile(displayUrl, 'ladies-planet-poster')} style={{
                                padding: '12px 22px', borderRadius: 10,
                                background: C.accent, color: '#FFFFFF', border: 'none',
                                cursor: 'pointer', fontWeight: 700,
                                fontSize: '0.92em', fontFamily: FONTS.body,
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                            }}><IconDownload size={15} /> Download</button>
                            {imageUrl && !compositedUrl && (
                                <button onClick={async () => {
                                    try {
                                        const blob = await composeWithLogo(imageUrl, LOGO_URL, {
                                            corner: 'top-right', logoScale: 0.18, padding: 0.04, shadow: true,
                                        });
                                        setCompositedUrl(URL.createObjectURL(blob));
                                        saveCompositedImage(blob, imageUrl).catch(()=>{});
                                    } catch (e) {
                                        setError('Logo overlay failed: ' + e.message);
                                    }
                                }} style={{
                                    padding: '12px 22px', borderRadius: 10,
                                    background: C.panel2, color: C.text,
                                    border: `1px solid ${C.border}`, cursor: 'pointer',
                                    fontWeight: 700, fontSize: '0.92em', fontFamily: FONTS.body,
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                }}><IconTag size={15} /> Add Logo</button>
                            )}
                            {compositedUrl && imageUrl && (
                                <button onClick={() => setCompositedUrl(null)} style={{
                                    padding: '12px 22px', borderRadius: 10,
                                    background: 'transparent', color: C.textDim,
                                    border: `1px solid ${C.border}`, cursor: 'pointer',
                                    fontSize: '0.92em', fontFamily: FONTS.body, fontWeight: 600,
                                }}>↩ Show original</button>
                            )}
                            <a href={`https://wa.me/?text=${encodeURIComponent(displayUrl)}`}
                                target="_blank" rel="noopener" style={{
                                padding: '12px 22px', borderRadius: 10,
                                background: C.panel2, color: C.text,
                                border: `1px solid ${C.border}`,
                                textDecoration: 'none', fontWeight: 700,
                                fontSize: '0.92em', fontFamily: FONTS.body,
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                            }}><IconSend size={15} /> Send</a>
                            <button onClick={() => { setImageUrl(null); setCompositedUrl(null); }} style={{
                                padding: '12px 22px', borderRadius: 10,
                                background: 'transparent', color: C.textDim,
                                border: `1px solid ${C.border}`, cursor: 'pointer',
                                fontSize: '0.92em', fontFamily: FONTS.body, fontWeight: 600,
                            }}>Reset</button>
                        </div>
                    )}
                </main>

                {/* RIGHT — history */}
                <aside style={{
                    background: C.panel, padding: pad, ...railScroll, ...rightRailSpan,
                }}>
                    <SectionHeader>
                        History <span style={{ color: C.textDim2 }}>({visibleHistory.length})</span>
                    </SectionHeader>
                    {visibleHistory.length === 0 ? (
                        <div style={{ fontSize: '0.84em', color: C.textDim,
                            fontStyle: 'italic', padding: 12 }}>
                            No images yet. Generate your first poster!
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'grid',
                                gridTemplateColumns: isDesktop ? '1fr 1fr' : 'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: 8 }}>
                                {visibleHistory.slice(0, HISTORY_PREVIEW).map(item => renderHistoryThumb(item, false))}
                            </div>
                            {visibleHistory.length > HISTORY_PREVIEW && (
                                <button onClick={() => setShowAllHistory(true)}
                                    style={{ ...viewAllBtn, marginTop: 10 }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(178,74,96,0.07)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    View all history ({visibleHistory.length}) →
                                </button>
                            )}
                        </>
                    )}
                </aside>
            </div>

            {/* ═══════ "View all poses" popup ═══════ */}
            {showAllPoses && (
                <ViewAllModal
                    title="All Poses"
                    subtitle="Pick a pose direction for your bridal poster"
                    onClose={() => setShowAllPoses(false)}>
                    <div style={{ display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: 10 }}>
                        {poses.map(p => renderPoseCard(p, true))}
                    </div>
                </ViewAllModal>
            )}

            {/* ═══════ "View all history" popup ═══════ */}
            {showAllHistory && (
                <ViewAllModal
                    title="Your Posters"
                    subtitle={`${visibleHistory.length} poster${visibleHistory.length === 1 ? '' : 's'} · tap any to preview`}
                    onClose={() => setShowAllHistory(false)}>
                    {visibleHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', color: C.textDim2,
                            padding: 40, fontFamily: FONTS.display, fontStyle: 'italic' }}>
                            No posters yet
                        </div>
                    ) : (
                        <div style={{ display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: 12 }}>
                            {visibleHistory.map(item => renderHistoryThumb(item, true))}
                        </div>
                    )}
                </ViewAllModal>
            )}

        </div>
    );
}

// ── Reusable upload box ──────────────────────────────────────
function UploadBox({ preview, onPickFile, onPickGallery, label, Icon }) {
    return (
        <div style={{
            border: `1px dashed ${C.border}`, borderRadius: 12,
            background: C.panel2, padding: preview ? 0 : 16,
            position: 'relative', overflow: 'hidden', minHeight: 120,
        }}>
            {preview ? (
                <img src={preview} alt="preview"
                    style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            ) : (
                <div style={{
                    textAlign: 'center', color: C.textDim, padding: 18,
                    fontSize: '0.92em',
                }}>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: C.textDim }}>{Icon && <Icon size={22} />}</div>
                    {label}
                </div>
            )}
            <div style={{ display: 'flex', gap: 6, padding: 8, background: C.panel2 }}>
                <label style={{
                    flex: 1, textAlign: 'center', padding: '6px 10px',
                    background: C.accent, color: '#FFFFFF', borderRadius: 6,
                    fontSize: '0.78em', fontWeight: 700, cursor: 'pointer',
                    fontFamily: FONTS.body,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <IconUpload size={13} /> Upload
                    <input type="file" accept="image/*" onChange={onPickFile}
                        style={{ display: 'none' }} />
                </label>
                <button onClick={onPickGallery} style={{
                    flex: 1, padding: '6px 10px', background: C.panel,
                    color: C.text, border: `1px solid ${C.border}`,
                    borderRadius: 6, fontSize: '0.78em', cursor: 'pointer',
                    fontFamily: FONTS.body, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}><IconFolder size={13} /> Library</button>
            </div>
        </div>
    );
}
