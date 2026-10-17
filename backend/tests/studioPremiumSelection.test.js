const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../services/studioVideoConfig');
const base = { tier: 'premium', workflow: 'prompt', prompt: 'A bridal fashion film', duration: 10, resolution: '720p', aspectRatio: '9:16' };
test('Premium preserves each requested supported model', () => {
  for (const model of ['seedance_2_0', 'seedance_2_0_fast', 'seedance_2_0_mini', 'seedance_2_5']) {
    assert.equal(config.resolve({ ...base, model }).model, model);
  }
  assert.equal(config.resolve(base).model, 'seedance_2_5');
});
test('Premium rejects unknown models and unsupported quality', () => {
  assert.throws(() => config.resolve({ ...base, model: 'unknown' }), /supported Premium model/);
  assert.throws(() => config.resolve({ ...base, model: 'seedance_2_0_mini', resolution: '1080p' }), /quality/);
  assert.throws(() => config.resolve({ ...base, resolution: '360p' }), /quality/);
  assert.equal(config.resolve({ ...base, model: 'seedance_2_0_fast', resolution: '480p' }).resolution, '480p');
  assert.equal(config.resolve({ ...base, model: 'seedance_2_5', resolution: '480p' }).resolution, '480p');
  assert.equal(config.resolve({ ...base, model: 'seedance_2_0_mini', resolution: '480p' }).resolution, '480p');
});
