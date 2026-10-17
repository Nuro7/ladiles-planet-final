/**
 * BridalVideoStudio.jsx — premium dark UI, race-safe cost fetcher
 */

import { useEffect, useRef, useState } from 'react';
import {
    getScenarios, getBalance, calculateCost,
    generateVideo, getSession, enhancePrompt,
    extendVideo as extendVideoApi,
} from '../api/bridalVideo';
import { downloadFile } from '../api/bridalImage';
import EngineStatus from './EngineStatus';
import AssetPicker from './AssetPicker';
import GeneratingExperience from './GeneratingExperience';
import LadiesPlanetLogo from './LadiesPlanetLogo';
import ViewAllModal from './ViewAllModal';
import useBreakpoint from '../hooks/useBreakpoint';

const API = import.meta.env.VITE_API_URL || '/api';

const MODELS = [
    { id: 'seedance-2.0-fast', label: 'Cinematic AI',     hint: 'Recommended · multi-reference' },
    { id: 'seedance-2.0',      label: 'Cinematic AI Pro', hint: 'Higher quality · slower' },
    { id: 'grok-imagine-1.5',  label: 'Grok Imagine 1.5', hint: 'New · expressive cinematic motion · 720p' },
    { id: 'kling-3.0',         label: 'Motion AI',        hint: 'Single image · cinematic motion', plan: 'plus' },
    { id: 'cinema-studio',     label: 'Cinema Studio',    hint: 'Premium cinematic',               plan: 'plus' },
];

const DURATIONS    = [4, 5, 8, 10, 15];
const ASPECT       = '16:9';

// Resolution options per model — mirrors Higgsfield's own UI caps.
// Seedance Fast tops out at 720p; only Seedance Pro (std) unlocks 1080p.
// Kling 3.0 encodes quality in `mode` (std/pro/4k); no resolution param.
// Cinema Studio has no resolution param — engine picks its own.
const RESOLUTIONS_BY_MODEL = {
    'seedance-2.0-fast' : ['480p', '720p'],
    'seedance-2.0'      : ['480p', '720p', '1080p'],
    'grok-imagine-1.5'  : ['720p'],                  // Higgsfield Grok Imagine 1.5 — 720p
    'kling-3.0'         : ['720p', '1080p', '4K'],   // visual only — mapped via mode
    'cinema-studio'     : ['720p', '1080p'],          // visual only — engine default
};
const getResolutionsFor = (m) => RESOLUTIONS_BY_MODEL[m] || ['480p', '720p', '1080p'];

// Preset scenario visuals — neutral tile + SVG icon per scenario (monochrome)
const SCENARIO_LOOK = {
    stage_entry:     { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconHeart },
    outdoor_romantic:{ grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconLeaf },
    sangeet_dance:   { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconMusic },
    sofa_pose:       { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconCamera },
    reception_walk:  { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconWalk },
    custom:          { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconPencil },
};

const CUSTOM_SCENARIO = {
    id: 'custom',
    label: 'Custom Prompt',
    description: 'Write your own scene — AI auto-enhances',
};

// Glossy-black surfaces — vertical gradients (lighter top → deep bottom) give
// the panels a polished, piano-black sheen instead of flat matte. C.border
// stays a solid colour (used for 1px edges).
const C = {
    bg:        'linear-gradient(180deg, #161616 0%, #0b0b0b 52%, #070707 100%)',
    panel:     'linear-gradient(180deg, #1f1f1f 0%, #131313 100%)',
    panel2:    'linear-gradient(180deg, #262626 0%, #181818 100%)',
    panel3:    'linear-gradient(180deg, #2c2c2c 0%, #202020 100%)',
    border:    '#333333',
    text:      '#f5f5f5',
    textDim:   '#9a9a9a',
    textDim2:  '#5f5f5f',
    accent:    '#B24A60',   /* wine / burgundy — matches the primary-button gradient */
    primary:   '#c44569',
    danger:    '#ef5350',
};

const FONTS = {
    display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    body:    '"Inter", "Jost", system-ui, sans-serif',
    mono:    '"SF Mono", "JetBrains Mono", Consolas, monospace',
};

// "Premium Glow" — deep wine / burgundy gradient for the primary action.
// Reads as elite/luxury against the glossy-black UI and pops as the single CTA.
const GOLD_GRAD       = 'linear-gradient(135deg, #C96A80 0%, #B24A60 52%, #8C2F43 100%)';
const GOLD_GLOW       = '0 10px 32px rgba(178, 74, 96, 0.30)';
const GOLD_GLOW_HOVER = '0 14px 44px rgba(178, 74, 96, 0.48)';

