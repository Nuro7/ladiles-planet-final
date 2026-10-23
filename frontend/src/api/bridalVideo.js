/**
 * bridalVideo.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Client SDK for the new Higgsfield-powered bridal video pipeline.
 *
 * Endpoints (all under /api/videos):
 *   GET    /scenarios               → list preset scenarios for the buttons
 *   GET    /provider/balance        → live credit balance (Higgsfield)
 *   POST   /calculate-cost          → live credit estimate as user changes settings
 *   POST   /generate                → generate video with explicit settings
 *   POST   /generate-smart          → natural-language → Gemini → Higgsfield
 *   POST   /parse-prompt            → preview Gemini's plan without generating
 *   GET    /session/:id             → poll generation status
 * ─────────────────────────────────────────────────────────────────────────────
 */

// VITE_API_URL is "/api" in dev (Vite proxy → backend). Treat as full prefix.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const log = (...args) => {
  if (import.meta.env.DEV) console.log('[BridalVideo API]', ...args);
};

async function safeFetch(url, init) {
  const res = await (await import('../utils/api')).fetchWithAuth(url, init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) {
    const msg = body?.error || body?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/** GET /api/videos/scenarios — preset scenario buttons */
export async function getScenarios() {
  log('getScenarios');
  const data = await safeFetch(`${BASE_URL}/videos/scenarios`);
  return data.data || [];
}

/** GET /api/videos/provider/balance — Higgsfield credit balance */
export async function getBalance() {
  log('getBalance');
  const data = await safeFetch(`${BASE_URL}/videos/provider/balance`);
  return data.data || { credits: 0 };
}

/**
 * POST /api/videos/calculate-cost — live cost preview (REAL cost from engine when available)
 * @param {{model, duration, resolution, mode, multiShot, sound}} settings
 */
export async function calculateCost(settings) {
  log('calculateCost', settings);
  const data = await safeFetch(`${BASE_URL}/videos/calculate-cost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return data.data; // { credits, costINR, costUSD, source }
}

/**
 * POST /api/videos/generate — generate with explicit settings (Mode B: buttons)
 *
 * @param {Object} params
 *   brideImage   File         — required
 *   dressImage   File         — required
 *   scenario     string       — 'stage_entry' | 'mandap_moment' | etc | 'custom'
 *   customPrompt string       — required when scenario === 'custom'
 *   model        string       — 'kling-3.0' (default)
 *   duration     number       — 5 | 10 | 15
 *   resolution   string       — '720p' | '1080p' | '4K'
 *   mode         string       — 'fast' | 'std'
 *   multiShot    boolean
 *   sound        boolean
 */
export async function generateVideo(params) {
  log('generateVideo', { ...params, brideImage: params.brideImage?.name, dressImage: params.dressImage?.name });

  const fd = new FormData();

  // Handle bride: either a File OR a gallery-picked URL
  if (params.brideImage?._galleryUrl) {
    fd.append('brideImageUrl', params.brideImage._galleryUrl);
  } else if (params.brideImage) {
    fd.append('brideImage', params.brideImage);
  }

  // Handle dress: same pattern
  if (params.dressImage?._galleryUrl) {
    fd.append('dressImageUrl', params.dressImage._galleryUrl);
  } else if (params.dressImage) {
    fd.append('dressImage', params.dressImage);
  }

  fd.append('generationMode', 'vton');
  fd.append('scenario', params.scenario || 'stage_entry');
  if (params.customPrompt) fd.append('customPrompt', params.customPrompt);
  if (params.model)        fd.append('model', params.model);
  if (params.duration)     fd.append('videoDuration', String(params.duration));
  if (params.resolution)   fd.append('resolution', params.resolution);
  if (params.mode)         fd.append('mode', params.mode);
  if (typeof params.multiShot === 'boolean') fd.append('multiShot', String(params.multiShot));
  if (typeof params.sound === 'boolean')     fd.append('enableSound', String(params.sound));

  return safeFetch(`${BASE_URL}/videos/generate`, { method: 'POST', body: fd });
}

/**
 * POST /api/videos/generate-smart — natural language → Gemini → generate (Mode A: magic)
 *
 * @param {Object} params
 *   brideImage   File
 *   dressImage   File
 *   userPrompt   string  — e.g. "15 second sangeet dance in 4K with Kling 3.0"
 *   confirmFirst boolean — if true, return Gemini's plan WITHOUT generating
 */
export async function generateSmart(params) {
  log('generateSmart', { userPrompt: params.userPrompt });
  const fd = new FormData();
  fd.append('brideImage',  params.brideImage);
  fd.append('dressImage',  params.dressImage);
  fd.append('userPrompt',  params.userPrompt);
  if (params.confirmFirst) fd.append('confirmFirst', 'true');
  return safeFetch(`${BASE_URL}/videos/generate-smart`, { method: 'POST', body: fd });
}

/**
 * POST /api/videos/enhance-prompt — preview the cinematic-enhanced version
 * of the user's typed custom prompt (with identity-lock + cinema + negatives).
 */
export async function enhancePrompt(userPrompt) {
  log('enhancePrompt', userPrompt);
  const data = await safeFetch(`${BASE_URL}/videos/enhance-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt }),
  });
  return data.data; // { original, enhanced, negativePrompt }
}

