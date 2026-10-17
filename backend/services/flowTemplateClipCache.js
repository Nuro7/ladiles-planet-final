const path = require('node:path');
const { readFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const { createStore } = require('../utils/studioStore');
const flow = require('./googleFlowMcpService');

const store = createStore(path.join(__dirname, '..', 'data', 'flow-template-clips.json'), { clips: {} });
const pending = new Map();

async function resolve(sourcePath) {
  if (!sourcePath) return null;
  const projectUrl = await flow.currentProject();
  const bytes = await readFile(sourcePath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const key = createHash('sha256').update(projectUrl + '\n' + digest).digest('hex');
  const saved = (await store.read()).clips[key];
  if (saved?.name && saved.projectUrl === projectUrl && saved.digest === digest) return saved;
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    const names = await flow.importAssets([{ originalname: `lp-template-${digest.slice(0, 16)}.mp4`, buffer: bytes }], projectUrl);
    if (names?.length !== 1 || !names[0]) throw new Error('Flow did not confirm the saved template clip.');
    const entry = { name: names[0], projectUrl, digest, sourcePath };
    await store.update(value => { value.clips[key] = entry; return value; });
    return entry;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

module.exports = { resolve };