// ─── SVG icon set (no emoji) — function declarations are hoisted so the
//     scenario presets below can reference them. ─────────────────────────
function IconBase({ size = 16, children, ...p }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }} {...p}>{children}</svg>
    );
}
function IconVideo(p)   { return <IconBase {...p}><rect x="2.5" y="6" width="14" height="12" rx="2.5" /><path d="M16.5 10l5-2.5v9l-5-2.5" /></IconBase>; }
function IconImage(p)   { return <IconBase {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5L5 20" /></IconBase>; }
function IconClock(p)   { return <IconBase {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></IconBase>; }
function IconRatio(p)   { return <IconBase {...p}><rect x="3" y="6" width="18" height="12" rx="2" /></IconBase>; }
function IconMonitor(p) { return <IconBase {...p}><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M9 20h6M12 16.5V20" /></IconBase>; }
function IconSound(p)   { return <IconBase {...p}><path d="M4 9v6h3.5L13 19V5L7.5 9H4Z" /><path d="M16.5 9.5a4 4 0 0 1 0 5" /></IconBase>; }
function IconMute(p)    { return <IconBase {...p}><path d="M4 9v6h3.5L13 19V5L7.5 9H4Z" /><path d="M17 10l3 4M20 10l-3 4" /></IconBase>; }
function IconDownload(p){ return <IconBase {...p}><path d="M12 4v11M7.5 11l4.5 4 4.5-4M5 20h14" /></IconBase>; }
function IconSend(p)    { return <IconBase {...p}><path d="M21 4L3 11l7 2.5L13 21l8-17Z" /><path d="M10 13.5L21 4" /></IconBase>; }
function IconSpark(p)   { return <IconBase {...p}><path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" fill="currentColor" stroke="none" /></IconBase>; }
function IconGem(p)     { return <IconBase {...p}><path d="M6 4h12l3 5-9 11L3 9l3-5Z" /><path d="M3 9h18M9 4l-1.5 5L12 20l4.5-11L15 4" /></IconBase>; }
function IconStar(p)    { return <IconBase {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z" fill="currentColor" stroke="none" /></IconBase>; }
function IconFolder(p)  { return <IconBase {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></IconBase>; }
function IconBook(p)    { return <IconBase {...p}><path d="M4 5h7v15H6a2 2 0 0 1-2-2V5z" /><path d="M20 5h-7v15h5a2 2 0 0 0 2-2V5z" /></IconBase>; }
function IconWarn(p)    { return <IconBase {...p}><path d="M12 4l9 16H3l9-16Z" /><path d="M12 10v4M12 17.5v.5" /></IconBase>; }
function IconRefresh(p) { return <IconBase {...p}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" /><path d="M4 20v-4h4" /></IconBase>; }
function IconHeart(p)   { return <IconBase {...p}><path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20Z" /></IconBase>; }
function IconLeaf(p)    { return <IconBase {...p}><path d="M5 19c0-8 6-13 14-13 0 8-5 14-13 14" /><path d="M5 19c2-5 5-8 9-10" /></IconBase>; }
function IconMusic(p)   { return <IconBase {...p}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></IconBase>; }
function IconCamera(p)  { return <IconBase {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></IconBase>; }
function IconWalk(p)    { return <IconBase {...p}><circle cx="13" cy="4.5" r="1.6" /><path d="M11 9l3-1 2 3 2 1M11 9l-1 5 2 1 1 5M11 9l-3 4" /></IconBase>; }
function IconPencil(p)  { return <IconBase {...p}><path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" /><path d="M14 7l3 3" /></IconBase>; }

export default function BridalVideoStudio() {
    // Responsive breakpoint — drives the column layout below
    const bp = useBreakpoint();
    const isMobile  = bp === 'mobile';
    const isTablet  = bp === 'tablet';
    const isDesktop = bp === 'desktop';

    // File state
    const [brideImage, setBrideImage] = useState(null);
    const [bridePreview, setBridePrev] = useState(null);
    const [dressImage, setDressImage] = useState(null);
    const [dressPreview, setDressPrev] = useState(null);

    // Settings
    const [scenario,     setScenario]    = useState('stage_entry');
    const [customPrompt, setCustomPrompt]= useState('');
    const [enhancedPreview, setEnhancedPreview] = useState(null);
    const [model,        setModel]       = useState('seedance-2.0-fast');
    const [duration,     setDuration]    = useState(5);
    const [resolution,   setResolution]  = useState('720p');
    const [sound,        setSound]       = useState(true);

    // API data
    const [scenarios, setScenarios] = useState([]);
    const [balance,   setBalance]   = useState({ credits: '—' });
    const [cost,      setCost]      = useState({ credits: 0 });
    const [costLoading, setCostLoading] = useState(false);
    const [recentGenerations, setRecent] = useState([]);
    const [failedUrls, setFailedUrls] = useState(() => new Set());

    // Generation
    const [generating, setGenerating] = useState(false);
    const [progress,   setProgress]   = useState({ pct: 0, status: '' });
    const [videoUrl,   setVideoUrl]   = useState(null);
    const [error,      setError]      = useState(null);

    // Asset picker (modal) — 'bride' | 'dress' | null
    const [pickerOpen, setPickerOpen] = useState(null);

    // Extend-video modal state
    const [extendModalOpen, setExtendModalOpen] = useState(false);
    const [extendPrompt,    setExtendPrompt]    = useState('');
    const [extendDuration,  setExtendDuration]  = useState(5);
    const [extending,       setExtending]       = useState(false);

    // "View all" popups — Scene presets + History
    const [showAllScenes,  setShowAllScenes]  = useState(false);
    const [showAllHistory, setShowAllHistory] = useState(false);


    // Cost fetch versioning (race-safe — only latest request updates state)
    const costRequestId = useRef(0);
    // Holds { startedAt, beforeTop } during generation — survives tab switches via localStorage
    const pendingRef = useRef(null);

    // ─── Auto-snap resolution when model changes ───────
    // (e.g. switching from Cinematic AI Pro at 1080p → Cinematic AI Fast
    //  forces snap to 720p, the highest Fast actually supports.)
    const allowedResolutions = getResolutionsFor(model);
    useEffect(() => {
        if (!allowedResolutions.includes(resolution)) {
            setResolution(allowedResolutions[allowedResolutions.length - 1]);
        }
    }, [model]);  // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Load initial data, then auto-sync from Higgsfield every 10s ─────
    useEffect(() => {
        getScenarios().then(setScenarios).catch(() => {});
        getBalance().then(setBalance).catch(() => {});

        // Restore last generated video so the middle preview survives tab switches
        const lastResult = localStorage.getItem('lp_vid_result');
        if (lastResult) setVideoUrl(lastResult);

        // Restore an in-progress generation started before a tab switch / reload
        try {
            const pending = JSON.parse(localStorage.getItem('lp_vid_generating') || 'null');
            if (pending && Date.now() - pending.startedAt < 300000) {
                pendingRef.current = pending;
                setGenerating(true);
                setProgress({ pct: 30, status: 'AI generating…' });
            } else {
                localStorage.removeItem('lp_vid_generating');
            }
        } catch { localStorage.removeItem('lp_vid_generating'); }

        loadRecent();

        // Real-time bridge: poll Higgsfield's generation list every 10s.
        const syncNow = () =>
            fetch(`${API}/videos/sync-higgsfield`, { method: 'POST' })
                .then(() => loadRecent())
                .catch(() => {});
        syncNow();
        const timer = setInterval(syncNow, 10000);
        return () => clearInterval(timer);
    }, []);

    // ─── Derive mode from model selection (Pro variants → std, base → fast) ───
    const effectiveMode = (model.endsWith('-fast') || model === 'kling-3.0') ? 'fast' : 'std';

    // ─── RACE-SAFE COST FETCHER ────────────────────────
    // Monotonic request ID + "just-updated" flash for visual feedback.
    const [costUpdatedAt, setCostUpdatedAt] = useState(0);
    useEffect(() => {
        const myId = ++costRequestId.current;
        setCostLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await calculateCost({
                    model, duration, resolution,
                    mode: effectiveMode, multiShot: true, sound,
                });
                if (myId === costRequestId.current) {
                    setCost(data);
                    setCostLoading(false);
                    setCostUpdatedAt(Date.now());
                }
            } catch (err) {
                if (myId === costRequestId.current) {
                    setCost(prev => ({ ...prev, source: 'error' }));
                    setCostLoading(false);
                }
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [model, duration, resolution, sound, effectiveMode]);

    // ─── "Just updated" flash — auto-clears after 1.2s ───
    const showJustUpdated = costUpdatedAt && (Date.now() - costUpdatedAt) < 1200;
    useEffect(() => {
        if (!costUpdatedAt) return;
        const t = setTimeout(() => setCostUpdatedAt(0), 1200);
        return () => clearTimeout(t);
    }, [costUpdatedAt]);

    // ─── Custom prompt auto-enhance ────────────────────
    useEffect(() => {
        if (customPrompt.trim().length < 5) {
            setEnhancedPreview(null);
            return;
        }
        const id = setTimeout(async () => {
            try {
                const data = await enhancePrompt(customPrompt);
                setEnhancedPreview(data);
            } catch { setEnhancedPreview(null); }
        }, 800);
        return () => clearTimeout(id);
    }, [customPrompt]);

    async function loadRecent() {
        try {
            const res = await fetch(`${API}/videos?type=generated`);
            const json = await res.json();
            const items = json?.data || [];
            // Filter out items with no valid video URL (old bad sync records)
            const valid = Array.isArray(items)
                ? items.filter(v => v.video_url || v.videoUrl)
                : [];
            setRecent(valid.slice(0, 8));

            // If a generation was pending (user switched tabs mid-generation),
            // detect the new result: newest history item's path differs from before.
            if (pendingRef.current && valid.length) {
                const newestUrl  = valid[0].video_url || valid[0].videoUrl;
                const newestPath = (newestUrl || '').split('?')[0];
                if (newestPath && newestPath !== pendingRef.current.beforeTop) {
                    setVideoUrl(newestUrl);
                    setProgress({ pct: 100, status: 'Done' });
                    localStorage.setItem('lp_vid_result', newestUrl);
                    localStorage.removeItem('lp_vid_generating');
                    pendingRef.current = null;
                    setGenerating(false);
                }
            }
        } catch { setRecent([]); }
    }

    const handleFile = (kind, file) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (kind === 'bride') { setBrideImage(file); setBridePrev(url); }
        if (kind === 'dress') { setDressImage(file); setDressPrev(url); }
    };

    // Pick from gallery — uses URL instead of File
    const handlePickFromGallery = (kind) => (item) => {
        if (!item?.url) return;
        // Mark as gallery pick so backend treats URL not file
        const virtualFile = { name: 'gallery-pick', _galleryUrl: item.url };
        if (kind === 'bride') { setBrideImage(virtualFile); setBridePrev(item.url); }
        if (kind === 'dress') { setDressImage(virtualFile); setDressPrev(item.url); }
    };

    const handleGenerate = async () => {
        if (!brideImage || !dressImage) {
            setError('Upload both bride and dress photos.');
            return;
        }
        setError(null); setVideoUrl(null);
        setGenerating(true);
        setProgress({ pct: 5, status: 'Uploading…' });

        // Persist generating state so it survives a tab switch (full page reload).
        const beforeTop = ((recentGenerations[0]?.video_url || recentGenerations[0]?.videoUrl) || '').split('?')[0];
        const pending = { startedAt: Date.now(), beforeTop };
        pendingRef.current = pending;
        localStorage.setItem('lp_vid_generating', JSON.stringify(pending));
        localStorage.removeItem('lp_vid_result');

        try {
            // Validate: custom scenario needs prompt text
            if (scenario === 'custom' && customPrompt.trim().length < 5) {
                setError('Write at least 5 characters in the custom prompt box.');
                setGenerating(false);
                localStorage.removeItem('lp_vid_generating');
                pendingRef.current = null;
                return;
            }
            const res = await generateVideo({
                brideImage, dressImage,
                scenario,
                customPrompt: scenario === 'custom' ? customPrompt : '',
                model, duration, resolution, mode: effectiveMode,
                multiShot: true, sound,
            });
            const sessionId = res?.data?.sessionId || res?.data?.id;
            if (!sessionId) throw new Error('No sessionId returned');
            setProgress({ pct: 15, status: 'AI generating…' });
            const finalUrl = await pollUntilDone(sessionId);
            setVideoUrl(finalUrl);
            setProgress({ pct: 100, status: 'Done' });
            // Persist result + clear pending so the middle preview survives tab switches
            localStorage.setItem('lp_vid_result', finalUrl);
            localStorage.removeItem('lp_vid_generating');
            pendingRef.current = null;
            getBalance().then(setBalance).catch(() => {});
            // Optimistic update — push video into history immediately without waiting for DB round-trip
            const newItem = {
                id           : Date.now(),
                video_url    : finalUrl,
                thumbnail_url: finalUrl,
                type         : 'generated',
                created_at   : new Date().toISOString(),
            };
            setRecent(prev => [newItem, ...prev].slice(0, 8));
            setTimeout(() => loadRecent(), 1500);
        } catch (err) {
            setError(err.message || 'Generation failed');
            setProgress({ pct: 0, status: '' });
            localStorage.removeItem('lp_vid_generating');
            pendingRef.current = null;
        } finally { setGenerating(false); }
    };

    const handleExtend = async () => {
        if (!videoUrl) return;
        if (extendPrompt.trim().length < 5) {
            setError('Describe what should happen next (at least 5 characters).');
            return;
        }
        setExtending(true);
        setError(null);
        try {
            const res = await extendVideoApi({
                videoUrl,
                prompt    : extendPrompt,
                duration  : Number(extendDuration) || 5,
                resolution,
                model,
                mode      : effectiveMode,
            });
            const sessionId = res?.sessionId;
            if (!sessionId) throw new Error('No sessionId returned for extend');

            // Close modal and switch the main view back into "generating" mode
            // while we poll. Reuse the existing GeneratingExperience UI.
            setExtendModalOpen(false);
            setVideoUrl(null);
            setGenerating(true);
            setProgress({ pct: 15, status: 'AI extending your video…' });

            const finalUrl = await pollUntilDone(sessionId);
            setVideoUrl(finalUrl);
            setProgress({ pct: 100, status: 'Extension ready' });
            loadRecent();
        } catch (err) {
            setError(err.message || 'Extend failed');
            setProgress({ pct: 0, status: '' });
        } finally {
            setExtending(false);
            setGenerating(false);
        }
    };

    async function pollUntilDone(sessionId) {
        // Some videos take 8-12 minutes. Poll up to 15 minutes max.
        const MAX = 225;          // 225 × 4s = 900s = 15 min
        const INTERVAL = 4000;
        let consecutiveErrors = 0;
        for (let i = 0; i < MAX; i++) {
            await new Promise(r => setTimeout(r, INTERVAL));
            let data;
            try {
                const s = await getSession(sessionId);
                data = s?.data || s;
                consecutiveErrors = 0;     // reset on successful network poll
            } catch (e) {
                // Network blip — tolerate up to 5 in a row before giving up.
                // (Only network errors land here; backend-reported errors are
                // handled below, NOT counted as blips — that bug caused the
                // mysterious "loader vanishes at 30s" symptom.)
                consecutiveErrors++;
                if (consecutiveErrors > 5) throw e;
                continue;
            }
            const status = data?.status;
            const pct = Number(data?.progress) || Math.min(95, 15 + i * 0.6);
            setProgress({ pct, status: data?.message || status || 'AI generating…' });
            if (status === 'completed') {
                return data?.result?.videoUrl || data?.videoUrl
                    || data?.result?.allShotUrls?.[0] || data?.allShotUrls?.[0];
            }
            if (status === 'error' || status === 'failed') {
                // Strip the "Error: " prefix sessionService.fail prepends, so
                // the message reads cleanly in the UI.
                const raw = data?.error || data?.message || 'Pipeline failed';
                throw new Error(String(raw).replace(/^Error:\s*/, ''));
            }
        }
        throw new Error('Timed out after 15 minutes');
    }

    // ─── Inline styles ─────────────────────────────────
    const chip = (active) => ({
        padding: '8px 14px', borderRadius: 10, fontSize: '0.85em',
        border: active ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
        background: active ? 'rgba(178,74,96,0.1)' : C.panel2,
        color: active ? C.accent : C.text,
        cursor: 'pointer', fontWeight: active ? 600 : 500,
        fontFamily: FONTS.body, whiteSpace: 'nowrap', transition: 'all 0.15s',
    });

    // ─── Responsive layout primitives ─────────────────
    // Desktop: 3 columns. Tablet: settings + preview, history spans a full row
    // beneath. Mobile: everything stacks in a single scrolling column.
    const gridCols = isDesktop ? '380px 1fr 320px' : isTablet ? '340px 1fr' : '1fr';
    // On desktop each rail scrolls independently; on smaller screens the whole
    // page scrolls so we drop the fixed height + inner scroll.
    const railScroll = isDesktop
        ? { overflow: 'auto', maxHeight: 'calc(100vh - 60px)' }
        : { overflow: 'visible', maxHeight: 'none' };
    const rightRailSpan = isTablet ? { gridColumn: '1 / -1' } : {};
    const previewMinH = isMobile ? 280 : 460;
    const pad = isMobile ? 14 : 18;

    // Dashed "View all →" pill used under collapsed Scene / History sections
    const viewAllBtn = {
        width: '100%', padding: '11px 14px', borderRadius: 12,
        background: 'transparent', color: C.accent,
        border: `1px dashed ${C.accent}55`, cursor: 'pointer',
        fontFamily: FONTS.body, fontSize: '0.82em', fontWeight: 700,
        letterSpacing: '0.3px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, transition: 'all 0.15s',
    };

    // ─── Scene presets: show a few inline, rest behind "View all" ───
    const allScenes = [...scenarios, CUSTOM_SCENARIO];
    const SCENE_PREVIEW = 3;
    let visibleScenes = allScenes.slice(0, SCENE_PREVIEW);
    // Always keep the currently-selected scene visible even if it's deeper in the list
    if (!visibleScenes.some(s => s.id === scenario)) {
        const sel = allScenes.find(s => s.id === scenario);
        if (sel) visibleScenes = [sel, ...visibleScenes.slice(0, SCENE_PREVIEW - 1)];
    }

    // Renders one scene preset card. `closeModalAfter` is true when rendered
    // inside the "View all scenes" popup so selecting also dismisses it.
    const renderSceneCard = (s, closeModalAfter = false) => {
        const look = SCENARIO_LOOK[s.id] || { grad: 'linear-gradient(135deg,#2e2e2e,#161616)', Icon: IconVideo };
        const active = scenario === s.id;
        const isCustom = s.id === 'custom';
        const customMode = scenario === 'custom';
        const dimmed = !closeModalAfter && !active && customMode && !isCustom;
        return (
            <button key={s.id}
                onClick={() => {
                    setScenario(s.id);
                    if (s.id !== 'custom') setCustomPrompt('');
                    if (closeModalAfter) setShowAllScenes(false);
                }}
                disabled={dimmed}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 12,
                    border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                    background: active
                        ? (isCustom ? 'rgba(178,74,96,0.08)' : 'rgba(178,74,96,0.14)')
                        : C.panel2,
                    color: dimmed ? C.textDim2 : C.text,
                    cursor: dimmed ? 'not-allowed' : 'pointer',
                    textAlign: 'left', transition: 'all 0.15s',
                    boxShadow: active ? `0 4px 14px ${C.accent}22` : 'none',
                    opacity: dimmed ? 0.45 : 1, width: '100%',
                }}>
                <div style={{
                    width: 46, height: 46, borderRadius: 10,
                    background: look.grad, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: active ? C.text : C.textDim,
                    border: `1px solid ${C.border}`,
                    filter: dimmed ? 'grayscale(0.5)' : 'none',
                }}>
                    <look.Icon size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: FONTS.display, fontWeight: 700,
                        fontSize: '0.98em', color: dimmed ? C.textDim2 : C.text,
                        marginBottom: 2,
                    }}>
                        {s.label}
                    </div>
                    <div style={{ fontSize: '0.76em', color: C.textDim,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: closeModalAfter ? 'normal' : 'nowrap' }}>
                        {s.description}
                    </div>
                </div>
                {active && (
                    <div style={{ color: C.accent, fontSize: '1.1em' }}>✓</div>
                )}
            </button>
        );
    };

    // ─── History: show a few thumbnails inline, rest behind "View all" ───
    const visibleHistory = recentGenerations.filter(item => {
        const url = item.video_url || item.videoUrl;
        return url && !failedUrls.has(url);
    });
    const HISTORY_PREVIEW = 4;

    // Renders one history video thumbnail. `closeModalAfter` dismisses the
    // "View all" popup after a clip is chosen for the main preview.
    const renderVideoThumb = (item, i, closeModalAfter = false) => {
        const url = item.video_url || item.videoUrl;
        return (
            <div key={item.id || i} style={{
                borderRadius: 10, overflow: 'hidden',
                background: C.panel2, cursor: 'pointer',
                border: `1px solid ${C.border}`,
            }} onClick={() => { if (url) setVideoUrl(url); if (closeModalAfter) setShowAllHistory(false); }}>
                <video src={url} muted loop autoPlay playsInline
                    onError={() => setFailedUrls(prev => new Set(prev).add(url))}
                    style={{ width: '100%', height: 86, objectFit: 'cover' }} />
            </div>
        );
    };

    return (
        <div style={{
            background: C.bg, color: C.text, minHeight: '100vh',
            fontFamily: FONTS.body, fontSize: '14px',
        }}>
            {/* ═══════ TOP BAR ═══════ */}
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
                        <LadiesPlanetLogo height={isMobile ? 22 : 26} variant="white" />
                    </a>
                    <nav style={{ display: 'flex', gap: isMobile ? 16 : 28, color: C.textDim,
                        fontSize: '0.78em', fontWeight: 500,
                        textTransform: 'uppercase', letterSpacing: '0.16em',
                        fontFamily: FONTS.body }}>
                        <span style={{ color: '#FFFFFF', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            borderBottom: `2px solid ${C.accent}`, paddingBottom: 4 }}>
                            <IconVideo size={14} /> Video
                        </span>
                        <a href="/image-studio" style={{
                            color: C.textDim, textDecoration: 'none', transition: 'color 0.2s',
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                        }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                           onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}>
                            <IconImage size={14} /> Image
                        </a>
                        <a href="/pricing" style={{
                            color: C.textDim, textDecoration: 'none',
                            transition: 'color 0.2s',
                        }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                           onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}>
                            Pricing
                        </a>
                    </nav>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <a href="/pricing" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        color: C.accent, fontSize: '0.92em', fontWeight: 700,
                        textDecoration: 'none', padding: '7px 14px',
                        background: 'rgba(178,74,96,0.08)',
                        border: `1px solid ${C.accent}33`,
                        borderRadius: 20, transition: 'all 0.2s',
                    }} title="View pricing plans / top up credits"
                       onMouseEnter={(e) => {
                           e.currentTarget.style.background = 'rgba(178,74,96,0.15)';
                           e.currentTarget.style.borderColor = `${C.accent}88`;
                       }}
                       onMouseLeave={(e) => {
                           e.currentTarget.style.background = 'rgba(178,74,96,0.08)';
                           e.currentTarget.style.borderColor = `${C.accent}33`;
                       }}>
                        <IconGem size={15} /> <strong>{balance?.credits ?? '—'}</strong>
                        <span style={{ color: C.textDim, fontWeight: 500 }}>credits</span>
                    </a>
                    {balance?.subscription_plan_type && !balance?._degraded && (
                        <span style={{ fontSize: '0.74em', padding: '4px 12px',
                            background: C.panel2, border: `1px solid ${C.border}`,
                            borderRadius: 20, color: C.textDim, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {balance.subscription_plan_type}
                        </span>
                    )}
                    {balance?._degraded && (
                        <a href={`${API}/higgsfield-oauth/start`} style={{
                            fontSize: '0.74em', padding: '4px 12px',
                            background: 'rgba(255,193,7,0.10)',
                            border: '1px solid rgba(255,193,7,0.4)',
                            borderRadius: 20, color: '#ffd54f', fontWeight: 600,
                            textDecoration: 'none', letterSpacing: '0.3px',
                            display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            title={balance._hint || 'Reconnect Higgsfield account'}>
                            <IconWarn size={12} /> Reconnect
                        </a>
                    )}
                </div>
            </header>

            {/* ═══════ RESPONSIVE GRID ═══════ */}
            <div style={{
                display: 'grid', gridTemplateColumns: gridCols,
                gap: 0, minHeight: 'calc(100vh - 60px)',
            }}>

                {/* ─── LEFT SETTINGS ─── */}
                <aside style={{
                    background: C.panel,
                    borderRight: isDesktop ? `1px solid ${C.border}` : 'none',
                    borderBottom: isDesktop ? 'none' : `1px solid ${C.border}`,
                    padding: pad, ...railScroll,
                }}>
                    <EngineStatus />

                    {/* ── Frames (with gallery picker buttons) ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 10, marginBottom: 18 }}>
                        <FrameBox label="Bride photo" preview={bridePreview}
                            onPick={(f) => handleFile('bride', f)}
                            onGallery={() => setPickerOpen('bride')} />
                        <FrameBox label="Dress photo" preview={dressPreview}
                            onPick={(f) => handleFile('dress', f)}
                            onGallery={() => setPickerOpen('dress')} />
                    </div>

                    {/* ── Asset Picker Modal ── */}
                    {pickerOpen && (
                        <AssetPicker
                            type={pickerOpen}
                            onPick={handlePickFromGallery(pickerOpen)}
                            onClose={() => setPickerOpen(null)} />
                    )}

                    {/* ── Extend Video Modal ── */}
                    {extendModalOpen && (
                        <div onClick={() => !extending && setExtendModalOpen(false)} style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
                            backdropFilter: 'blur(8px)', zIndex: 1000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 24, animation: 'fade-in 0.2s',
                        }}>
                            <div onClick={(e) => e.stopPropagation()} style={{
                                background: C.panel, borderRadius: 18,
                                border: `1px solid ${C.border}`,
                                maxWidth: 520, width: '100%',
                                padding: 22, color: C.text,
                            }}>
                                <div style={{ fontFamily: FONTS.display, fontSize: '1.4em',
                                    fontWeight: 800, marginBottom: 4,
                                    display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <IconSpark size={18} /> Extend this video
                                </div>
                                <div style={{ fontSize: '0.85em', color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>
                                    Generates a new clip that visually continues from the last frame of the current video.
                                    Describe what should happen next.
                                </div>

                                <label style={{ fontSize: '0.78em', fontWeight: 600,
                                    color: C.textDim, textTransform: 'uppercase',
                                    letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                                    What happens next
                                </label>
                                <textarea
                                    value={extendPrompt}
                                    onChange={(e) => setExtendPrompt(e.target.value)}
                                    disabled={extending}
                                    rows={4}
                                    placeholder={`e.g. "Bride and groom slowly walk down the stage holding hands, white petals falling, audience clapping. Slow cinematic dolly-out."`}
                                    style={{
                                        width: '100%', padding: 12, borderRadius: 10,
                                        background: C.panel2, color: C.text,
                                        border: `1px solid ${C.border}`,
                                        fontSize: '0.92em', fontFamily: FONTS.body,
                                        boxSizing: 'border-box', resize: 'vertical',
                                        marginBottom: 14, outline: 'none',
                                        opacity: extending ? 0.6 : 1,
                                    }} />

                                <label style={{ fontSize: '0.78em', fontWeight: 600,
                                    color: C.textDim, textTransform: 'uppercase',
                                    letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                                    Duration
                                </label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                                    {DURATIONS.map(d => (
                                        <button key={d}
                                            onClick={() => !extending && setExtendDuration(d)}
                                            disabled={extending}
                                            style={chip(extendDuration === d)}>
                                            {d}s
                                        </button>
                                    ))}
                                </div>

                                <div style={{ fontSize: '0.78em', color: C.textDim,
                                    marginBottom: 16, lineHeight: 1.5,
                                    padding: 10, borderRadius: 8,
                                    background: 'rgba(178,74,96,0.06)',
                                    border: `1px solid ${C.accent}22` }}>
                                    Uses <strong style={{ color: C.text }}>{MODELS.find(m=>m.id===model)?.label}</strong> ·{' '}
                                    {resolution} · {extendDuration}s · same as current settings.
                                </div>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button onClick={() => setExtendModalOpen(false)}
                                        disabled={extending}
                                        style={{
                                            padding: '10px 18px', borderRadius: 10,
                                            background: 'transparent', color: C.textDim,
                                            border: `1px solid ${C.border}`, cursor: 'pointer',
                                            fontFamily: FONTS.body, fontSize: '0.9em',
                                        }}>Cancel</button>
                                    <button onClick={handleExtend}
                                        disabled={extending || extendPrompt.trim().length < 5}
                                        style={{
                                            padding: '10px 22px', borderRadius: 10,
                                            background: extending ? '#444' : C.accent,
                                            color: extending ? C.textDim : '#000',
                                            border: 'none',
                                            cursor: extending ? 'wait' : 'pointer',
                                            fontFamily: FONTS.body, fontSize: '0.92em',
                                            fontWeight: 800, letterSpacing: '0.3px',
                                            opacity: extendPrompt.trim().length < 5 ? 0.5 : 1,
                                        }}>
                                        {extending ? 'Extending…' : 'Generate Extension'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Scenario presets (vertical cards) ── */}
                    {/* Custom is one of the cards; selecting it unlocks the textarea
                        and disables (visually) the other presets. Selecting any preset
                        clears the custom prompt — they're mutually exclusive. */}
                    <SectionHeader>Scene</SectionHeader>
                    <div style={{ display: 'flex', flexDirection: 'column',
                        gap: 8, marginBottom: 12 }}>
                        {visibleScenes.map(s => renderSceneCard(s, false))}
                        {allScenes.length > visibleScenes.length && (
                            <button onClick={() => setShowAllScenes(true)} style={viewAllBtn}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(178,74,96,0.07)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                View all scenes ({allScenes.length}) →
                            </button>
                        )}
                    </div>

                    {/* ── Custom prompt textarea — visible ONLY when Custom is selected ── */}
                    {scenario === 'custom' && (
                        <div style={{ marginBottom: 14,
                            animation: 'fade-in 0.25s' }}>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder={'Type a few keywords… e.g. "bride rotating scene"'}
                                rows={3}
                                autoFocus
                                style={{
                                    width: '100%', padding: 12, borderRadius: 10,
                                    background: C.panel2, color: C.text,
                                    border: `1px solid ${C.accent}55`,
                                    fontSize: '0.9em', fontFamily: FONTS.body,
                                    resize: 'vertical', boxSizing: 'border-box',
                                    outline: 'none',
                                }} />
                            {customPrompt.trim().length >= 3 && (
                                <div style={{ marginTop: 8, padding: 8,
                                    background: 'rgba(178,74,96,0.06)',
                                    border: `1px solid ${C.accent}33`, borderRadius: 8,
                                    fontSize: '0.78em', color: C.accent, lineHeight: 1.5 }}>
                                    Your keywords will auto-expand into a rich cinematic wedding scene at generation.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Model dropdown ── */}
                    <SectionHeader>Model</SectionHeader>
                    <select value={model} onChange={(e) => setModel(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: 10,
                            background: C.panel2, color: C.text,
                            border: `1px solid ${C.border}`,
                            fontSize: '0.92em', fontFamily: FONTS.body, fontWeight: 500,
                            cursor: 'pointer', marginBottom: 8,
                        }}>
                        {MODELS.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.label} — {m.hint}{m.plan === 'plus' ? ' · Plus plan' : ''}
                            </option>
                        ))}
                    </select>
                    {MODELS.find(m => m.id === model)?.plan === 'plus' && (
                        <div style={{ marginBottom: 14, padding: '10px 12px',
                            background: 'rgba(255,193,7,0.10)',
                            border: '1px solid rgba(255,193,7,0.35)',
                            borderRadius: 8, fontSize: '0.78em', color: '#ffd54f',
                            lineHeight: 1.45, display: 'flex', gap: 8 }}>
                            <IconStar size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>This model needs a Higgsfield Plus plan. Switch to
                            <strong style={{ color: '#fff' }}> Cinematic AI</strong> to use your free credits.</span>
                        </div>
                    )}

                    {/* ── Settings chips ── */}
                    <SectionHeader>Settings</SectionHeader>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <ChipSelect options={DURATIONS.map(d => ({ id: d, label: `${d}s` }))}
                            value={duration} onChange={setDuration} Icon={IconClock} />
                        <button style={{ ...chip(true), display: 'inline-flex', alignItems: 'center', gap: 7 }} disabled>
                            <IconRatio size={13} /> {ASPECT}
                        </button>
                        <ChipSelect options={allowedResolutions.map(r => ({ id: r, label: r }))}
                            value={resolution} onChange={setResolution} Icon={IconMonitor} />
                        <button onClick={() => setSound(!sound)} style={{ ...chip(sound), display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                            {sound ? <IconSound size={13} /> : <IconMute size={13} />} {sound ? 'On' : 'Off'}
                        </button>
                    </div>

                    {/* ── Generate button ── */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || costLoading || !brideImage || !dressImage}
                        onMouseEnter={(e) => { if (!generating) { e.currentTarget.style.boxShadow = GOLD_GLOW_HOVER; e.currentTarget.style.filter = 'brightness(1.05)'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = generating ? 'none' : GOLD_GLOW; e.currentTarget.style.filter = 'none'; }}
                        style={{
                            width: '100%', padding: '16px', borderRadius: 12,
                            border: 'none',
                            background: generating ? '#3a3a3a' : GOLD_GRAD,
                            color: generating ? C.textDim : '#FFFFFF',
                            boxShadow: generating ? 'none' : GOLD_GLOW,
                            fontSize: '1.05em', fontWeight: 800,
                            fontFamily: FONTS.body,
                            cursor: generating ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 10, transition: 'all 0.2s', opacity: costLoading ? 0.85 : 1,
                            letterSpacing: '0.3px',
                        }}>
                        {generating ? 'Generating…'
                            : costLoading
                                ? <>Generate <span style={{ opacity: 0.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconSpark size={14} /> …</span></>
                                : <>Generate <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconSpark size={14} /> {cost.credits}</span></>
                        }
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '0.78em',
                        color: C.textDim, marginTop: 8, fontFamily: FONTS.body,
                        minHeight: 18 }}>
                        {costLoading ? (
                            <span style={{ color: C.accent, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ display: 'inline-flex', animation: 'spin 0.8s linear infinite' }}><IconRefresh size={13} /></span>
                                Calculating…
                            </span>
                        ) : cost.source === 'error' ? (
                            <span style={{ color: '#ef9a9a', display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconWarn size={13} /> Estimate (engine offline)</span>
                        ) : showJustUpdated ? (
                            <span style={{ color: C.accent, fontWeight: 600,
                                animation: 'fade-in 0.3s' }}>
                                ✓ Updated · {duration}s · {resolution}
                            </span>
                        ) : (
                            <span>
                                {duration}s · {resolution} · {effectiveMode === 'std' ? 'high quality' : 'fast'}
                                {cost.source === 'engine' && (
                                    <span title="Exact cost from engine"
                                        style={{ marginLeft: 6, color: C.accent }}>●</span>
                                )}
                            </span>
                        )}
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

                {/* ─── CENTER ─── */}
                <main style={{
                    background: C.bg, padding: isMobile ? 16 : 24,
                    display: 'flex', flexDirection: 'column',
                }}>
                    <div style={{ display: 'flex', gap: 24, marginBottom: 20,
                        borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                        <span style={{
                            color: C.text, fontWeight: 600,
                            borderBottom: `2px solid ${C.accent}`, paddingBottom: 10,
                            fontFamily: FONTS.body,
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                        }}><IconFolder size={15} /> History</span>
                        <span style={{ color: C.textDim, fontSize: '0.92em', paddingTop: 2,
                            fontFamily: FONTS.body,
                            display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                            <IconBook size={15} /> How it works</span>
                    </div>

                    <div style={{
                        flex: 1, background: C.panel,
                        borderRadius: 14, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minHeight: previewMinH,
                    }}>
                        {videoUrl ? (
                            <video src={videoUrl} controls autoPlay loop
                                style={{ maxWidth: '100%', maxHeight: '74vh', borderRadius: 10 }} />
                        ) : generating ? (
                            <GeneratingExperience
                                bridePreview={bridePreview}
                                dressPreview={dressPreview}
                                progress={progress}
                                duration={duration}
                                resolution={resolution} />
                        ) : error ? (
                            <div style={{ textAlign: 'center', color: '#ff8a80',
                                maxWidth: 440, padding: '0 24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                    <IconWarn size={40} />
                                </div>
                                <div style={{ fontFamily: FONTS.display, fontSize: '1.25em',
                                    fontWeight: 500, color: '#fff', marginBottom: 8 }}>
                                    Generation failed
                                </div>
                                <div style={{ fontSize: '0.9em', color: '#ff8a80',
                                    lineHeight: 1.5, fontFamily: FONTS.body,
                                    background: 'rgba(239,83,80,0.10)', padding: 12,
                                    borderRadius: 8, marginBottom: 14 }}>
                                    {error}
                                </div>
                                {/Requires.*plan|Out of credits|upgrade/i.test(error) && (
                                    <div style={{ fontSize: '0.85em', color: C.textDim,
                                        lineHeight: 1.5, fontFamily: FONTS.body }}>
                                        Tip: switch the model to <strong style={{ color: C.accent }}>Cinematic AI</strong>{' '}
                                        to use your free Seedance credits, or upgrade your Higgsfield plan.
                                    </div>
                                )}
                                <button onClick={() => setError(null)} style={{
                                    marginTop: 14, padding: '8px 18px', borderRadius: 8,
                                    border: `1px solid ${C.border}`, background: C.panel2,
                                    color: C.text, cursor: 'pointer', fontSize: '0.85em',
                                    fontFamily: FONTS.body }}>Dismiss</button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: C.textDim2, padding: '0 24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'center',
                                    marginBottom: 18, color: C.textDim }}>
                                    <IconVideo size={48} />
                                </div>
                                <div style={{ fontFamily: FONTS.display,
                                    fontSize: '1.5em', fontWeight: 400, color: C.text,
                                    fontStyle: 'italic' }}>
                                    Your video appears here
                                </div>
                                <div style={{ marginTop: 10, fontSize: '0.9em', color: C.textDim,
                                    letterSpacing: '0.03em' }}>
                                    Upload photos, pick a scene, then press Generate
                                </div>
                            </div>
                        )}
                    </div>

                    {videoUrl && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button onClick={() => downloadFile(videoUrl, 'ladies-planet-video')} style={{
                                padding: '12px 22px', borderRadius: 10,
                                background: C.accent, color: '#000', border: 'none',
                                cursor: 'pointer', fontWeight: 700,
                                fontSize: '0.92em', fontFamily: FONTS.body,
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                            }}><IconDownload size={15} /> Download</button>
                            <button onClick={() => { setExtendPrompt(''); setExtendDuration(5); setExtendModalOpen(true); }}
                                title="Generate a new clip that continues from this video's last frame"
                                style={{
                                padding: '12px 22px', borderRadius: 10,
                                background: C.panel2, color: C.text,
                                border: `1px solid ${C.border}`, cursor: 'pointer',
                                fontWeight: 700, fontSize: '0.92em', fontFamily: FONTS.body,
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                            }}><IconSpark size={15} /> Extend</button>
                            <a href={`https://wa.me/?text=${encodeURIComponent(videoUrl)}`}
                                target="_blank" rel="noopener" style={{
                                padding: '12px 22px', borderRadius: 10,
                                background: C.panel2, color: C.text,
                                border: `1px solid ${C.border}`,
                                textDecoration: 'none', fontWeight: 700,
                                fontSize: '0.92em', fontFamily: FONTS.body,
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                            }}><IconSend size={15} /> Send</a>
                            <button onClick={() => setVideoUrl(null)} style={{
                                padding: '12px 22px', borderRadius: 10,
                                background: 'transparent', color: C.textDim,
                                border: `1px solid ${C.border}`, cursor: 'pointer',
                                fontSize: '0.92em', fontFamily: FONTS.body, fontWeight: 600,
                            }}>Reset</button>
                        </div>
                    )}
                </main>

                {/* ─── RIGHT INFO ─── */}
                <aside style={{
                    background: C.panel,
                    borderLeft: isDesktop ? `1px solid ${C.border}` : 'none',
                    borderTop: isDesktop ? 'none' : `1px solid ${C.border}`,
                    padding: pad, ...railScroll, ...rightRailSpan,
                }}>
                    <SectionHeader>Current</SectionHeader>
                    <div style={{ background: C.panel2, padding: 14,
                        borderRadius: 12, border: `1px solid ${C.border}`,
                        marginBottom: 22 }}>
                        <div style={{
                            fontSize: '0.88em', lineHeight: 1.55,
                            color: C.text, marginBottom: 12,
                            fontFamily: FONTS.body,
                        }}>
                            {scenario === 'custom' && customPrompt.trim().length >= 5
                                ? customPrompt
                                : scenario === 'custom'
                                ? 'Type your scene above…'
                                : scenarios.find(s => s.id === scenario)?.description || 'Bridal video'}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {bridePreview && (
                                <Tag preview={bridePreview} label="Bride" color={C.primary} />
                            )}
                            {dressPreview && (
                                <Tag preview={dressPreview} label="Dress" color="#c0392b" />
                            )}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex',
                            flexWrap: 'wrap', gap: 6 }}>
                            <Pill><IconMonitor size={11} /> {resolution}</Pill>
                            <Pill><IconClock size={11} /> {duration}s</Pill>
                            <Pill><IconRatio size={11} /> {ASPECT}</Pill>
                            {sound && <Pill><IconSound size={11} /> Audio</Pill>}
                        </div>
                    </div>

                    <SectionHeader>
                        History <span style={{ color: C.textDim2 }}>({visibleHistory.length})</span>
                    </SectionHeader>
                    <div style={{ display: 'grid',
                        gridTemplateColumns: isDesktop ? '1fr 1fr' : 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: 8 }}>
                        {visibleHistory.slice(0, HISTORY_PREVIEW).map((item, i) => renderVideoThumb(item, i, false))}
                        {visibleHistory.length === 0 && (
                            <div style={{ gridColumn: 'span 2', textAlign: 'center',
                                color: C.textDim2, fontSize: '0.85em', padding: 24,
                                fontFamily: FONTS.display, fontStyle: 'italic' }}>
                                No creations yet
                            </div>
                        )}
                    </div>
                    {visibleHistory.length > HISTORY_PREVIEW && (
                        <button onClick={() => setShowAllHistory(true)}
                            style={{ ...viewAllBtn, marginTop: 10 }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(178,74,96,0.07)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            View all history ({visibleHistory.length}) →
                        </button>
                    )}
                </aside>
            </div>

            {/* ═══════ "View all scenes" popup ═══════ */}
            {showAllScenes && (
                <ViewAllModal
                    title="All Scenes"
                    subtitle="Pick a cinematic scene for your bridal video"
                    onClose={() => setShowAllScenes(false)}>
                    <div style={{ display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: 10 }}>
                        {allScenes.map(s => renderSceneCard(s, true))}
                    </div>
                </ViewAllModal>
            )}

            {/* ═══════ "View all history" popup ═══════ */}
            {showAllHistory && (
                <ViewAllModal
                    title="Your Creations"
                    subtitle={`${visibleHistory.length} video${visibleHistory.length === 1 ? '' : 's'} · tap any to preview`}
                    onClose={() => setShowAllHistory(false)}>
                    {visibleHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', color: C.textDim2,
                            padding: 40, fontFamily: FONTS.display, fontStyle: 'italic' }}>
                            No creations yet
                        </div>
                    ) : (
                        <div style={{ display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: 12 }}>
                            {visibleHistory.map((item, i) => renderVideoThumb(item, i, true))}
                        </div>
                    )}
                </ViewAllModal>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.1); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(2px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                select option {
                    background: #141414;
                    color: ${C.text};
                }
                input[type="range"] {
                    accent-color: ${C.accent};
                }
                body, button, input, textarea, select {
                    font-family: ${FONTS.body};
                }
            `}</style>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────

function SectionHeader({ children }) {
    return (
        <div style={{
            fontSize: '0.74em', color: '#666', marginBottom: 10,
            fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1.2px', fontFamily: FONTS.body,
        }}>{children}</div>
    );
}

function FrameBox({ label, preview, onPick, onGallery }) {
    const ref = useRef();
    return (
        <div style={{ position: 'relative' }}>
            <div onClick={() => ref.current?.click()} style={{
                border: `1px dashed ${C.border}`, borderRadius: 12,
                aspectRatio: '1 / 1', cursor: 'pointer',
                background: preview ? 'transparent' : C.panel2,
                overflow: 'hidden', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.15s',
            }} onMouseEnter={(e) => e.currentTarget.style.borderColor = C.accent}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}>
                <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => onPick(e.target.files?.[0])} />
                {preview ? (
                    <img src={preview} alt="" style={{
                        width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ textAlign: 'center', color: C.textDim }}>
                        <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><IconImage size={22} /></div>
                        <div style={{ fontSize: '0.72em', fontWeight: 500 }}>{label}</div>
                    </div>
                )}
            </div>
            {/* Gallery picker button (top-right corner) */}
            {onGallery && (
                <button onClick={(e) => { e.stopPropagation(); onGallery(); }}
                    title="Pick from gallery" style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        border: `1px solid ${C.border}`, color: C.text,
                        width: 26, height: 26, borderRadius: 8,
                        cursor: 'pointer', fontSize: '0.85em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, transition: 'all 0.15s',
                    }} onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.accent;
                        e.currentTarget.style.color = '#000';
                    }} onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                        e.currentTarget.style.color = C.text;
                    }}><IconFolder size={14} /></button>
            )}
        </div>
    );
}

function ChipSelect({ options, value, onChange, Icon }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} style={{
                padding: '8px 14px', borderRadius: 10, fontSize: '0.85em',
                border: `1px solid ${C.border}`, background: C.panel2,
                color: C.text, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: FONTS.body, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
                {Icon && <Icon size={13} />} {options.find(o => o.id === value)?.label}
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 4,
                    background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 10, minWidth: '100%', zIndex: 20,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                    {options.map(o => (
                        <div key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                            style={{
                                padding: '9px 16px', cursor: 'pointer',
                                background: value === o.id ? C.panel2 : 'transparent',
                                color: value === o.id ? C.accent : C.text,
                                fontSize: '0.88em', whiteSpace: 'nowrap',
                                fontFamily: FONTS.body, fontWeight: value === o.id ? 600 : 500,
                            }}>
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Pill({ children }) {
    return <span style={{
        fontSize: '0.72em', padding: '4px 10px',
        background: C.bg, color: C.textDim,
        borderRadius: 12, border: `1px solid ${C.border}`,
        fontFamily: FONTS.body, fontWeight: 500,
        display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>{children}</span>;
}

function Tag({ preview, label, color }) {
    return (
        <div style={{ display: 'inline-block', position: 'relative',
            background: color, padding: 4, borderRadius: 8 }}>
            <img src={preview} alt="" style={{
                width: 38, height: 38, objectFit: 'cover', borderRadius: 6 }} />
            <span style={{
                position: 'absolute', top: -6, right: -6,
                background: color, color: '#fff',
                fontSize: '0.62em', padding: '2px 6px',
                borderRadius: 6, fontWeight: 700,
                fontFamily: FONTS.body, letterSpacing: '0.3px',
            }}>{label}</span>
        </div>
    );
}
