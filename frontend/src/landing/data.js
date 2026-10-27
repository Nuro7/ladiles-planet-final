/* ═══════════════════════════════════════════════════════════════
   Content + asset map for the cinematic landing page.
   Video files are optional: drop MP4s at these /videos/* paths and the
   VideoBackground primitives light up automatically. Until then the
   poster images + CSS cinematics carry the experience.
   ═══════════════════════════════════════════════════════════════ */

const IMG = {
  bride1: '/lp/placeholders/hero.svg',   // was '/bride-1.png' (removed) — generic poster slot
  bride2: '/lp/placeholders/about.svg',  // was '/bride-2.png' (removed) — generic poster slot
  g1: '/lp/placeholders/gallery-1.svg',
  g2: '/lp/placeholders/gallery-2.svg',
  g3: '/lp/placeholders/gallery-3.svg',
  g4: '/lp/placeholders/gallery-4.svg',
  g5: '/lp/placeholders/gallery-5.svg',
  g6: '/lp/placeholders/gallery-6.svg',
  hero: '/lp/placeholders/hero.svg',
};

export const VIDEOS = {
  hero: { src: ['/api/video?id=1eF-lRp7i1bfLAUXSus89I_AkwUEUifD1'], poster: IMG.bride1 },
  story: { src: ['/api/video?id=1pgD5n8c-WMb1ujBrTsanncQaTPzY8Ifk'], poster: IMG.bride2 },
  wall: { src: ['/api/video?id=1eF-lRp7i1bfLAUXSus89I_AkwUEUifD1'], poster: IMG.bride1 },
  cta: { src: ['/api/video?id=1pgD5n8c-WMb1ujBrTsanncQaTPzY8Ifk'], poster: IMG.bride2 },
};

/* ── TV / signage hero ────────────────────────────────────────────
   Three chaptered slides, each paired 1:1 with a background clip. The film
   plays each clip through once and advances to the next the instant it ENDS,
   carrying its chapter with it (index → SIGNAGE_SLIDES[index] / SIGNAGE_BG[index]),
   so the reel runs 1.mp4 → 2.mp4 → 3.mp4 → 1.mp4… with no clip repeating
   back-to-back. Consumed by sections/Hero.jsx + sections/HeroSlides.jsx. */
export const SIGNAGE_SLIDES = [
  { n: '01', title: 'Ladies Planet', sub: 'Where Every Bride    Finds Her Forever Look.' },
  { n: '02', title: 'Bring out the    Star in You', sub: 'Planet of Elegant Designs.' },
  { n: '03', title: 'Inspired by Tradition', sub: "Designed for Today's Bride." },
];

export const SIGNAGE_BG = [
  { src: ['/api/video?id=1eF-lRp7i1bfLAUXSus89I_AkwUEUifD1'], poster: IMG.bride1 },
  { src: ['/api/video?id=1pgD5n8c-WMb1ujBrTsanncQaTPzY8Ifk'], poster: IMG.bride2 },
  { src: ['/api/video?id=1L582RHeSPVYg13LrGS149e-rpU5LvAEk'], poster: IMG.bride2 },
];

export const GALLERY = [
  { id: 'g1', title: 'Ivory Cathedral', tag: 'Portrait', poster: IMG.bride1, video: '/videos/gallery-1.mp4' },
  { id: 'g2', title: 'Golden Hour', tag: 'Editorial', poster: IMG.g2, video: '/videos/gallery-2.mp4' },
  { id: 'g3', title: 'Veil & Light', tag: 'Close-up', poster: IMG.g3, video: '/videos/gallery-3.mp4' },
  { id: 'g4', title: 'Heirloom Gold', tag: 'Jewelry', poster: IMG.g4, video: '/videos/gallery-4.mp4' },
  { id: 'g5', title: 'The First Turn', tag: 'Cinematic', poster: IMG.bride2, video: '/videos/gallery-5.mp4' },
  { id: 'g6', title: 'Midnight Bloom', tag: 'Fine Art', poster: IMG.g6, video: '/videos/gallery-6.mp4' },
];

export const PROCESS = [
  { n: '01', title: 'Upload a Photo', body: 'A single portrait is all our AI needs to begin — no shoot, no studio, no wait.' },
  { n: '02', title: 'AI Understands Face', body: 'Facial structure, skin tone and features are mapped with couture-level precision.' },
  { n: '03', title: 'Choose a Bridal Style', body: 'Select from cinematic looks — gowns, jewelry, venues and moods, all yours.' },
  { n: '04', title: 'Receive Your Memories', body: 'Breathtaking portraits, films and invitations, delivered in minutes.' },
];

export const FILMS = [
  { id: 'f1', title: 'The Ivory Vow', runtime: '1:42', poster: IMG.bride1, video: '/videos/film-1.mp4' },
  { id: 'f2', title: 'Golden Threads', runtime: '2:08', poster: IMG.g3, video: '/videos/film-2.mp4' },
  { id: 'f3', title: 'A Veiled Dawn', runtime: '1:57', poster: IMG.bride2, video: '/videos/film-3.mp4' },
  { id: 'f4', title: 'Petals & Promises', runtime: '2:31', poster: IMG.g5, video: '/videos/film-4.mp4' },
  { id: 'f5', title: 'The Last Turn', runtime: '1:38', poster: IMG.g2, video: '/videos/film-5.mp4' },
];

export const INVITATIONS = [
  { id: 'i1', title: 'Aurelia', sub: 'Gilded Botanical', poster: IMG.g4 },
  { id: 'i2', title: 'Seraphine', sub: 'Minimal Ivory', poster: IMG.g6 },
  { id: 'i3', title: 'Vespera', sub: 'Midnight Foil', poster: IMG.g2 },
];

export const TESTIMONIALS = [
  { id: 't1', name: 'Ananya & Rohan', place: 'Udaipur', quote: 'It felt like stepping into a film about my own wedding. Every frame looked like a magazine cover.', poster: IMG.bride1 },
  { id: 't2', name: 'Meera Kapoor', place: 'Mumbai', quote: 'One photo became an entire bridal story. My family cried watching the film.', poster: IMG.bride2 },
  { id: 't3', name: 'Zoya Rahman', place: 'Dubai', quote: 'The jewelry, the veil, the light — flawless. No studio ever gave me this.', poster: IMG.g3 },
];

export const STATS = [
  { value: 10000, suffix: '+', label: 'Happy Brides' },
  { value: 500, suffix: 'K+', label: 'Photos Generated' },
  { value: 100, suffix: '+', label: 'Wedding Studios' },
  { value: 98, suffix: '%', label: 'Customer Satisfaction' },
];

export { IMG };

/**
 * Keep Studio navigation inside the installed Vercel PWA. The actual
 * Higgsfield application is rendered by App.jsx inside the /studio route so
 * Chrome does not switch the top-level PWA to an out-of-scope origin.
 */
export const STUDIO_URL = '/studio';
export const HIGGSFIELD_STUDIO_URL = 'https://ladies-planet.higgsfield.app/';
