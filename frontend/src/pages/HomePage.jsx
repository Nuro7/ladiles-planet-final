import { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Video, Camera, Check,
    Package, ArrowRight, ChevronRight, Wand2, Music,
    Maximize2, User, Image as ImageIcon, Crown, Users,
} from 'lucide-react';
import Layout from '../components/Layout';
import ImageUpload from '../components/ImageUpload';
import FilmPlayer from '../studio/experience/FilmPlayer';
import { downloadFile } from '../api/bridalImage';
import LoadingProgress from '../components/LoadingProgress';
import DressSelector from '../components/DressSelector';
import BrideSelector from '../components/BrideSelector';
import { fetchWithAuth } from '../utils/api';
import { showToast } from '../utils/notifications';

/* ─── Small helpers ────────────────────────────────────── */

const Divider = () => (
    <div style={{ height: 1, background: 'var(--border)', margin: '22px 0' }} />
);

const SectionLabel = ({ children }) => (
    <p className="label-caps" style={{ marginBottom: 10 }}>{children}</p>
);

const Card = ({ children, style }) => (
    <div className="card" style={{ padding: 24, ...style }}>
        {children}
    </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
    <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: subtitle ? 4 : 0 }}>
            <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon size={15} color="var(--accent)" strokeWidth={1.8} />
            </div>
            <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18, fontWeight: 400,
                color: 'var(--text-1)', margin: 0,
            }}>
                {title}
            </h3>
        </div>
        {subtitle && (
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 39 }}>{subtitle}</p>
        )}
    </div>
);

const PillGroup = ({ options, value, onChange }) => (
    <div className="pill-group">
        {options.map(({ value: v, label, icon: Icon }) => (
            <button
                key={v}
                onClick={() => onChange(v)}
                className={`pill-option${value === v ? ' pill-option-active' : ''}`}
            >
                {Icon && <Icon size={14} strokeWidth={1.7} />}
                {label}
            </button>
        ))}
    </div>
);

const StepCircle = ({ num, active, done }) => (
    <div className={`step-circle ${done ? 'step-circle-done' : active ? 'step-circle-active' : 'step-circle-idle'}`}>
        {done ? <Check size={13} strokeWidth={2.5} /> : num}
    </div>
);

