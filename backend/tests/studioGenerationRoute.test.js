const test = require('node:test');
const assert = require('node:assert/strict');
const route = require('../services/studioGenerationRoute');

test('four choices resolve to the intended providers without an API fallback', () => {
  for (const [tier, provider] of [['budget', 'google-flow-mcp'], ['premium', 'higgsfield-mcp']]) {
    for (const mode of ['speed', 'balance']) {
      const selected = route.resolve(tier, mode);
      assert.equal(selected.provider, provider);
      assert.equal(selected.useReferenceVideo, mode === 'balance');
    }
  }
  assert.equal(route.resolve('premium', 'speed').model, 'seedance_2_0');
  assert.throws(() => route.resolve('flagship', 'speed'));
});

test('Speed removes every saved source-video route on the server', () => {
  const options = route.enforce(route.resolve('budget', 'speed'), { sourceVideoUrl: 'https://example.invalid/clip.mp4', sourceVideoPath: 'clip.mp4', sourceVideoAsset: 'stored-clip', useSourceAudio: true });
  assert.equal(options.sourceVideoUrl, null);
  assert.equal(options.sourceVideoPath, null);
  assert.equal(options.sourceVideoAsset, null);
  assert.equal(options.useSourceAudio, false);
});

test('Balance keeps the saved Budget source, but requires one otherwise', () => {
  const selected = route.resolve('budget', 'balance');
  const options = route.enforce(selected, { sourceVideoAsset: 'stored-clip' });
  assert.equal(options.sourceVideoAsset, 'stored-clip');
  assert.throws(() => route.enforce(selected, {}), /reference video/i);
});

test('Premium Balance fails closed while MCP video-reference support is unverified', () => {
  const premium = route.resolve('premium', 'balance');
  assert.throws(() => route.enforce(premium, { sourceVideoUrl: 'https://example.invalid/video.mp4' }), /unavailable/i);
});
