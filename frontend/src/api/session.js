const BASE_URL = import.meta.env.VITE_API_URL || '';

const log = (...args) => {
  if (import.meta.env.DEV) console.log('[Session API]', ...args);
};

/**
 * Create a new try-on session.
 * @returns {{ id: string, createdAt: string }}
 */
export async function createSession() {
  log('createSession');

  const res = await fetch(`${BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Create session failed: ${res.status}`);
  }

  const data = await res.json();
  log('createSession → response', data);
  return data;
}

/**
 * Get an existing session by ID.
 * @param {string} id
 * @returns {{ id: string, imageUrl: string, appliedLooks: Array, createdAt: string }}
 */
export async function getSession(id) {
  log('getSession', id);

  const res = await fetch(`${BASE_URL}/api/sessions/${id}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Get session failed: ${res.status}`);
  }

  const data = await res.json();
  log('getSession → response', data);
  return data;
}

export default { createSession, getSession };
