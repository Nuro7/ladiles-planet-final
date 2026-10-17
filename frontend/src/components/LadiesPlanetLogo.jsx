/**
 * LadiesPlanetLogo.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable brand logo — flower icon + "LADIES PLANET" wordmark.
 * Matches the elegant serif typography used on the landing page.
 *
 * Usage:
 *   <LadiesPlanetLogo />                    // default size, light variant
 *   <LadiesPlanetLogo height={24} />        // custom height
 *   <LadiesPlanetLogo variant="cream" />    // cream / gold accent
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Local white wordmark shipped in /public (no external dependency).
const LOGO_URL = '/logo%20ladies%20plant.png';

export default function LadiesPlanetLogo({
    height = 28,
    variant = 'cream', // 'cream' | 'gold' | 'white'
    // Default OFF — the logo image already contains the "LADIES PLANET"
    // wordmark, so rendering an extra <span> creates duplicate text.
    // The SVG fallback path still uses it when the image fails to load.
    showWordmark = false,
    style = {},
}) {
    const colors = {
        cream: '#F5E6C8',
        gold:  '#D4AF6A',   // champagne gold — matches the brand --cine-gold (was burgundy #B24A60)
        white: '#FFFFFF',
    };
    const color = colors[variant] || colors.cream;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            ...style,
        }}>
            <img
                src={LOGO_URL}
                alt="Ladies Planet"
                style={{
                    height: `${height}px`,
                    display: 'block',
                }}
                onError={(e) => {
                    // Fallback to SVG flower if external image fails
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline-flex';
                }}
            />
            {/* SVG fallback flower */}
            <svg
                width={height} height={height}
                viewBox="0 0 32 32" fill="none"
                style={{ display: 'none' }}
            >
                <g fill={color}>
                    {[0, 72, 144, 216, 288].map(angle => (
                        <ellipse key={angle} cx="16" cy="8" rx="3.5" ry="6.5"
                            transform={`rotate(${angle} 16 16)`} />
                    ))}
                    <circle cx="16" cy="16" r="2" fill={color} opacity="0.7" />
                </g>
            </svg>
            {showWordmark && (
                <span style={{
                    fontFamily: 'var(--font-display, "Cormorant Garamond", Georgia, serif)',
                    fontWeight: 600,
                    fontSize: `${height * 0.5}px`,
                    letterSpacing: '0.18em',
                    color,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                }}>
                    Ladies Planet
                </span>
            )}
        </div>
    );
}
