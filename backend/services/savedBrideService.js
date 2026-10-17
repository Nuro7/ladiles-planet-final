const path = require('node:path');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const brideService = require('./brideService');
const brideRepository = require('../repositories/brideRepository');
const media = require('./studioMediaService');
const storage = require('./storageService');
const { createStore } = require('../utils/studioStore');
const root = process.env.SAVED_BRIDE_ROOT || path.join(__dirname, '../data/saved-brides');
const store = createStore(path.join(root, 'records.json'), {}, { backup: true });
const identityKey = (brideId, imageId) => require('node:crypto').createHash('sha256').update(String(brideId) + ':' + String(imageId)).digest('hex');

async function archive(bride, images, files) {
  await mkdir(root, { recursive: true });
  for (const [index, image] of images.entries()) {
    if (image.image_type !== 'identity' || !files[index]?.buffer) continue;
    const key = identityKey(bride.id, image.id);
    const file = path.join(root, key + '.jpg');
    const original = await require('sharp')(files[index].buffer).rotate().jpeg({ quality: 96 }).toBuffer();
    await writeFile(file, original, { mode: 0o600 });
    await store.update(value => { value[key] = { brideId: bride.id, imageId: image.id, name: bride.name, originalFile: file, updatedAt: new Date().toISOString() }; return value; });
  }
}

async function resolve(brideId, imageId) {
  // The database remains authoritative: deleted or archived profiles cannot
  // be resurrected from a local copy by supplying an old ID.
  const bride = await brideService.getBrideById(brideId);
  if (bride.status === 'archived') throw new Error('This bride is archived. Choose an available bride.');
  const images = await brideRepository.getBrideImages(brideId, { imageType: 'identity' });
  const image = imageId ? images.find(item => item.id === imageId) : images.find(item => item.angle === 'front') || images[0];
  if (!image) throw new Error('The saved bride identity photo is unavailable. Choose another photo.');
  const key = identityKey(bride.id, image.id);
  const file = path.join(root, key + '.jpg');
  let original;
  try { original = await readFile(file); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    original = (await media.remoteImage(await storage.refreshUrl(image.image_url), 'bride-identity')).buffer;
    await mkdir(root, { recursive: true }); await writeFile(file, original, { mode: 0o600 });
  }
  // Stable restored URL and unchanged image bytes enable the worker's
  // content-based asset naming and reuse even after a signed link expires.
  const records = await store.read();
  let url = records[key]?.restoredUrl;
  if (url) {
    try { url = await storage.refreshUrl(url); await require('axios').head(url, { timeout: 5000 }); }
    catch { url = null; }
  }
  if (!url) {
    const uploaded = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME || 'ladies-planet-bucket', 'saved-bride-references/' + key + '.jpg', original, 'image/jpeg');
    url = uploaded.publicUrl;
  }
  url = await storage.refreshUrl(url);
  await store.update(value => { value[key] = { brideId: bride.id, imageId: image.id, name: bride.name, originalFile: file, restoredUrl: url, updatedAt: new Date().toISOString() }; return value; });
  return { brideId: bride.id, imageId: image.id, name: bride.name, url };
}
module.exports = { resolve, archive };
