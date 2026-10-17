/**
 * bridalApi.js
 * All Axios API calls for AI Bridal Wall
 * ─────────────────────────────────────────
 * Endpoints:
 *   POST /api/try-on          → virtual try-on
 *   GET  /api/dresses         → dress catalog
 *   POST /api/lookbook/save   → save a look
 *   GET  /api/lookbook/:userId → get saved looks
 *   DELETE /api/lookbook/:userId/:lookId → remove look
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — AI try-on can be slow
  headers: { 'Content-Type': 'application/json' },
});

// ── Error normaliser ─────────────────────────────────────────
function normaliseError(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.error)   return err.response.data.error;
  if (err.message)                 return err.message;
  return 'Something went wrong. Please try again.';
}

// ── Virtual Try-On ─────────────────────────────────────────
/**
 * POST /api/try-on
 * @param {{ userImageBase64: string, dressId: string|number }} payload
 * @returns {{ resultImageUrl: string }}
 */
export async function tryOnDress({ userImageBase64, dressId }) {
  try {
    const { data } = await api.post('/api/try-on', { userImageBase64, dressId });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normaliseError(err) };
  }
}

// ── Dresses ───────────────────────────────────────────────
/**
 * GET /api/dresses
 * @param {{ category?: string, style?: string }} filters
 * @returns {{ dresses: Array<{ id, name, style, category, imageUrl }> }}
 */
export async function fetchDresses(filters = {}) {
  try {
    const params = {};
    if (filters.category && filters.category !== 'All') params.category = filters.category;
    if (filters.style    && filters.style    !== 'All') params.style    = filters.style;
    const { data } = await api.get('/api/dresses', { params });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normaliseError(err) };
  }
}

// ── Lookbook ──────────────────────────────────────────────
/**
 * POST /api/lookbook/save
 * @param {{ userId: string, resultImageUrl: string, dressId: string|number }} payload
 * @returns {{ lookId: string }}
 */
export async function saveLook({ userId, resultImageUrl, dressId }) {
  try {
    const { data } = await api.post('/api/lookbook/save', { userId, resultImageUrl, dressId });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normaliseError(err) };
  }
}

/**
 * GET /api/lookbook/:userId
 * @param {string} userId
 * @returns {{ looks: Array<{ id, resultImageUrl, dressId, dressName, savedAt }> }}
 */
export async function fetchLookbook(userId) {
  try {
    const { data } = await api.get(`/api/lookbook/${userId}`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normaliseError(err) };
  }
}

/**
 * DELETE /api/lookbook/:userId/:lookId
 * @param {string} userId
 * @param {string} lookId
 */
export async function removeLook(userId, lookId) {
  try {
    const { data } = await api.delete(`/api/lookbook/${userId}/${lookId}`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normaliseError(err) };
  }
}

export default { tryOnDress, fetchDresses, saveLook, fetchLookbook, removeLook };
