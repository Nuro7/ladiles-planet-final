const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');

test('saved bride reuses the chosen identity and restores a missing cloud copy from its local original', async () => {
  process.env.SAVED_BRIDE_ROOT = await mkdtemp(path.join(tmpdir(), 'lp-saved-bride-'));
  let downloads = 0, uploads = 0, missing = false, archived = false;
  const mocks = {
    '../services/brideService': { getBrideById: async id => ({ id, name:'Remia', status:archived ? 'archived' : 'active' }) },
    '../repositories/brideRepository': { getBrideImages: async () => [{ id:'identity-1', image_type:'identity', angle:'front', image_url:'https://example.test/original.jpg' }] },
    '../services/studioMediaService': { remoteImage: async () => { downloads++; return { buffer:Buffer.from('original-photo') }; } },
    '../services/storageService': { refreshUrl: async url => url, uploadImage: async () => { uploads++; return { publicUrl:'https://example.test/restored.jpg' }; } },
    axios: { head: async () => { if (missing) throw new Error('Missing object'); } },
  };
  for (const [name, exports] of Object.entries(mocks)) { const id = require.resolve(name); require.cache[id] = { id, filename:id, loaded:true, exports }; }
  const saved = require('../services/savedBrideService');
  const first = await saved.resolve('bride-1', 'identity-1');
  assert.equal(first.name, 'Remia'); assert.equal(downloads, 1); assert.equal(uploads, 1);
  await saved.resolve('bride-1', 'identity-1'); assert.equal(downloads, 1); assert.equal(uploads, 1);
  missing = true; await saved.resolve('bride-1', 'identity-1'); assert.equal(downloads, 1); assert.equal(uploads, 2);
  await assert.rejects(saved.resolve('bride-1', 'another-brides-image'), /identity photo is unavailable/);
  archived = true; await assert.rejects(saved.resolve('bride-1', 'identity-1'), /archived/);
});
