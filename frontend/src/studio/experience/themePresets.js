/**
 * themePresets.js — built-in starter themes for the ThemePicker (scenes for the
 * Film studio, poses for the Poster studio). Each theme carries a default prompt
 * and a designed SVG cover (a self-contained data-URI in the champagne-on-cherry
 * studio palette — no external assets, works offline).
 *
 * These are the source shown until the backend returns its own scenarios/poses.
 * When the backend ships `coverImage` + `prompt`, the modules merge by `id` and
 * the backend values take precedence (see CinematicStudio/PosterStudio), so this
 * file stays a graceful fallback. Swap a `cover` for a real image URL any time.
 */

/* Build a cover as an inline SVG data-URI: vertical gradient a→b + gold glow + motif. */
const cover = (a, b, motif) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 200'>`
    + `<defs>`
    + `<linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient>`
    + `<radialGradient id='gl' cx='50%' cy='32%' r='62%'><stop offset='0' stop-color='#D4AF6A' stop-opacity='0.38'/><stop offset='1' stop-color='#D4AF6A' stop-opacity='0'/></radialGradient>`
    + `</defs>`
    + `<rect width='320' height='200' fill='url(#bg)'/>`
    + `<rect width='320' height='200' fill='url(#gl)'/>`
    + motif
    + `</svg>`,
  )}`;

/* Scene / pose motifs — simple gold vector art, one per theme. */
const M = {
  window:
    `<path d='M132 158 V78 a28 28 0 0 1 56 0 V158 Z' fill='#E8CC8A' fill-opacity='0.08'/>`
    + `<g fill='none' stroke='#E8CC8A' stroke-width='1.4' opacity='0.85'><path d='M132 158 V78 a28 28 0 0 1 56 0 V158'/><path d='M160 50 V158 M132 104 H188'/></g>`
    + `<circle cx='160' cy='34' r='2.4' fill='#F1DDAF'/><circle cx='149' cy='40' r='1.4' fill='#F1DDAF' opacity='0.85'/><circle cx='171' cy='40' r='1.4' fill='#F1DDAF' opacity='0.85'/>`,
  sun:
    `<circle cx='160' cy='94' r='30' fill='#F1DDAF' fill-opacity='0.85'/>`
    + `<circle cx='160' cy='94' r='44' fill='none' stroke='#F1DDAF' stroke-opacity='0.28' stroke-width='1'/>`
    + `<line x1='0' y1='150' x2='320' y2='150' stroke='#E8CC8A' stroke-opacity='0.45'/>`,
  spotlight:
    `<path d='M160 6 L98 170 L222 170 Z' fill='#F1DDAF' fill-opacity='0.12'/>`
    + `<ellipse cx='160' cy='170' rx='62' ry='10' fill='#F1DDAF' fill-opacity='0.18'/>`
    + `<g fill='#E8CC8A' opacity='0.7'><circle cx='132' cy='118' r='1.6'/><circle cx='188' cy='102' r='1.6'/><circle cx='150' cy='150' r='1.6'/><circle cx='176' cy='138' r='1.6'/></g>`,
  arch:
    `<path d='M80 96 Q160 40 240 96' fill='#E8CC8A' fill-opacity='0.07'/>`
    + `<path d='M80 160 V96 Q160 40 240 96 V160' fill='none' stroke='#E8CC8A' stroke-width='1.6' opacity='0.85'/>`
    + `<g fill='#F1DDAF' opacity='0.85'><circle cx='120' cy='78' r='2'/><circle cx='160' cy='66' r='2.4'/><circle cx='200' cy='78' r='2'/></g>`,
  foliage:
    `<g fill='#7FB08A' fill-opacity='0.45'><path d='M0 200 Q40 150 80 200 Z'/><path d='M60 200 Q110 145 160 200 Z'/><path d='M150 200 Q210 150 260 200 Z'/><path d='M240 200 Q290 150 320 200 Z'/></g>`
    + `<g fill='#F1DDAF'><circle cx='90' cy='58' r='1.6'/><circle cx='150' cy='46' r='1.6'/><circle cx='210' cy='58' r='1.6'/><circle cx='250' cy='48' r='1.6'/></g>`,
  waves:
    `<circle cx='160' cy='82' r='26' fill='#F1DDAF' fill-opacity='0.85'/>`
    + `<g fill='none' stroke='#CDB6C0' stroke-opacity='0.5' stroke-width='1.3'><path d='M0 150 Q40 142 80 150 T160 150 T240 150 T320 150'/><path d='M0 166 Q40 158 80 166 T160 166 T240 166 T320 166'/></g>`,
  portrait:
    `<circle cx='160' cy='100' r='58' fill='#E8CC8A' fill-opacity='0.10'/>`
    + `<circle cx='160' cy='96' r='20' fill='#F1DDAF' fill-opacity='0.6'/>`
    + `<path d='M124 168 Q160 118 196 168 Z' fill='#F1DDAF' fill-opacity='0.5'/>`,
  chair:
    `<g fill='none' stroke='#E8CC8A' stroke-width='1.6' opacity='0.85'><path d='M120 160 V92 Q160 66 200 92 V160'/><path d='M120 128 H200'/><path d='M128 160 V172 M192 160 V172'/></g>`,
  bokeh:
    `<g fill='#F1DDAF'><circle cx='70' cy='68' r='10' opacity='0.16'/><circle cx='232' cy='58' r='16' opacity='0.13'/><circle cx='120' cy='122' r='7' opacity='0.22'/><circle cx='250' cy='140' r='9' opacity='0.15'/><circle cx='170' cy='90' r='5' opacity='0.3'/><circle cx='60' cy='150' r='6' opacity='0.2'/></g>`,
  ring:
    `<g fill='none' stroke='#E8CC8A'><circle cx='160' cy='100' r='24' stroke-opacity='0.9' stroke-width='2'/><circle cx='160' cy='100' r='40' stroke-opacity='0.4'/><circle cx='160' cy='100' r='56' stroke-opacity='0.2'/></g>`
    + `<circle cx='160' cy='100' r='6' fill='#F1DDAF' fill-opacity='0.85'/>`,
};

/* ── Film scenes ──────────────────────────────────────────── */
export const SCENE_THEMES = [
  {
    id: 'indoor', label: 'Indoor Elegance', description: 'Warm hall & chandelier light',
    cover: cover('#3A0A12', '#2A0207', M.window),
    prompt: 'Elegant indoor wedding hall with warm chandelier light, the bride walking gracefully across a polished marble floor, soft golden ambience, shallow depth of field, cinematic',
  },
  {
    id: 'outdoor', label: 'Outdoor Romance', description: 'Golden-hour open sky',
    cover: cover('#4A2033', '#2A0207', M.sun),
    prompt: 'Romantic outdoor setting at golden hour, open sky and soft sunlight, the bride posed against a dreamy natural backdrop, gentle breeze in the veil, warm cinematic glow',
  },
  {
    id: 'stage_entry', label: 'Stage Entry', description: 'Spotlight grand entrance',
    cover: cover('#320810', '#1E0206', M.spotlight),
    prompt: 'Grand stage entry under a bright spotlight with petals falling, the bride making a majestic entrance, dramatic rim lighting, slow cinematic reveal',
  },
  {
    id: 'mandap_moment', label: 'Mandap Moment', description: 'Traditional floral canopy',
    cover: cover('#4A1018', '#2A0207', M.arch),
    prompt: 'Traditional mandap decorated with flowers and drapes, sacred warm lighting, the bride seated regally, rich cultural detail, tender cinematic close-ups',
  },
  {
    id: 'garden', label: 'Garden Ceremony', description: 'Greenery & string lights',
    cover: cover('#33202A', '#2A0207', M.foliage),
    prompt: 'Lush garden ceremony with string lights and greenery, soft dappled sunlight, the bride amid blooming florals, airy and romantic, cinematic',
  },
  {
    id: 'beach', label: 'Beach Sunset', description: 'Golden sky & gentle waves',
    cover: cover('#2A3340', '#2A0207', M.waves),
    prompt: 'Beach at sunset with a golden sky and gentle waves, the bride by the shore, flowing gown catching the breeze, warm luminous cinematic tones',
  },
];

/* ── Poster poses ─────────────────────────────────────────── */
export const POSE_THEMES = [
  {
    id: 'front_portrait', label: 'Front Portrait', description: 'Classic editorial portrait',
    cover: cover('#3A0A12', '#2A0207', M.portrait),
    prompt: 'Elegant front-facing bridal portrait, soft studio lighting, graceful posture, luxurious fabric and jewelry detail, sharp editorial focus',
  },
  {
    id: 'seated', label: 'Seated Grace', description: 'Poised on an ornate chair',
    cover: cover('#46101A', '#2A0207', M.chair),
    prompt: 'Bride seated gracefully on an ornate chair, poised and regal, warm soft light, refined luxury portrait with rich detail',
  },
  {
    id: 'outdoor', label: 'Outdoor Portrait', description: 'Natural golden light',
    cover: cover('#4A2033', '#2A0207', M.sun),
    prompt: 'Outdoor bridal portrait in natural golden light, soft greenery backdrop, relaxed elegant pose, editorial warmth and glow',
  },
  {
    id: 'candid', label: 'Candid Glance', description: 'Natural, soft bokeh',
    cover: cover('#33202A', '#2A0207', M.bokeh),
    prompt: 'Candid bridal moment with natural movement and a gentle glance, soft bokeh background, warm romantic tones, lifelike detail',
  },
  {
    id: 'closeup', label: 'Bridal Close-up', description: 'Veil & jewelry detail',
    cover: cover('#320810', '#1E0206', M.ring),
    prompt: 'Intimate bridal close-up highlighting the veil, jewelry and delicate embroidery, soft focus with a luminous glow, luxurious detail',
  },
];
