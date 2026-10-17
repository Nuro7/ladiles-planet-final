/**
 * ComingSoon.jsx — polished, shell-consistent screen for modules whose backend
 * pipeline isn't wired yet (Wedding, AI Bridal Wall). Full studio chrome, honest
 * about status, and points the user to a working studio.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import StudioLayout from '../StudioLayout';
import { motion as Motion } from 'framer-motion';
import { Button } from '../primitives';

export default function ComingSoon({ eyebrow, icon: Icon, title, sub, features = [], ctaLabel, ctaTo }) {
  const navigate = useNavigate();

  const header = (
    <div className="s-modhead">
      <div>
        <div className="s-eyebrow">{eyebrow}</div>
        <h1 className="s-modhead__title" style={{ marginTop: 4 }}>{title}</h1>
        <div className="s-modhead__sub">{sub}</div>
      </div>
      <span className="s-badge s-badge--gold s-badge--dot">Preview</span>
    </div>
  );

  const canvas = (
    <div className="s-empty" style={{ justifyContent: 'flex-start', paddingTop: 60 }}>
      <div className="s-empty__mark" style={{ animation: 's-float 5s ease-in-out infinite' }}>
        {Icon && <Icon size={34} strokeWidth={1.5} />}
      </div>
      <h2 className="s-empty__title">{title}</h2>
      <p className="s-empty__sub">This studio is in private preview. The interface below is final — generation lights up as its pipeline comes online.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, maxWidth: 720, width: '100%', marginTop: 30 }}>
        {features.map((f, i) => (
          <Motion.div key={i} className="s-card" style={{ padding: 16, textAlign: 'left' }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <div className="s-mono" style={{ color: 'var(--gold)', fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontWeight: 600, marginTop: 6, fontSize: 14 }}>{f.title}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginTop: 4, lineHeight: 1.55 }}>{f.body}</div>
          </Motion.div>
        ))}
      </div>

      {ctaTo && (
        <Button variant="gold" style={{ marginTop: 28 }} onClick={() => navigate(ctaTo)}>
          {ctaLabel} <ArrowUpRight size={15} />
        </Button>
      )}
    </div>
  );

  return <StudioLayout header={header} canvas={canvas} />;
}
