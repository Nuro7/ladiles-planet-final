const { randomUUID } = require('node:crypto');
const media = require('./studioMediaService');
const entries = new Map();
async function stage(file) {
  const sourceVideoPath = await media.saveUpload(file, 'custom-source');
  const diagnostic = await media.run(['-i', sourceVideoPath, '-frames:v', '1', '-f', 'null', '-']);
  const time = diagnostic.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = time && Number(time[1]) * 3600 + Number(time?.[2]) * 60 + Number(time?.[3]);
  if (!duration || duration > 30) throw new Error('Choose a reference video up to 30 seconds long.');
  const aspectRatio = await media.referenceAspectRatio(sourceVideoPath);
  const id = randomUUID(), expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  entries.set(id, { sourceVideoPath, duration, aspectRatio, expiresAt });
  return { id, name: file.originalname, duration, aspectRatio, expiresAt };
}
function get(id) {
  const entry = entries.get(id);
  if (!entry || entry.expiresAt < Date.now()) throw new Error('Upload the reference video again before requesting a quote.');
  return entry;
}
module.exports = { stage, get };