/* ─── Main page ─────────────────────────────────────────── */
export default function HomePage() {
    // Step
    const [activeStep, setActiveStep] = useState(1);

    // Bride
    const [brideName,         setBrideName]         = useState('');
    const [selectedBrideId,   setSelectedBrideId]   = useState(null);
    // brideFiles: [{ id, file, angle, preview }] — first item (or one tagged 'front') is the primary used by the AI pipeline
    const [brideFiles,        setBrideFiles]        = useState([]);
    const [savedBrideImageUrl,setSavedBrideImageUrl]= useState(null);
    const [useSavedBride,     setUseSavedBride]     = useState(false);
    const [isBrideSaved,      setIsBrideSaved]      = useState(false);
    const [isSavingBride,     setIsSavingBride]     = useState(false);
    const brideFileInputRef = useRef(null);

    const detectAngleFromName = (filename = '') => {
        const f = filename.toLowerCase();
        if (f.includes('front')) return 'front';
        if (f.includes('left'))  return 'left';
        if (f.includes('right')) return 'right';
        if (f.includes('back'))  return 'back';
        return 'unknown';
    };

    const addBrideFiles = (fileList) => {
        const incoming = Array.from(fileList || []);
        const room = 10 - brideFiles.length;
        if (room <= 0) { showToast('Maximum 10 images', 'error'); return; }

        const accepted = [];
        for (const file of incoming.slice(0, room)) {
            if (!file.type.startsWith('image/')) { showToast(`Skipped "${file.name}" — not an image`, 'error'); continue; }
            if (file.size > 10 * 1024 * 1024)   { showToast(`Skipped "${file.name}" — over 10MB`, 'error'); continue; }
            accepted.push(file);
        }
        if (accepted.length === 0) return;

        Promise.all(accepted.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({
                id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                file,
                angle: detectAngleFromName(file.name),
                preview: reader.result,
            });
            reader.readAsDataURL(file);
        }))).then(items => {
            setBrideFiles(prev => [...prev, ...items]);
            setIsBrideSaved(false);
        });
    };

    const removeBrideFile = (id) => {
        setBrideFiles(prev => prev.filter(it => it.id !== id));
        setIsBrideSaved(false);
    };

    const setBrideFileAngle = (id, angle) => {
        setBrideFiles(prev => prev.map(it => it.id === id ? { ...it, angle } : it));
    };

    // Pick the "primary" bride image for the AI pipeline: front-tagged first, otherwise first uploaded
    const primaryBrideFile = brideFiles.find(it => it.angle === 'front')?.file ?? brideFiles[0]?.file ?? null;

    // Mode & dress
    const [weddingType,               setWeddingType]               = useState('bride_only');
    const [generationMode,            setGenerationMode]            = useState('vton');
    const [dressImage,                setDressImage]                = useState(null);
    const [selectedDressFromCatalog,  setSelectedDressFromCatalog]  = useState(null);
    const [wornDressImage,            setWornDressImage]            = useState(null);

    // Advanced
    const [videoDuration,    setVideoDuration]    = useState(15);
    const [scenario,         setScenario]         = useState('');
    const [enableSound,      setEnableSound]      = useState(true);
    const [outfitType,       setOutfitType]       = useState('dress');
    const [sceneDescription, setSceneDescription] = useState('');
    const [showBranding,     setShowBranding]     = useState(false);
    const [brandingLogo,     setBrandingLogo]     = useState(null);

    // Generation
    const [isGenerating,   setIsGenerating]   = useState(false);
    const [progress,       setProgress]       = useState(0);
    const [pipelineStatus, setPipelineStatus] = useState('');
    const [generatedVideo, setGeneratedVideo] = useState(null);
    const [error,          setError]          = useState(null);
    const pollRef = useRef(null);

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    const step1Done = isBrideSaved || useSavedBride;
    const step2Done = (generationMode === 'vton' && !!dressImage) || (generationMode === 'worn_dress' && !!wornDressImage);

    /* ── Save bride ─────────────────────────────────────── */
    const handleSaveBride = async () => {
        if (!brideName.trim())
            return showToast('Please enter bride name', 'error');
        if (brideFiles.length === 0)
            return showToast('Please add at least one bride photo', 'error');

        setIsSavingBride(true);
        try {
            const fd = new FormData();
            fd.append('name', brideName.trim());
            fd.append('status', 'active');
            fd.append('imageType', 'identity');
            brideFiles.forEach(it => {
                fd.append('images', it.file);
                fd.append('angles', it.angle);
            });

            const res = await fetchWithAuth('/api/brides/upload', { method: 'POST', body: fd });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to save bride'); }
            const data = await res.json();

            setSelectedBrideId(data.data.bride.id);
            setIsBrideSaved(true);
            showToast('Bride saved ✓', 'success');
            setActiveStep(2);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsSavingBride(false);
        }
    };

    /* ── Polling ────────────────────────────────────────── */
    const startPolling = (sessionId) => {
        if (pollRef.current) clearInterval(pollRef.current);

        const doPoll = async () => {
            try {
                const res = await fetchWithAuth(`/api/videos/session/${sessionId}`);
                if (!res.ok) return;
                const { data: session } = await res.json();

                if (session.progress) setProgress(session.progress);
                if (session.message)  setPipelineStatus(session.message);

                if (session.status === 'completed' && session.result?.videoUrl) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    setIsGenerating(false);
                    setProgress(100);
                    setPipelineStatus('');
                    setGeneratedVideo({
                        url:          session.result.videoUrl,
                        sessionId,
                        duration:     session.result.duration    || 15,
                        allShotUrls:  session.result.allShotUrls || [],
                        thumbnailUrl: session.result.thumbnailUrl || null,
                        id:           sessionId,
                    });
                    showToast('Your bridal film is ready!', 'success');
                    setTimeout(() => {
                        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }

                if (session.status === 'error') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    setIsGenerating(false);
                    setError(session.error || 'Pipeline failed');
                    showToast(session.error || 'Pipeline failed', 'error');
                }
            } catch (_) { /* network blip */ }
        };

        const initialDelay = setTimeout(() => {
            doPoll();
            pollRef.current = setInterval(doPoll, 8000);
        }, 70000);

        const hardStop = setTimeout(() => {
            clearTimeout(initialDelay);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setIsGenerating(false);
            setError('Pipeline timed out after 25 minutes');
        }, 25 * 60 * 1000);

        pollRef._hardStop = hardStop;
    };

    /* ── Generate ───────────────────────────────────────── */
    const handleGenerate = async () => {
        if (!step1Done) return showToast('Complete Step 1 first', 'error');
        if (!step2Done) return showToast('Complete Step 2 first', 'error');

        setError(null);
        setGeneratedVideo(null);
        setIsGenerating(true);
        setProgress(5);
        setPipelineStatus('Uploading images…');

        try {
            const fd = new FormData();
            // For saved bride: a URL string was placed on primaryBrideRef; for new upload: a File from brideFiles
            const primaryRef = useSavedBride ? savedBrideImageUrl : primaryBrideFile;
            if (!primaryRef) throw new Error('No bride image available');
            if (typeof primaryRef === 'string') fd.append('brideImageUrl', primaryRef);
            else fd.append('brideImage', primaryRef);
            if (selectedBrideId) fd.append('brideId', selectedBrideId);

            if (generationMode === 'vton')            fd.append('dressImage', dressImage);
            else if (typeof wornDressImage === 'string') fd.append('wornDressImageUrl', wornDressImage);
            else                                      fd.append('wornDressImage', wornDressImage);

            fd.append('generationMode',  generationMode);
            fd.append('weddingType',     weddingType);
            fd.append('outfitType',      outfitType);
            fd.append('videoDuration',   videoDuration);
            fd.append('scenario',        scenario);
            fd.append('enableSound',     enableSound);
            fd.append('sceneDescription', sceneDescription);
            fd.append('jewelleryStyle',  'minimal');
            fd.append('makeup',          'elegant');
            fd.append('appearanceMode',  'vibrant');
            fd.append('showBranding',    showBranding);
            if (brandingLogo && showBranding) fd.append('logo', brandingLogo);

            const res = await fetchWithAuth('/api/videos/generate', { method: 'POST', body: fd });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to start pipeline'); }
            const result = await res.json();
            const sessionId = result.data?.sessionId;
            if (!sessionId) throw new Error('No session ID returned');

            setGeneratedVideo({ url: null, sessionId, duration: videoDuration, id: sessionId });
            setPipelineStatus('Pipeline started — processing your bridal film…');
            setActiveStep(3);
            showToast('Pipeline started · 10-15 minutes', 'success');
            setTimeout(() => {
                document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
            startPolling(sessionId);

        } catch (err) {
            setIsGenerating(false);
            setError(err.message);
            showToast(err.message, 'error');
        }
    };

    /* ── Step header (clickable accordion title) ────────── */
    const StepHeader = ({ num, label, done, active, locked, onOpen }) => (
        <button
            onClick={() => !locked && onOpen()}
            disabled={locked}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none', cursor: locked ? 'default' : 'pointer',
                padding: '4px 0', opacity: locked ? 0.45 : 1,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StepCircle num={num} active={active} done={done} />
                <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 19, fontWeight: 400,
                    color: 'var(--text-1)',
                    letterSpacing: '0.01em',
                }}>
                    {label}
                </span>
                {done && (
                    <span className="badge badge-success" style={{ fontSize: 10 }}>Done</span>
                )}
            </div>
            <ChevronRight
                size={17}
                strokeWidth={1.8}
                color="var(--text-3)"
                style={{ transform: active ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            />
        </button>
    );

    /* ── Toggle switch ──────────────────────────────────── */
    const Toggle = ({ on, onChange }) => (
        <button
            onClick={() => onChange(!on)}
            className="toggle"
            style={{ background: on ? 'var(--accent)' : 'var(--border-strong)' }}
        >
            <div className="toggle-thumb" style={{ left: on ? 21 : 3 }} />
        </button>
    );

    /* ─────────────────────────────────────────────────────
       RENDER
    ──────────────────────────────────────────────────────── */
    return (
        <Layout>
            <div style={{
                maxWidth: 820,
                margin: '0 auto',
                padding: '36px 28px 80px',
            }}>

                {/* ── Page header ──────────────────────── */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <span className="badge badge-accent">
                            <Sparkles size={10} strokeWidth={2} />
                            AI Generator
                        </span>
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 36, fontWeight: 300,
                        color: 'var(--text-1)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.15,
                        marginBottom: 8,
                    }}>
                        Create a Bridal Film
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>
                        Follow the 3 steps below to generate a cinematic wedding video using Kling AI v3.
                    </p>
                </div>

                {/* ── Step progress strip ───────────────── */}
                <Card style={{ marginBottom: 28, padding: '16px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {[
                            { num: 1, label: 'Bride Setup',      done: step1Done },
                            { num: 2, label: 'Choose Dress',     done: step2Done },
                            { num: 3, label: 'Review & Generate',done: !!generatedVideo },
                        ].map(({ num, label, done }, i) => (
                            <div key={num} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <StepCircle num={num} active={activeStep === num} done={done} />
                                    <span style={{
                                        fontSize: 13, fontWeight: 400,
                                        color: done ? 'var(--success)' : activeStep === num ? 'var(--text-1)' : 'var(--text-3)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {label}
                                    </span>
                                </div>
                                {i < 2 && (
                                    <div style={{
                                        flex: 1, height: 1.5, margin: '0 14px',
                                        background: done ? 'var(--success)' : 'var(--border)',
                                        borderRadius: 2,
                                        transition: 'background 0.3s',
                                    }} />
                                )}
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ════════════════════════════════════════
                    STEP 1 — BRIDE SETUP
                ════════════════════════════════════════ */}
                <div style={{ marginBottom: 16 }}>

                    {activeStep === 1 && (
                        <Card style={{ animation: 'fadeUp 0.25s var(--ease-out) forwards' }}>

                            {/* Wedding Type */}
                            <SectionTitle icon={Crown} title="Wedding Type" subtitle="Choose the scene composition" />
                            <PillGroup
                                value={weddingType}
                                onChange={setWeddingType}
                                options={[
                                    { value: 'bride_only',     label: 'Bride Only',      icon: Crown },
                                    { value: 'bride_and_groom',label: 'Bride & Groom',   icon: Users },
                                ]}
                            />

                            <Divider />

                            {/* Generation Mode */}
                            <SectionTitle icon={Camera} title="Generation Mode" subtitle="How will the dress be applied?" />
                            <PillGroup
                                value={generationMode}
                                onChange={v => { setGenerationMode(v); setIsBrideSaved(false); }}
                                options={[
                                    { value: 'vton',       label: 'Virtual Try-On',    icon: Sparkles },
                                    { value: 'worn_dress', label: 'Worn Dress Photo',  icon: Camera   },
                                ]}
                            />

                            <Divider />

                            {/* Bride Photos */}
                            <SectionTitle icon={User} title="Bride Photos"
                                subtitle="Add one or more photos (front, left, right, back as needed)" />

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <input
                                    type="text"
                                    value={brideName}
                                    onChange={e => setBrideName(e.target.value)}
                                    placeholder="Bride's full name"
                                    disabled={useSavedBride}
                                    className="input"
                                    style={{ flex: 1, opacity: useSavedBride ? 0.5 : 1 }}
                                />
                                <button
                                    onClick={() => {
                                        setUseSavedBride(!useSavedBride);
                                        setBrideFiles([]);
                                        setSavedBrideImageUrl(null);
                                        setBrideName('');
                                        setSelectedBrideId(null);
                                        setIsBrideSaved(false);
                                    }}
                                    className={`btn ${useSavedBride ? 'btn-accent-outline' : 'btn-secondary'}`}
                                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                    {useSavedBride ? 'Upload New' : 'Saved Bride'}
                                </button>
                            </div>

                            {useSavedBride ? (
                                <BrideSelector
                                    selectedBride={brideName}
                                    onBrideSelect={(images, bride) => {
                                        // Pick the best available URL (front first, else any other angle)
                                        const primary = images.front || images.left || images.right || images.back || null;
                                        setSavedBrideImageUrl(primary);
                                        setBrideName(bride.name);
                                        setSelectedBrideId(bride.id);
                                        if (generationMode === 'worn_dress') {
                                            const w = bride.images?.find(i => i.image_type === 'worn_dress');
                                            setWornDressImage(w ? w.image_url : null);
                                        }
                                        setIsBrideSaved(true);
                                    }}
                                />
                            ) : (
                                <>
                                    {/* Single multi-file drop zone */}
                                    <div
                                        onClick={() => !isSavingBride && brideFileInputRef.current?.click()}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => { e.preventDefault(); addBrideFiles(e.dataTransfer.files); }}
                                        className="upload-zone"
                                        style={{
                                            cursor: 'pointer',
                                            background: '#050505',
                                            border: '1px dashed rgba(255,255,255,0.2)',
                                            borderRadius: 8,
                                            padding: '28px 16px',
                                            textAlign: 'center',
                                            marginBottom: 14,
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFF'; e.currentTarget.style.background = '#111'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = '#050505'; }}
                                    >
                                        <input
                                            ref={brideFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={e => { addBrideFiles(e.target.files); e.target.value = ''; }}
                                            style={{ display: 'none' }}
                                        />
                                        <div style={{ color: '#FFF', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                                            Click to add photos or drag & drop
                                        </div>
                                        <div style={{ color: '#888', fontSize: 12 }}>
                                            Add front, left, right, back as you have them. Up to 10 images, 10MB each.
                                        </div>
                                    </div>

                                    {/* Thumbnails with angle picker */}
                                    {brideFiles.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
                                            {brideFiles.map(it => (
                                                <div key={it.id} style={{
                                                    background: '#0a0a0a',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 8,
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{ position: 'relative', paddingTop: '100%' }}>
                                                        <img
                                                            src={it.preview}
                                                            alt="bride"
                                                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeBrideFile(it.id)}
                                                            style={{
                                                                position: 'absolute', top: 4, right: 4,
                                                                width: 22, height: 22, borderRadius: '50%',
                                                                background: 'rgba(0,0,0,0.7)', color: '#FFF',
                                                                border: '1px solid rgba(255,255,255,0.3)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', fontSize: 14, lineHeight: 1,
                                                            }}
                                                        >×</button>
                                                    </div>
                                                    <select
                                                        value={it.angle}
                                                        onChange={e => setBrideFileAngle(it.id, e.target.value)}
                                                        style={{
                                                            width: '100%', padding: '6px 8px',
                                                            background: '#000', color: '#FFF',
                                                            border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)',
                                                            fontSize: 11, outline: 'none', cursor: 'pointer',
                                                        }}
                                                    >
                                                        <option value="front">Front</option>
                                                        <option value="left">Left</option>
                                                        <option value="right">Right</option>
                                                        <option value="back">Back</option>
                                                        <option value="unknown">Other</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={handleSaveBride}
                                            disabled={isSavingBride || isBrideSaved}
                                            className={`btn btn-lg ${isBrideSaved ? 'btn-secondary' : 'btn-primary'}`}
                                        >
                                            {isSavingBride
                                                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} className="animate-spin" /> Saving…</>
                                                : isBrideSaved
                                                    ? <><Check size={15} /> Saved — Continue to Step 2</>
                                                    : 'Save Bride & Continue'
                                            }
                                        </button>
                                    </div>
                                </>
                            )}

                            {step1Done && (
                                <div style={{ marginTop: 16, textAlign: 'center' }}>
                                    <button
                                        onClick={() => setActiveStep(2)}
                                        className="btn btn-secondary"
                                        style={{ gap: 7 }}
                                    >
                                        Next: Choose Dress <ArrowRight size={15} strokeWidth={2} />
                                    </button>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                {/* ════════════════════════════════════════
                    STEP 2 — DRESS SELECTION
                ════════════════════════════════════════ */}
                <div style={{ marginBottom: 16 }}>

                    {activeStep === 2 && step1Done && (
                        <Card style={{ animation: 'fadeUp 0.25s var(--ease-out) forwards' }}>
                            {generationMode === 'vton' ? (
                                <>
                                    <SectionTitle icon={Package} title="Select Dress"
                                        subtitle="Pick from the catalog or upload a dress photo" />

                                    <div style={{ marginBottom: 18 }}>
                                        <SectionLabel>Outfit type</SectionLabel>
                                        <PillGroup
                                            value={outfitType}
                                            onChange={setOutfitType}
                                            options={[
                                                { value: 'dress',       label: 'Full Dress / Lehenga' },
                                                { value: 'combination', label: 'Top + Bottom'          },
                                            ]}
                                        />
                                    </div>

                                    <DressSelector
                                        selectedDress={selectedDressFromCatalog}
                                        onDressSelect={(file, dress) => { setDressImage(file); setSelectedDressFromCatalog(dress); }}
                                        onDirectUpload={(file) => { setDressImage(file); setSelectedDressFromCatalog(null); }}
                                    />
                                </>
                            ) : (
                                <>
                                    <SectionTitle icon={Camera} title="Bride in Dress Photo"
                                        subtitle="Upload a photo of the bride already wearing her dress" />
                                    <ImageUpload
                                        image={wornDressImage}
                                        setImage={file => { setWornDressImage(file); setIsBrideSaved(false); }}
                                        label="Upload Worn Dress Photo"
                                    />
                                </>
                            )}

                            {step2Done && (
                                <div style={{ marginTop: 20, textAlign: 'center' }}>
                                    <button
                                        onClick={() => setActiveStep(3)}
                                        className="btn btn-secondary"
                                        style={{ gap: 7 }}
                                    >
                                        Next: Review & Generate <ArrowRight size={15} strokeWidth={2} />
                                    </button>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                {/* ════════════════════════════════════════
                    STEP 3 — REVIEW & GENERATE
                ════════════════════════════════════════ */}
                <div style={{ marginBottom: 16 }}>

                    {activeStep === 3 && step2Done && (
                        <Card style={{ animation: 'fadeUp 0.25s var(--ease-out) forwards' }}>

                            {/* Summary grid */}
                            <SectionTitle icon={Wand2} title="Summary" subtitle="Review before generating" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                                {[
                                    { label: 'Wedding Type', value: weddingType === 'bride_only' ? 'Bride Only' : 'Bride & Groom' },
                                    { label: 'Mode',         value: generationMode === 'vton' ? 'Virtual Try-On' : 'Worn Dress' },
                                    { label: 'Outfit',       value: outfitType === 'dress' ? 'Full Dress' : 'Top + Bottom' },
                                    { label: 'Bride',        value: brideName || 'From library' },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{
                                        padding: '11px 14px',
                                        borderRadius: 'var(--r)',
                                        background: 'var(--surface-alt)',
                                        border: '1px solid var(--border)',
                                    }}>
                                        <p className="label-caps" style={{ marginBottom: 3 }}>{label}</p>
                                        <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Advanced options */}
                            <div style={{
                                background: 'var(--surface-alt)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--r-md)',
                                padding: 20,
                                marginBottom: 24,
                            }}>
                                <SectionLabel>Advanced options</SectionLabel>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                                    {/* Scene scenario */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                            <Sparkles size={14} strokeWidth={1.8} color="var(--accent)" />
                                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Scene scenario</span>
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                                            Pick a cinematic script — overrides the auto-prompt.
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                            {[
                                                { value: '',               label: 'Auto',           desc: 'Adapts to wedding type'                        },
                                                { value: 'grand_entrance', label: 'Grand Entrance',  desc: 'Staircase descent → aisle walk → groom reveal'  },
                                                { value: 'mandap_moment',  label: 'Mandap Moment',   desc: 'Mandap wide shot → walk to center → fire ritual' },
                                                { value: 'reception_look', label: 'Reception Look',  desc: 'Mirror reveal → full walk → chandelier'         },
                                            ].map(opt => (
                                                <div
                                                    key={opt.value}
                                                    onClick={() => setScenario(opt.value)}
                                                    className={`select-card${scenario === opt.value ? ' select-card-active' : ''}`}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                                >
                                                    <div>
                                                        <p className={`sc-title`} style={{
                                                            fontSize: 13, fontWeight: 500,
                                                            color: scenario === opt.value ? 'var(--accent)' : 'var(--text-1)',
                                                            marginBottom: 2,
                                                        }}>
                                                            {opt.label}
                                                        </p>
                                                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{opt.desc}</p>
                                                    </div>
                                                    {scenario === opt.value && (
                                                        <div style={{
                                                            width: 18, height: 18, borderRadius: '50%',
                                                            background: 'var(--accent)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}>
                                                            <Check size={10} color="white" strokeWidth={2.5} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Video duration */}
                                    {!scenario && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                                <Maximize2 size={14} strokeWidth={1.8} color="var(--accent)" />
                                                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Video duration</span>
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                                                15s = full 3-shot film (default).
                                            </p>
                                            <PillGroup
                                                value={videoDuration}
                                                onChange={setVideoDuration}
                                                options={[
                                                    { value: 15, label: '15s — Full Film' },
                                                    { value: 10, label: '10s — Preview'   },
                                                    { value: 5,  label: '5s — Quick'      },
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {/* Sound toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                                                <Music size={14} strokeWidth={1.8} color="var(--accent)" />
                                                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Wedding music</span>
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Add shehnai music to the final video</p>
                                        </div>
                                        <Toggle on={enableSound} onChange={setEnableSound} />
                                    </div>

                                    {/* Branding logo */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showBranding ? 12 : 0 }}>
                                            <div>
                                                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Boutique logo</span>
                                                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Watermark overlay on the video</p>
                                            </div>
                                            <Toggle on={showBranding} onChange={setShowBranding} />
                                        </div>
                                        {showBranding && (
                                            <ImageUpload image={brandingLogo} setImage={setBrandingLogo} label="Upload Logo" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Scene description */}
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block' }}>
                                    <p className="label-caps" style={{ marginBottom: 8 }}>
                                        Scene description
                                        <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', marginLeft: 6, color: 'var(--text-3)', fontSize: 11 }}>
                                            optional · AI-enhanced
                                        </span>
                                    </p>
                                    <textarea
                                        value={sceneDescription}
                                        onChange={e => setSceneDescription(e.target.value)}
                                        placeholder="e.g. A misty morning in a royal Rajasthani palace with marigold garlands…"
                                        className="input"
                                    />
                                </label>
                            </div>

                            {/* Output spec chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                                {[
                                    { icon: Video,     label: '16:9 Landscape' },
                                    { icon: ImageIcon, label: scenario ? '15s · Scenario' : `${videoDuration}s` },
                                    { icon: Sparkles,  label: 'HD Quality' },
                                    { icon: Music,     label: enableSound ? 'Sound on' : 'Sound off' },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="spec-chip">
                                        <Icon size={12} strokeWidth={1.8} color="var(--accent)" />
                                        {label}
                                    </div>
                                ))}
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{
                                    padding: '11px 14px', borderRadius: 'var(--r)',
                                    background: 'var(--error-bg)', border: '1px solid var(--error-border)',
                                    fontSize: 13, color: 'var(--error)', marginBottom: 20,
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Generate button */}
                            <div style={{ textAlign: 'center' }}>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="btn btn-primary btn-lg"
                                    style={{ minWidth: 240, gap: 10 }}
                                >
                                    {isGenerating ? (
                                        <>
                                            <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%' }} className="animate-spin" />
                                            Generating…
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} strokeWidth={2} />
                                            Generate Bridal Film
                                            <ArrowRight size={16} strokeWidth={2} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* ── Loading progress ──────────────────── */}
                {isGenerating && (
                    <div style={{ marginBottom: 24, animation: 'fadeIn 0.3s var(--ease-out)' }}>
                        <LoadingProgress progress={progress} />
                    </div>
                )}

                {/* ── Result section ────────────────────── */}
                {generatedVideo && (
                    <div id="result-section" style={{ animation: 'fadeUp 0.4s var(--ease-out) forwards' }}>
                        <Card style={{ borderColor: 'rgba(168,115,124,0.3)' }}>

                            {/* Waiting state */}
                            {!generatedVideo.url && (
                                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: 'var(--accent-light)',
                                        border: '1px solid rgba(168,115,124,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 20px',
                                    }}>
                                        <Video size={24} strokeWidth={1.6} color="var(--accent)" />
                                    </div>

                                    <h3 style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: 22, fontWeight: 400,
                                        color: 'var(--text-1)', marginBottom: 6,
                                    }}>
                                        Creating your bridal film
                                    </h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 28 }}>
                                        {pipelineStatus || 'Pipeline is running in the background…'}
                                    </p>

                                    {/* Progress bar */}
                                    <div style={{
                                        background: 'var(--surface-alt)',
                                        borderRadius: 999, height: 6,
                                        marginBottom: 8, overflow: 'hidden',
                                        maxWidth: 360, margin: '0 auto 8px',
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: 999,
                                            background: 'var(--accent)',
                                            width: `${progress}%`,
                                            transition: 'width 1.2s var(--ease)',
                                        }} />
                                    </div>
                                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24 }}>
                                        {progress}% · checking every 8s
                                    </p>

                                    {/* Pipeline step chips */}
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        {[
                                            { label: 'VTON',          pct: 25 },
                                            { label: 'Canvas Expand', pct: 40 },
                                            { label: 'Video Gen',     pct: 75 },
                                            { label: 'Sound',         pct: 90 },
                                        ].map(({ label, pct }) => {
                                            const done   = progress >= pct;
                                            const active = progress >= (pct - 20) && progress < pct;
                                            return (
                                                <span
                                                    key={label}
                                                    className={`badge ${done ? 'badge-success' : active ? 'badge-accent' : 'badge-neutral'}`}
                                                >
                                                    {done ? '✓ ' : ''}{label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Ready state */}
                            {generatedVideo.url && (
                                <>
                                    <SectionTitle icon={Video} title="Your Bridal Film is Ready"
                                        subtitle="16:9 cinematic video · watch, download or share below" />
                                    <FilmPlayer src={generatedVideo.url} title="Your bridal film" />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                                        <button type="button" className="btn-primary" onClick={() => downloadFile(generatedVideo.url, 'ladies-planet-film')}>Download video</button>
                                        <a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(generatedVideo.url)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
                                    </div>
                                </>
                            )}
                        </Card>
                    </div>
                )}

            </div>
        </Layout>
    );
}