/**
 * POST /api/videos/expand-prompt — turn simple keywords ("bride rotating scene")
 * into a rich cinematic wedding-scene direction via Gemini, with a smart
 * template fallback when Gemini quota is exhausted.
 *
 * Returns: { expanded, source: 'gemini' | 'template' }
 */
export async function expandPrompt(userPrompt, kind = 'video') {
  log('expandPrompt', userPrompt);
  const data = await safeFetch(`${BASE_URL}/videos/expand-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt, kind }),
  });
  return data.data;
}

/** POST /api/videos/parse-prompt — show Gemini's plan without consuming credits */
export async function parsePrompt(userPrompt) {
  log('parsePrompt', userPrompt);
  const data = await safeFetch(`${BASE_URL}/videos/parse-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt }),
  });
  return data.data; // { plan, estimate }
}

/** GET /api/videos/session/:id — poll session progress */
export async function getSession(sessionId) {
  return safeFetch(`${BASE_URL}/videos/session/${sessionId}`);
}

/**
 * Capture the last frame of a video as a JPEG Blob via canvas.
 * Used as the start_image for extension generations.
 *
 * @param {string} videoUrl  – publicly accessible video URL (must be CORS-friendly)
 * @returns {Promise<Blob>}  – JPEG blob of the last frame
 */
export async function captureLastFrame(videoUrl) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';

    let timer = setTimeout(() => reject(new Error('Video load timed out (15s)')), 15000);
    const cleanup = () => { clearTimeout(timer); v.remove(); };

    v.onloadedmetadata = () => {
      // Seek as close to the end as possible (sub a tiny epsilon so the
      // last decoded frame is the painted one, not a black post-end frame).
      v.currentTime = Math.max(0, v.duration - 0.08);
    };
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas');
        c.width  = v.videoWidth  || 1280;
        c.height = v.videoHeight || 720;
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(blob => {
          cleanup();
          if (!blob) return reject(new Error('Canvas toBlob returned null'));
          resolve(blob);
        }, 'image/jpeg', 0.92);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    v.onerror = () => { cleanup(); reject(new Error('Video failed to load (CORS or 404?)')); };
    v.src = videoUrl;
  });
}

/**
 * POST /api/videos/extend
 * Generate a continuation clip starting from the last frame of an existing video.
 *
 * @param {Object} params
 *   videoUrl       string  – the existing video to extend (we'll capture its last frame)
 *   prompt         string  – what should happen next in the new clip
 *   duration       number  – seconds (default 5)
 *   resolution     string  – '480p' | '720p' | '1080p'
 *   model          string  – e.g. 'seedance-2.0-fast'
 *   mode           string  – 'fast' | 'std'
 *
 * @returns {Promise<{sessionId, startFrameUrl}>}
 */
export async function extendVideo({ videoUrl, prompt, duration = 5, resolution = '720p', model = 'seedance-2.0-fast', mode = 'fast' }) {
  log('extendVideo', { videoUrl: videoUrl.slice(-40), prompt: prompt.slice(0, 60), duration });
  if (!videoUrl) throw new Error('videoUrl is required to extend');
  if (!prompt || prompt.trim().length < 5) throw new Error('Write at least 5 characters describing what should happen next');

  const blob = await captureLastFrame(videoUrl);
  const fd = new FormData();
  fd.append('lastFrameImage', blob, 'last-frame.jpg');
  fd.append('prompt', prompt);
  fd.append('duration', String(duration));
  fd.append('resolution', resolution);
  fd.append('model', model);
  fd.append('mode', mode);
  fd.append('parentVideoUrl', videoUrl);

  const data = await safeFetch(`${BASE_URL}/videos/extend`, { method: 'POST', body: fd });
  return data.data;
}

export default {
  getScenarios,
  getBalance,
  calculateCost,
  generateVideo,
  generateSmart,
  parsePrompt,
  enhancePrompt,
  getSession,
  extendVideo,
  captureLastFrame,
};
