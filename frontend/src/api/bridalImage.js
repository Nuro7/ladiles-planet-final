/**
 * bridalImage.js — client SDK for image generation
 * Mirrors bridalVideo.js for the Image Studio feature.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const log = (...args) => {
    if (import.meta.env.DEV) console.log('[BridalImage API]', ...args);
};

async function safeFetch(url, init) {
    const res = await fetch(url, init);
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!res.ok) {
        const msg = body?.error || body?.detail || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return body;
}

/**
 * Force a real download (save to device), not a new tab.
 * - blob:/data: URLs download directly (same-origin)
 * - remote http(s) URLs route through the backend proxy which adds
 *   Content-Disposition: attachment (the HTML5 `download` attr is ignored
 *   by browsers for cross-origin CDN URLs like Higgsfield's).
 */
export function downloadFile(url, name = 'ladies-planet') {
    if (!url) return;
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
    }
    const proxied = `${BASE_URL}/images/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
    const a = document.createElement('a');
    a.href = proxied;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/** GET /api/images/poses — pose preset list */
export async function getPoses() {
    const data = await safeFetch(`${BASE_URL}/images/poses`);
    return data.data || [];
}

/** POST /api/images/calculate-cost — preflight cost preview */
export async function calculateImageCost(settings) {
    log('calculateCost', settings);
    const data = await safeFetch(`${BASE_URL}/images/calculate-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
    return data.data;
}

/** POST /api/images/enhance-prompt — preview the enhanced custom pose prompt */
export async function enhanceImagePrompt(userPrompt) {
    const data = await safeFetch(`${BASE_URL}/images/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt }),
    });
    return data.data;
}

/** POST /api/images/expand-prompt — Gemini keyword expansion for poses */
export async function expandImagePrompt(userPrompt) {
    const data = await safeFetch(`${BASE_URL}/images/expand-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt }),
    });
    return data.data;
}

/**
 * POST /api/images/generate
 * @param {Object} params
 *   brideImage      File | { _galleryUrl }
 *   dressImage      File | { _galleryUrl } | null
 *   pose            string  e.g. 'front_portrait' | 'custom'
 *   customPrompt    string  required when pose === 'custom'
 *   model           'nano-banana' | 'nano-banana-pro' | 'chatgpt-image'
 *   aspectRatio     '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
 *   resolution      '1k' | '2k' | '4k'
 *   quality         'low' | 'medium' | 'high' (gpt only)
 */
export async function generateImage(params) {
    log('generateImage', { ...params, brideImage: params.brideImage?.name, dressImage: params.dressImage?.name });
    const fd = new FormData();

    if (params.brideImage?._galleryUrl)      fd.append('brideImageUrl', params.brideImage._galleryUrl);
    else if (params.brideImage)              fd.append('brideImage',    params.brideImage);

    if (params.dressImage?._galleryUrl)      fd.append('dressImageUrl', params.dressImage._galleryUrl);
    else if (params.dressImage)              fd.append('dressImage',    params.dressImage);

    fd.append('pose',         params.pose || 'front_portrait');
    if (params.customPrompt)  fd.append('customPrompt', params.customPrompt);
    fd.append('model',        'chatgpt-image');
    fd.append('aspectRatio',  params.aspectRatio || '3:4');
    fd.append('resolution',   '2k');
    fd.append('quality',      'medium');

    return safeFetch(`${BASE_URL}/images/generate`, { method: 'POST', body: fd });
}

/** GET /api/images — history of generated images */
export async function getImageHistory() {
    const data = await safeFetch(`${BASE_URL}/images`);
    return data.data || [];
}

/** POST /api/images/save-composited — store the logo-overlaid version */
export async function saveCompositedImage(blob, originalImageUrl) {
    const fd = new FormData();
    fd.append('image', blob, 'composited.jpg');
    if (originalImageUrl) fd.append('originalImageUrl', originalImageUrl);
    return safeFetch(`${BASE_URL}/images/save-composited`, { method: 'POST', body: fd });
}

/**
 * Overlay the Ladies Planet logo onto an image in a canvas.
 * Returns a JPEG Blob of the composited result.
 *
 * @param {string} imageUrl  – the generated image (CORS-friendly)
 * @param {string} logoUrl   – the Ladies Planet logo PNG (white-on-transparent)
 * @param {Object} opts
 *   corner    'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' (default 'top-right')
 *   padding   number — fraction of image width for inset (default 0.04)
 *   logoScale number — logo width as fraction of image width (default 0.18)
 *   shadow    boolean — drop shadow under logo (default true)
 */
export async function composeWithLogo(imageUrl, logoUrl, opts = {}) {
    const {
        corner    = 'top-right',
        padding   = 0.04,
        logoScale = 0.18,
        shadow    = true,
    } = opts;

    const [img, logo] = await Promise.all([
        loadImage(imageUrl),
        loadImage(logoUrl),
    ]);

    const c = document.createElement('canvas');
    c.width  = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Compute logo size (clamped)
    const logoW = Math.max(120, Math.min(c.width * logoScale, c.width * 0.32));
    const ratio = logo.naturalHeight / logo.naturalWidth;
    const logoH = logoW * ratio;
    const pad   = c.width * padding;

    let x, y;
    if (corner.endsWith('right')) x = c.width - logoW - pad;
    else                          x = pad;
    if (corner.startsWith('bottom')) y = c.height - logoH - pad;
    else                             y = pad;

    if (shadow) {
        ctx.shadowColor   = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur    = Math.max(8, c.width * 0.012);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.max(2, c.width * 0.004);
    }
    ctx.drawImage(logo, x, y, logoW, logoH);
    ctx.shadowColor = 'transparent';

    return new Promise((resolve, reject) => {
        c.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')),
                 'image/jpeg', 0.94);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload  = () => resolve(im);
        im.onerror = () => reject(new Error(`Image failed to load: ${src.slice(0, 80)}`));
        im.src = src;
    });
}

export default {
    getPoses,
    calculateImageCost,
    enhanceImagePrompt,
    generateImage,
    getImageHistory,
    saveCompositedImage,
    composeWithLogo,
};
