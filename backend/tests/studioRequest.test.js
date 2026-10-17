const { test } = require('node:test');
const assert = require('node:assert/strict');
for (const name of ['storageService', 'sessionService']) {
  const id = require.resolve('../services/' + name);
  require.cache[id] = { id, filename: id, loaded: true, exports: {} };
}
const { buildRequest } = require('../services/studioVideoService');
const config = require('../services/studioVideoConfig');
const refs = [{ role: 'bride', url: 'https://example.test/bride.jpg' }, { role: 'groom', url: 'https://example.test/groom.jpg' }, { role: 'dress front', url: 'https://example.test/dress.jpg' }];
test('Legacy API request builder remains isolated from the active Premium route', () => {
  const options = config.resolve({ tier: 'premium', scene: 'palace', subjectMode: 'couple' });
  const request = buildRequest(options, refs, 'https://example.test/approved.jpg', 'https://example.test/source.mp4');
  assert.equal(request.endpoint, 'bytedance/seedance-2.0/reference-to-video');
  assert.equal(request.input.resolution, '720p');
  assert.equal(request.input.duration, 8);
  assert.equal(request.input.image_urls[0], 'https://example.test/approved.jpg');
  assert.deepEqual(request.input.video_urls, ['https://example.test/source.mp4']);
  assert.match(request.input.prompt, /Saved scene instructions/);
  assert.match(request.input.prompt, /distinct identities/);
  assert.equal(refs.length, 3);
});
test('Flagship cannot be selected for new jobs', () => {
  assert.throws(() => config.resolve({ tier: 'flagship', scene: 'indoor' }), /tier/);
});
test('Custom text-only video uses text-to-video and supported custom settings', () => {
  const options = config.resolve({ tier: 'premium', workflow: 'prompt', prompt: 'Sunlight across a beautiful garden', duration: 15, resolution: '1080p', aspectRatio: '9:16' });
  const request = buildRequest(options, [], null, null);
  assert.equal(request.endpoint, 'bytedance/seedance-2.0/text-to-video');
  assert.equal(request.input.duration, 15);
  assert.equal(request.input.aspect_ratio, '9:16');
});
test('Fixed music disables generated audio', () => {
  const options = { ...config.resolve({ tier: 'premium', scene: 'indoor' }), musicPath: 'saved.wav' };
  assert.equal(buildRequest(options, refs).input.generate_audio, false);
});
test('Every scene has separate identity-aware solo and couple recipes', () => {
  for (const scene of config.scenes) {
    assert.notEqual(scene.subjects.solo.prompt, scene.subjects.couple.prompt);
    assert.match(scene.subjects.couple.imagePrompt, /distinct face/);
    assert.match(scene.subjects.solo.imagePrompt, /No groom/);
  }
});
