import React from 'react';
import { Sparkles, Video, Wand2, ShieldCheck, Cpu } from 'lucide-react';

const LoadingProgress = ({ progress }) => {
    const getStage = () => {
        if (progress < 25) return { icon: Cpu,        text: 'Analyzing Facial Vectors…',     desc: 'Establishing high-fidelity landmarks for seamless integration.' };
        if (progress < 50) return { icon: Wand2,      text: 'Neural Texture Mapping…',        desc: 'Applying fabric dynamics and complex jewellery reflections.' };
        if (progress < 75) return { icon: Video,      text: 'Rendering Cinematic Sequences…', desc: 'Calculating shadows and environmental lighting.' };
        return               { icon: ShieldCheck, text: 'Finalizing Encryption…',          desc: 'Securing your private visualization for delivery.' };
    };

    const stage  = getStage();
    const Icon   = stage.icon;
    const filled = Math.round(progress / 25);

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
            {/* Glowing icon */}
            <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 36 }}>
                <div style={{
                    position: 'absolute', inset: -8,
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '50%',
                    filter: 'blur(20px)',
                }} />
                <div style={{
                    position: 'relative',
                    width: 80, height: 80, borderRadius: 20,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                    <Icon size={32} color="#FFF" strokeWidth={1.5} />
                </div>
            </div>

            <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26, fontWeight: 400,
                color: '#FFF',
                marginBottom: 8,
                letterSpacing: '0.01em',
            }}>
                {stage.text}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
                {stage.desc}
            </p>

            {/* Progress bar */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
                <div style={{
                    height: 4, borderRadius: 4,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'linear-gradient(to right, rgba(255,255,255,0.6), #FFF)',
                        borderRadius: 4,
                        transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                </div>
            </div>

            {/* Labels */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--muted)',
                marginBottom: 32,
            }}>
                <span>ENGINE v4.0</span>
                <span style={{ color: '#FFF' }}>{progress}% COMPLETE</span>
                <span>STREAM_01</span>
            </div>

            {/* Step indicator dots */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1,2,3,4].map(i => (
                    <div key={i} style={{
                        height: 4, flex: 1, maxWidth: 80,
                        borderRadius: 4,
                        background: i <= filled ? '#FFF' : 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        transition: 'background 0.7s ease',
                        boxShadow: i <= filled ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
                    }} />
                ))}
            </div>
        </div>
    );
};

export default LoadingProgress;
