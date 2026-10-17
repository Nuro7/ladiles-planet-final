/**
 * GeneratingExperience.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Engaging loading screen for the 60-240s video generation wait.
 * Shows:
 *   • Animated particle ring
 *   • Rotating cinematic facts / behind-the-scenes tips
 *   • Stage-appropriate progress message
 *   • Subtle progress bar at bottom
 *   • Bride/dress thumbnails to remind user what's being made
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';

const C = {
    bg:        '#0a0a0a',
    panel:     '#161616',
    panel2:    '#1f1f1f',
    border:    '#2a2a2a',
    text:      '#f5f5f5',
    textDim:   '#888',
    accent:    '#caff33',
    primary:   '#c44569',
    pink:      '#ff7eb6',
};

const FONTS = {
    display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    body:    '"Inter", "Jost", system-ui, sans-serif',
};

// Rotating insights — shown for ~6s each, then next one
const INSIGHTS = [
    { icon: '🎬', title: 'Did you know?', body: 'The AI generates 24-30 unique frames per second, each one crafted to preserve your bride\'s exact features.' },
    { icon: '✨', title: 'Behind the scenes', body: 'Your reference photos guide every frame — face, jewelry, embroidery, and dress patterns stay consistent throughout.' },
    { icon: '🌹', title: 'Cinematic touch', body: 'Each shot uses 85mm lens emulation with shallow depth of field — the same look used in luxury bridal cinematography.' },
    { icon: '🎨', title: 'Color science', body: 'Skin tones, jewelry highlights, and fabric textures are calibrated to look natural in warm golden-hour lighting.' },
    { icon: '💎', title: 'Detail preservation', body: 'Heavy embroidery and intricate patterns are protected by the negative-prompt system — no fabric morphing.' },
    { icon: '🎵', title: 'Audio sync', body: 'Wedding music is automatically matched to the scene\'s emotional rhythm if you enabled audio.' },
    { icon: '📸', title: 'Frame quality', body: 'Resolution and motion are processed independently to avoid the "AI look" — natural blinking, breathing, and fabric flow.' },
    { icon: '👰', title: 'Identity lock', body: 'Higgsfield\'s multi-reference system anchors the bride\'s face across every frame — no drift.' },
    { icon: '🎞️', title: 'Took a while?', body: 'Premium 4K videos can take 3-5 minutes. Speed mode delivers 720p in under 90 seconds.' },
    { icon: '🌟', title: 'Pro tip', body: 'For the most consistent results, use clear front-facing portraits as the bride reference.' },
    { icon: '✂️', title: 'Editing hint', body: 'After generation, you can download the MP4 and edit it in any video tool. Original resolution preserved.' },
    { icon: '💌', title: 'Sharing', body: 'Send the video to the bride directly via WhatsApp — premium quality preserved in the share.' },
];

const STAGES = [
    { min: 0,   max: 12,  label: '📤 Uploading your photos to the engine' },
    { min: 12,  max: 25,  label: '🎯 Analyzing bride identity & outfit details' },
    { min: 25,  max: 50,  label: '🎬 Rendering cinematic frames — this is the slow part' },
    { min: 50,  max: 75,  label: '🎨 Applying lighting, motion, and color grading' },
    { min: 75,  max: 90,  label: '🎵 Adding audio & final polish' },
    { min: 90,  max: 100, label: '✨ Almost done — preparing your video' },
];

export default function GeneratingExperience({
    bridePreview,
    dressPreview,
    progress = { pct: 0, status: '' },
    duration = 5,
    resolution = '720p',
}) {
    const [insightIdx, setInsightIdx] = useState(0);

    // Cycle through insights every ~6 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setInsightIdx((i) => (i + 1) % INSIGHTS.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const insight = INSIGHTS[insightIdx];

    // Stage-appropriate label
    const stage = STAGES.find(s => progress.pct >= s.min && progress.pct < s.max) || STAGES[STAGES.length - 1];

    return (
        <div style={{
            width: '100%', minHeight: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 40, position: 'relative', overflow: 'hidden',
        }}>
            {/* Background gradient pulse */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(circle at center, ${C.primary}22 0%, transparent 60%)`,
                animation: 'breathe 4s ease-in-out infinite',
            }} />

            {/* Particle ring */}
            <ParticleRing />

            {/* Center content */}
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 540 }}>
                {/* Bride + dress thumbnails (subtle reminder) */}
                {(bridePreview || dressPreview) && (
                    <div style={{ display: 'flex', justifyContent: 'center',
                        gap: 10, marginBottom: 26 }}>
                        {bridePreview && (
                            <Thumb url={bridePreview} label="Bride" color={C.primary} />
                        )}
                        {dressPreview && (
                            <Thumb url={dressPreview} label="Dress" color="#c0392b" />
                        )}
                    </div>
                )}

                {/* Stage message */}
                <div style={{
                    fontFamily: FONTS.display, fontSize: '1.6em',
                    fontWeight: 700, color: C.text, marginBottom: 8,
                    letterSpacing: '-0.3px',
                }}>
                    {stage.label}
                </div>

                {/* Progress bar */}
                <div style={{
                    width: 300, height: 4, background: C.panel2,
                    borderRadius: 2, overflow: 'hidden', margin: '20px auto',
                    position: 'relative',
                }}>
                    <div style={{
                        width: `${progress.pct}%`, height: '100%',
                        background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                        transition: 'width 0.5s',
                        boxShadow: `0 0 12px ${C.accent}`,
                    }} />
                </div>

                {/* Spacer where the timer used to be (intentionally blank —
                    clients found the elapsed/total countdown stressful). */}
                <div style={{ marginBottom: 36 }} />

                {/* Rotating insight card */}
                <div key={insightIdx} style={{
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: '20px 24px',
                    maxWidth: 460, margin: '0 auto',
                    animation: 'card-in 0.6s ease',
                    boxShadow: `0 10px 40px rgba(0,0,0,0.4)`,
                }}>
                    <div style={{
                        fontSize: '2em', marginBottom: 10, lineHeight: 1,
                    }}>{insight.icon}</div>
                    <div style={{
                        fontFamily: FONTS.display, fontSize: '1.1em', fontWeight: 700,
                        color: C.accent, marginBottom: 8, letterSpacing: '0.3px',
                    }}>{insight.title}</div>
                    <div style={{
                        fontSize: '0.92em', color: C.textDim,
                        lineHeight: 1.6, fontFamily: FONTS.body,
                    }}>
                        {insight.body}
                    </div>
                </div>

                {/* Insight nav dots */}
                <div style={{
                    display: 'flex', justifyContent: 'center', gap: 6,
                    marginTop: 16,
                }}>
                    {INSIGHTS.slice(0, 5).map((_, i) => (
                        <div key={i} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: i === (insightIdx % 5) ? C.accent : C.border,
                            transition: 'all 0.3s',
                        }} />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes breathe {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50%      { opacity: 0.7; transform: scale(1.05); }
                }
                @keyframes card-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes float-particle {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(8px, -10px); }
                    50% { transform: translate(0, -16px); }
                    75% { transform: translate(-8px, -10px); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function Thumb({ url, label, color }) {
    return (
        <div style={{
            position: 'relative', borderRadius: 10,
            border: `2px solid ${color}`,
            overflow: 'hidden', width: 60, height: 60,
            animation: 'float-particle 3s ease-in-out infinite',
        }}>
            <img src={url} alt="" style={{
                width: '100%', height: '100%', objectFit: 'cover',
            }} />
            <div style={{
                position: 'absolute', bottom: -6, left: '50%',
                transform: 'translateX(-50%)',
                background: color, color: '#fff',
                fontSize: '0.55em', padding: '2px 7px',
                borderRadius: 8, fontWeight: 700,
                fontFamily: '"Inter", sans-serif',
                whiteSpace: 'nowrap',
            }}>{label}</div>
        </div>
    );
}

function ParticleRing() {
    const particles = Array.from({ length: 24 }, (_, i) => ({
        angle: (i * 15),
        delay: i * 0.1,
        size: 4 + (i % 3) * 2,
    }));

    return (
        <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 460, height: 460, pointerEvents: 'none',
            animation: 'spin-slow 30s linear infinite',
        }}>
            {particles.map((p, i) => {
                const rad = (p.angle * Math.PI) / 180;
                const x = Math.cos(rad) * 200;
                const y = Math.sin(rad) * 200;
                return (
                    <div key={i} style={{
                        position: 'absolute', top: '50%', left: '50%',
                        width: p.size, height: p.size,
                        background: i % 3 === 0 ? C.accent : i % 3 === 1 ? C.primary : C.pink,
                        borderRadius: '50%',
                        boxShadow: `0 0 8px currentColor`,
                        opacity: 0.7,
                        transform: `translate(${x - p.size/2}px, ${y - p.size/2}px)`,
                        animation: `float-particle 4s ease-in-out infinite`,
                        animationDelay: `${p.delay}s`,
                    }} />
                );
            })}
        </div>
    );
}

