import { useState } from 'react';
import './landing.css';
import BodoniText from './primitives/BodoniText';

/**
 * /type-lab — a standalone preview stage for <BodoniText/>.
 * Lets you flip the selectable accent pairing live and watch the 5s
 * come-and-go loop against the cinematic cherry-and-gold room.
 */
const PHRASES = [
  { kicker: 'Ladies Planet · Est. MMXXV', title: 'Bridal, Reimagined', sub: 'An AI atelier for the modern bride.' },
  { kicker: 'The Signature Wall', title: 'Every Gown a Portrait', sub: 'Curated, cinematic, unmistakably you.' },
  { kicker: 'Champagne & Cherry', title: 'Dressed in Light', sub: 'Where couture meets computation.' },
];

const FONTS = [
  { id: 'jost', label: 'Bodoni × Jost' },
  { id: 'grotesk', label: 'Bodoni × Space Grotesk' },
  { id: 'cormorant', label: 'Bodoni × Cormorant' },
];

export default function TypeLab() {
  const [font, setFont] = useState('jost');

  return (
    <div className="cine-root" style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 'clamp(24px, 6vw, 80px)' }}>
      <div style={{ width: '100%', maxWidth: 'min(900px, 92vw)' }}>
        {/* Font selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 'clamp(28px, 6vh, 64px)' }}>
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFont(f.id)}
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer',
                padding: '9px 16px', borderRadius: 999,
                color: font === f.id ? '#320004' : 'var(--cine-ivory)',
                background: font === f.id ? 'var(--cine-gold)' : 'transparent',
                border: `1px solid ${font === f.id ? 'var(--cine-gold)' : 'var(--cine-glass-border)'}`,
                transition: 'all 0.25s var(--cine-ease)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* The animated display — remounts on font change so the new pairing
            enters cleanly from the top of a cycle. */}
        <BodoniText key={font} phrases={PHRASES} font={font} cycle={5000} align="left" />
      </div>
    </div>
  );
}
