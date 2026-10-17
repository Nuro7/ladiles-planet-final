import React, { useEffect, useRef, useState } from 'react';

/**
 * Public Seedance 2.0 Fast smoke-test page.
 * Route: /seedance-test  (no auth)
 *
 * Flow: upload bride + dress → pick preset OR write prompt → Generate.
 * Generation takes ~3–5 minutes; UI shows an elapsed timer.
 */

const FALLBACK_ASPECT_RATIOS = ['16:9', '9:16', '1:1'];

export default function SeedanceTestPage() {
    const [presets, setPresets] = useState([]);
    const [aspectRatios, setAspectRatios] = useState(FALLBACK_ASPECT_RATIOS);
    const [modelId, setModelId] = useState('');
    const [bride, setBride] = useState(null);
    const [bridePreview, setBridePreview] = useState(null);
    const [dress, setDress] = useState(null);
    const [dressPreview, setDressPreview] = useState(null);
    const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
    const [presetId, setPresetId] = useState(1);
    const [customPrompt, setCustomPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [isGenerating, setIsGenerating] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        fetch('/api/seedance-test/presets')
            .then(r => r.json())
            .then(d => {
                if (!d.success) return;
                setPresets(d.presets);
                if (Array.isArray(d.supportedAspectRatios) && d.supportedAspectRatios.length) {
                    setAspectRatios(d.supportedAspectRatios);
                    if (!d.supportedAspectRatios.includes(aspectRatio)) setAspectRatio('16:9');
                }
                if (d.model) setModelId(d.model);
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const onFile = (setter, previewer) => (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return; }
        if (file.size > 30 * 1024 * 1024)   { setError('Image must be under 30MB'); return; }
        setError(null);
        setter(file);
        const reader = new FileReader();
        reader.onloadend = () => previewer(reader.result);
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        setError(null);
        setResult(null);
        if (!bride || !dress) { setError('Please upload both bride and dress images'); return; }
        if (mode === 'custom' && !customPrompt.trim()) { setError('Write a prompt or pick a preset'); return; }

        setIsGenerating(true);
        setElapsed(0);
        const t0 = Date.now();
        timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);

        const fd = new FormData();
        fd.append('bride', bride);
        fd.append('dress', dress);
        fd.append('aspectRatio', aspectRatio);
        if (mode === 'preset') fd.append('presetId', String(presetId));
        else fd.append('prompt', customPrompt);

        try {
            const res = await fetch('/api/seedance-test/generate', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
            setResult(data.data);
        } catch (err) {
            setError(err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        }
    };

    const fmtTime = (s) => {
        const m = Math.floor(s / 60), sec = s % 60;
        return m > 0 ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`;
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#FFF', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 300, marginBottom: 8 }}>Kling O3 Reference — Bridal AI</h1>
                    <p style={{ color: '#888', fontSize: 14 }}>
                        Upload a bride photo + dress photo, pick a preset or write a prompt, generate.
                        Typical time: <strong style={{ color: '#FFF' }}>~2 minutes</strong>{modelId && (
                            <span style={{ color: '#666' }}> · model: {modelId}</span>
                        )}.
                    </p>
                </div>

                {/* Image uploads */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'Bride photo',  file: bride,  preview: bridePreview, setFile: setBride, setPrev: setBridePreview },
                        { label: 'Dress photo',  file: dress,  preview: dressPreview, setFile: setDress, setPrev: setDressPreview },
                    ].map(({ label, file, preview, setFile, setPrev }) => (
                        <label key={label} style={{
                            display: 'block',
                            background: '#0f0f0f',
                            border: '1px dashed rgba(255,255,255,0.2)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            overflow: 'hidden',
                        }}>
                            {preview ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={preview} alt={label} style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '20px 12px 12px', fontSize: 12 }}>
                                        <div style={{ fontWeight: 600 }}>{label}</div>
                                        <div style={{ color: '#aaa', marginTop: 2 }}>{file?.name} · {(file?.size / 1024 / 1024).toFixed(2)}MB</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                                    <div style={{ fontSize: 11, color: '#777' }}>Click to choose · max 30MB</div>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={onFile(setFile, setPrev)}
                                style={{ display: 'none' }}
                                disabled={isGenerating}
                            />
                        </label>
                    ))}
                </div>

                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {['preset', 'custom'].map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            disabled={isGenerating}
                            style={{
                                flex: 1, padding: '12px',
                                background: mode === m ? '#FFF' : 'transparent',
                                color: mode === m ? '#000' : '#FFF',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 8, fontWeight: 600,
                                cursor: isGenerating ? 'not-allowed' : 'pointer',
                                fontSize: 13,
                            }}
                        >
                            {m === 'preset' ? '✨ Preset Prompts' : '✍️  Manual Prompt'}
                        </button>
                    ))}
                </div>

                {/* Preset buttons OR custom prompt */}
                {mode === 'preset' ? (
                    <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                        {presets.length === 0 ? (
                            <div style={{ color: '#888', fontSize: 12 }}>Loading presets…</div>
                        ) : presets.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPresetId(p.id)}
                                disabled={isGenerating}
                                style={{
                                    textAlign: 'left',
                                    padding: '14px 16px',
                                    background: presetId === p.id ? 'rgba(255,255,255,0.08)' : '#0f0f0f',
                                    border: `1px solid ${presetId === p.id ? '#FFF' : 'rgba(255,255,255,0.15)'}`,
                                    borderRadius: 8,
                                    color: '#FFF',
                                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <div style={{ fontSize: 14, fontWeight: 600 }}>Preset #{p.id} — {p.label}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Default ratio: {p.aspect_ratio}</div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <textarea
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        disabled={isGenerating}
                        placeholder="Describe the wedding scene — reference @Image1 for the bride and @Image2 for the dress."
                        style={{
                            width: '100%',
                            minHeight: 140,
                            padding: 14,
                            background: '#0f0f0f',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            color: '#FFF',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            marginBottom: 16,
                        }}
                    />
                )}

                {/* Aspect ratio */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Aspect Ratio</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {aspectRatios.map(r => (
                            <button
                                key={r}
                                onClick={() => setAspectRatio(r)}
                                disabled={isGenerating}
                                style={{
                                    padding: '8px 14px',
                                    background: aspectRatio === r ? '#FFF' : 'transparent',
                                    color: aspectRatio === r ? '#000' : '#FFF',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: 20,
                                    fontSize: 12, fontWeight: 600,
                                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                                }}
                            >{r}</button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: 14, background: '#3a0d0d', border: '1px solid #5a1f1f', borderRadius: 8, marginBottom: 16, color: '#ffb4b4', fontSize: 13 }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !bride || !dress}
                    style={{
                        width: '100%',
                        padding: '18px',
                        background: isGenerating ? '#222' : '#FFF',
                        color: isGenerating ? '#888' : '#000',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: isGenerating || !bride || !dress ? 'not-allowed' : 'pointer',
                        opacity: !isGenerating && (!bride || !dress) ? 0.5 : 1,
                        transition: 'all 0.15s',
                    }}
                >
                    {isGenerating ? `🎬 Generating… ${fmtTime(elapsed)}` : '🎬 Generate Video (~2 min)'}
                </button>

                {/* Result */}
                {result && (
                    <div style={{ marginTop: 32, padding: 20, background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10 }}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#7FE49C' }}>✅ Generated</div>
                                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                                    Time: {result.totalSec?.toFixed(1)}s · Ratio: {result.aspectRatio} · Seed: {result.seed}
                                </div>
                            </div>
                            <a
                                href={result.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ padding: '8px 14px', background: '#FFF', color: '#000', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}
                            >Open MP4 ↗</a>
                        </div>
                        <video
                            src={result.videoUrl}
                            controls
                            autoPlay
                            style={{ width: '100%', borderRadius: 8, background: '#000' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
