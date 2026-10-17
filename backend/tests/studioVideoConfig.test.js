const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const config = require('../services/studioVideoConfig');
test('preset API enforces tier quality and duration even if the browser overrides them', () => {
  for (const [tier, resolution] of [['budget', '1080p'], ['premium', '720p']]) {
    const result = config.resolve({ tier, scene: 'outdoor', duration: 30, resolution: '480p', aspectRatio: '9:16' });
    assert.equal(result.resolution, resolution);
    assert.equal(result.duration, 8);
    assert.equal(result.aspectRatio, '16:9');
    assert.match(result.prompt, /garden/);
  }
});
test('direct prompt mode respects customization supported by the selected provider', () => {
  const result = config.resolve({ tier: 'premium', workflow: 'prompt', prompt: 'A bridal garden scene', duration: 15, resolution: '1080p', aspectRatio: '9:16', sound: 'false' });
  assert.equal(result.duration, 15);
  assert.equal(result.sound, false);
  assert.equal(result.aspectRatio, '9:16');
});
test('unsupported settings and unknown scenes fail before spending provider credits', () => {
  const base = { tier: 'budget', workflow: 'prompt', prompt: 'A bridal film', duration: 8, resolution: '1080p', aspectRatio: '16:9' };
  assert.equal(config.resolve(base).resolution, '1080p');
  assert.throws(() => config.resolve({ ...base, resolution: '720p' }), /quality/);
  assert.throws(() => config.resolve({ ...base, resolution: '4k' }), /quality/);
  assert.throws(() => config.resolve({ ...base, duration: 30 }), /duration/);
  assert.throws(() => config.resolve({ ...base, tier: 'unknown' }), /tier/);
  assert.throws(() => config.resolve({ tier: 'premium', scene: 'unknown' }), /scene/);
  assert.throws(() => config.resolve({ ...base, prompt: '' }), /prompt/);
});
test('at least ten presets each supply a unique scene and prompt', () => {
  assert.ok(config.scenes.length >= 10);
  assert.equal(new Set(config.scenes.map(s => s.id)).size, config.scenes.length);
  assert.ok(config.scenes.every(s => s.prompt.length > 50));
});
test('owner-approved Palace Couture Reveal uses the exact supplied Budget Balance prompt', () => {
  const result = config.resolve({ tier: 'budget', generationMode: 'balance', workflow: 'preset', scene: 'palace-crimson-reveal', subjectMode: 'solo' });
  const saved = readFileSync(path.join(__dirname, '..', 'assets', 'budget-speed-batch-10', 'prompt.txt'), 'utf8').trim();
  assert.ok(result.prompt.startsWith(saved));
  assert.equal(result.prompt.match(/BRIDAL ORNAMENTS REFERENCE — JEWELLERY AUTHORITY/g)?.length, 1);
  assert.equal(result.verbatimPrompt, true);
  assert.equal(result.templateVersion, 2);
  assert.equal(result.aspectRatio, '9:16');
  assert.ok(result.sourceVideoPath.endsWith(path.join('budget-speed-batch-10', 'reference.mp4')));
  assert.ok(result.musicPath.endsWith(path.join('budget-speed-batch-10', 'music.m4a')));
});
test('owner-approved Garden Veil & Turn uses the exact supplied Budget Balance prompt', () => {
  const result = config.resolve({ tier: 'budget', generationMode: 'balance', workflow: 'preset', scene: 'garden-veil-spin', subjectMode: 'solo' });
  const saved = readFileSync(path.join(__dirname, '..', 'assets', 'budget-speed-batch-12', 'prompt.txt'), 'utf8').trim();
  assert.ok(result.prompt.startsWith(saved));
  assert.equal(result.prompt.match(/BRIDAL ORNAMENTS REFERENCE — JEWELLERY AUTHORITY/g)?.length, 1);
  assert.equal(result.verbatimPrompt, true);
  assert.equal(result.templateVersion, 2);
  assert.equal(result.aspectRatio, '9:16');
  assert.ok(result.sourceVideoPath.endsWith(path.join('budget-speed-batch-12', 'reference.mp4')));
  assert.ok(result.musicPath.endsWith(path.join('budget-speed-batch-12', 'music.m4a')));
});
test('owner-approved Courtyard Breeze Portrait uses the exact supplied Budget Balance prompt', () => {
  const result = config.resolve({ tier: 'budget', generationMode: 'balance', workflow: 'preset', scene: 'courtyard-breeze-portrait', subjectMode: 'solo' });
  const saved = readFileSync(path.join(__dirname, '..', 'assets', 'budget-speed-batch-14', 'prompt.txt'), 'utf8').trim();
  assert.ok(result.prompt.startsWith(saved));
  assert.equal(result.prompt.match(/BRIDAL ORNAMENTS REFERENCE — JEWELLERY AUTHORITY/g)?.length, 1);
  assert.equal(result.verbatimPrompt, true);
  assert.equal(result.templateVersion, 2);
  assert.equal(result.aspectRatio, '9:16');
  assert.ok(result.sourceVideoPath.endsWith(path.join('budget-speed-batch-14', 'reference.mp4')));
  assert.ok(result.musicPath.endsWith(path.join('budget-speed-batch-14', 'music.m4a')));
});
