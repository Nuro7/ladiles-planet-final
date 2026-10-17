const BASE_URL = import.meta.env.VITE_API_URL || '';

const log = (...args) => {
  if (import.meta.env.DEV) console.log('[TryOn API]', ...args);
};

/**
 * Upload a bride photo for try-on session.
 * @param {File} file
 * @returns {{ sessionId: string, imageUrl: string }}
 */
export async function uploadPhoto(file) {
  log('uploadPhoto', file.name, file.size);
  const form = new FormData();
  form.append('photo', file);

  const res = await fetch(`${BASE_URL}/api/try-on/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed: ${res.status}`);
  }

  const data = await res.json();
  log('uploadPhoto → response', data);
  return data; // { sessionId, imageUrl }
}

/**
 * Apply a dress look to a session.
 * @param {string} sessionId
 * @param {string} lookId
 * @returns {{ resultImageUrl: string, confidence: number }}
 */
export async function applyLook(sessionId, lookId) {
  log('applyLook', { sessionId, lookId });

  const res = await fetch(`${BASE_URL}/api/try-on/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, lookId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Apply failed: ${res.status}`);
  }

  const data = await res.json();
  log('applyLook → response', data);
  return data; // { resultImageUrl, confidence }
}

/**
 * Fetch available looks with optional style filter.
 * @param {{ style?: string }} filters
 * @returns {{ looks: Array }}
 */
export async function getLooks(filters = {}) {
  const params = new URLSearchParams();
  if (filters.style && filters.style !== 'All') {
    params.set('style', filters.style);
  }

  const url = `${BASE_URL}/api/looks${params.toString() ? '?' + params : ''}`;
  log('getLooks', url);

  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Fetch looks failed: ${res.status}`);
  }

  const data = await res.json();
  log('getLooks → response', data);
  return data; // { looks: [...] }
}

export default { uploadPhoto, applyLook, getLooks };
