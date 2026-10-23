import { supabase } from '../utils/supabase';
const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export async function studioRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}), ...(session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {}) };
  const response = await fetch(API + path, { credentials: 'include', ...options, headers });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error('The server could not be reached. Try again.'); }
  if (!response.ok || body.success === false) throw new Error(body.error || 'Request failed.');
  return body.data;
}
function form(values, files = {}) {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) if (value !== undefined && value !== null) data.append(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
  for (const [name, value] of Object.entries(files)) {
    for (const file of Array.isArray(value) ? value : value ? [value] : []) data.append(name, file);
  }
  return data;
}
const request = (path, options) => studioRequest('/videos/studio/' + path, options);
export const getStudioConfig = () => request('config');
export const getStudioCreditQuote = values => request('quote', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(values) });
export const uploadCustomReference = file => request('custom-reference', { method:'POST', body:form({}, {sourceVideo:file}) });
export const startStudioExperience = (values, files) => request('experiences', { method: 'POST', body: form(values, files) });
export const getStudioExperience = id => request('experiences/' + encodeURIComponent(id));
export const getStudioHistory = () => request('experiences');
export const approveStudioImage = id => request('experiences/' + encodeURIComponent(id) + '/approve-image', { method: 'POST' });
export const regenerateStudioImage = id => request('experiences/' + encodeURIComponent(id) + '/regenerate-image', { method: 'POST' });
export const retryStudioVideo = id => request('experiences/' + encodeURIComponent(id) + '/retry-video', { method: 'POST' });
export const upscaleStudioVideo = id => request('experiences/' + encodeURIComponent(id) + '/upscale', { method:'POST' });
export const generateStudioVideo = (values, files) => request('generate', { method: 'POST', body: form(values, files) });
export const getStudioTemplates = (tier = 'shared') => request('templates?tier=' + encodeURIComponent(tier));
export const updateStudioTemplate = (scene, subject, values, files, tier = 'shared') => request('templates/' + encodeURIComponent(scene) + '/' + subject + '?tier=' + encodeURIComponent(tier), { method: 'PUT', body: form(values, files) });
export const updateStudioDefaults = values => request('defaults', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
export const getStudioConnections = refresh => request('connections' + (refresh ? '?refresh=true' : ''));
export const getDressGallery = () => studioRequest('/dresses?isDeleted=false');
export const getRecentDresses = () => studioRequest('/dresses/recent');
export const getSavedBrides = () => studioRequest('/brides');
export const uploadSavedBride = (name, image) => studioRequest('/brides/upload', { method: 'POST', body: form({ name, status: 'active', imageType: 'identity', angles: ['front'] }, { images: image }) });
export const retryDressSync = key => studioRequest('/dresses/sync/' + encodeURIComponent(key), { method:'POST' });
export const saveRecentDress = (key,name,category) => studioRequest('/dresses/recent/' + encodeURIComponent(key), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,category})});
export const uploadGalleryDress = (values, images) => studioRequest('/dresses/upload', { method: 'POST', body: form(values, { images }) });
export const addDressPhotos = (id, values, images) => studioRequest('/dresses/' + encodeURIComponent(id) + '/images', { method: 'POST', body: form(values, { images }) });
export const updateDressViews = (id, values) => studioRequest('/dresses/' + encodeURIComponent(id) + '/views', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
