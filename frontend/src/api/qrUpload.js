/**
 * qrUpload.js — cross-device "scan to upload" pipe.
 *
 * The showroom desktop mints a short session id and shows a QR that points at
 * /m/upload/<id>. The customer's phone opens that page and drops a photo into
 * Supabase Storage at a deterministic path. The desktop polls the object's
 * public URL until it appears, then hands the photo to the studio.
 *
 * Backend requirement (one-time): a **public** Storage bucket named `qr-uploads`
 * with an anon INSERT policy so phones can upload. See README note in the PR.
 */
import { supabase } from '../utils/supabase';

export const QR_BUCKET = 'qr-uploads';

const objectPath = (sessionId) => `${sessionId}/photo.jpg`;

/** Short, URL-safe id — kept small so the QR stays low-density and easy to scan. */
export function newSessionId() {
  const raw = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return raw.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase();
}

/** The page the QR encodes — same SPA, phone-optimised route. */
export function mobileUploadUrl(sessionId) {
  return `${window.location.origin}/m/upload/${sessionId}`;
}

/** Public URL of the (eventual) uploaded object. */
export function publicPhotoUrl(sessionId) {
  return supabase.storage.from(QR_BUCKET).getPublicUrl(objectPath(sessionId)).data.publicUrl;
}

/** Shrink big phone photos before upload so the handoff is near-instant. */
export async function compressImage(file, maxDim = 1600, quality = 0.9) {
  if (!file?.type?.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
}

/** Phone side — upload the chosen photo, return its public URL. */
export async function sendPhoto(sessionId, file) {
  const compressed = await compressImage(file);
  const { error } = await supabase.storage
    .from(QR_BUCKET)
    .upload(objectPath(sessionId), compressed, {
      upsert: true, cacheControl: '0', contentType: 'image/jpeg',
    });
  if (error) throw error;
  return publicPhotoUrl(sessionId);
}

/**
 * Desktop side — poll the public URL until the phone's photo lands.
 * Resolves with a cache-busted URL, or throws AbortError when cancelled.
 */
export async function waitForPhoto(sessionId, { signal, intervalMs = 2500 } = {}) {
  const base = publicPhotoUrl(sessionId);
  while (!signal?.aborted) {
    try {
      const res = await fetch(`${base}?t=${Date.now()}`, { method: 'GET', cache: 'no-store', signal });
      if (res.ok) return `${base}?t=${Date.now()}`;
    } catch (err) {
      if (signal?.aborted) throw err; // real cancel — surface it
      // otherwise a transient network blip: fall through and retry
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new DOMException('Scan cancelled', 'AbortError');
}
