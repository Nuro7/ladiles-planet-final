/**
 * GeneratingExperience.jsx — the couture-thread generation ritual.
 * A gold "thread" advances through eight named atelier stages while a soft
 * ring of particles turns and behind-the-scenes insights rotate. This is the
 * one place the design spends its motion budget.
 *
 * Props: { bridePreview, dressPreview, progress:{pct,status}, kind:'image'|'video' }
 */
import { useEffect, useState } from 'react';

const STAGES = [
  { cap: 'Prep',   name: 'Preparing your images' },
  { cap: 'Face',   name: 'Analyzing bride identity' },
  { cap: 'Dress',  name: 'Detecting dress & embroidery' },
  { cap: 'Style',  name: 'AI styling the composition' },
  { cap: 'Scene',  name: 'Building the background' },
  { cap: 'Light',  name: 'Grading light & color' },
  { cap: 'Render', name: 'Rendering the final frames' },
  { cap: 'Finish', name: 'Finishing & polishing' },
];

const INSIGHTS = [
  ['Identity lock', 'Every frame is anchored to your bride’s face — no drift, no morphing.'],
  ['Couture detail', 'Heavy embroidery and zari work are preserved by the negative-prompt system.'],
  ['Champagne light', 'Scenes are graded toward warm golden-hour tones for a luxury bridal look.'],
  ['85mm feel', 'Shallow depth of field mimics the lenses used in editorial bridal shoots.'],
  ['Fabric flow', 'Motion is processed separately so drapes and veils fall naturally.'],
  ['Skin science', 'Tones and jewelry highlights are calibrated to read true, never plastic.'],
];

export default function GeneratingExperience({ bridePreview, dressPreview, progress = { pct: 0 }, kind = 'image' }) {
  const [ins, setIns] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIns((i) => (i + 1) % INSIGHTS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const pct = Math.max(2, Math.min(99, Number(progress.pct) || 0));
  const stageIdx = Math.min(STAGES.length - 1, Math.floor((pct / 100) * STAGES.length));
  const stage = STAGES[stageIdx];
  const [t1, t2] = INSIGHTS[ins];

  return (
    <div className="s-gen">
      <div className="s-gen__aura" />
      <ParticleRing />

      {(bridePreview || dressPreview) && (
        <div className="s-gen__thumbs">
          {bridePreview && <div className="s-gen__thumb"><img src={bridePreview} alt="Bride" /></div>}
          {dressPreview && <div className="s-gen__thumb"><img src={dressPreview} alt="Dress" /></div>}
        </div>
      )}

      <div className="s-gen__stage">{stage.name}</div>
      <div className="s-gen__pct s-mono">{Math.round(pct)}% · {kind === 'video' ? 'cinematic render' : 'poster render'}</div>

      <div className="s-stitch">
        <div className="s-stitch__track">
          <div className="s-stitch__fill" style={{ width: `${pct}%` }} />
          <div className="s-stitch__needle" style={{ left: `${pct}%` }} />
        </div>
        <div className="s-stitch__nodes">
          {STAGES.map((s, i) => (
            <div key={s.cap} className={`s-stitch__node ${i < stageIdx ? 'is-done' : ''} ${i === stageIdx ? 'is-active' : ''}`}>
              <span className="s-stitch__dot" />
              <span className="s-stitch__cap">{s.cap}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="s-gen__insight" key={ins} style={{ animation: 's-fade-up .5s var(--ease) both' }}>
        <b>{t1}.</b> {t2}
      </div>
    </div>
  );
}

function ParticleRing() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    angle: i * 18, delay: (i % 6) * 0.25, size: 3 + (i % 3),
  }));
  return (
    <div className="s-gen__ring" style={{ animation: 's-spin 34s linear infinite' }}>
      {particles.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = Math.cos(rad) * 150;
        const y = Math.sin(rad) * 150;
        return (
          <span key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: p.size, height: p.size, borderRadius: '50%',
            background: i % 4 === 0 ? 'var(--gold-hi)' : 'rgba(212,175,106,.5)',
            boxShadow: '0 0 8px rgba(212,175,106,.7)',
            transform: `translate(${x - p.size / 2}px, ${y - p.size / 2}px)`,
            animation: `s-float 4s ease-in-out infinite`, animationDelay: `${p.delay}s`,
            opacity: 0.75,
          }} />
        );
      })}
    </div>
  );
}
