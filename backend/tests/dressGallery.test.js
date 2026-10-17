const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const records = new Map();
const repo = {
  findBySku: async () => null,
  findById: async id => records.get(id),
  create: async value => { records.set(value.id, { ...value, images: value.metadata.images }); return records.get(value.id); },
  update: async (id, change) => { const value = { ...records.get(id), ...change, images: change.metadata?.images || records.get(id).images }; records.set(id, value); return value; },
};
for (const [name, exports] of Object.entries({
  '../services/dressFlowSyncService': {enqueue:async()=>({status:'queued',message:'Waiting to sync to Flow'})},
  '../repositories/dressRepository': repo,
  '../services/storageService': { uploadImage: async (_, key) => ({ publicUrl: 'https://example.test/' + key }), refreshUrl: async url => url },
})) { const id = require.resolve(name); require.cache[id] = { id, filename: id, loaded: true, exports }; }
const gallery = require('../services/dressService');
test('Gallery uploads five angles together, selects cover and preserves all photos on reorder', async () => {
  const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'blue' } }).png().toBuffer();
  const photos = Array.from({ length: 5 }, () => ({ buffer, mimetype: 'image/png' }));
  const dress = await gallery.uploadDress(photos, { name: 'Test blue lehenga', category: 'Lehenga', views: ['detail', 'back', 'side', 'front', 'full'], coverIndex: 3 });
  assert.equal(dress.images.length, 5);
  assert.equal(dress.isAvailable, true);
  assert.equal(dress.images[0].angle, 'detail');
  assert.equal(dress.imageUrl, dress.images[3].url);
  const reordered = await gallery.reorderImages(dress.id, [...dress.images].reverse().map(view => ({ id: view.id, angle: view.angle })), dress.images[0].id);
  assert.equal(reordered.images[0].id, dress.images[4].id);
  assert.equal(reordered.imageUrl, dress.images[0].url);
  await assert.rejects(gallery.reorderImages(dress.id, [dress.images[0]], dress.images[0].id), /every saved photo/);
  await assert.rejects(gallery.addImages(dress.id, photos), /up to 8/);
});
