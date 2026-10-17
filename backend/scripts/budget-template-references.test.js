const assert = require('node:assert/strict');
const { test } = require('node:test');
const { existsSync } = require('node:fs');
const mediaPath = require.resolve('../services/studioMediaService');
const flowPath = require.resolve('../services/googleFlowMcpService');
const storagePath = require.resolve('../services/storageService');
const sessionsPath = require.resolve('../services/sessionService');
const calls = [];
require.cache[storagePath] = { id: storagePath, filename: storagePath, loaded: true, exports: {} };
require.cache[sessionsPath] = { id: sessionsPath, filename: sessionsPath, loaded: true, exports: {} };
// No account connection, downloads or generation credits are used in this test.
require.cache[mediaPath] = { id: mediaPath, filename: mediaPath, loaded: true, exports: {
  remoteImage: async (url, name) => { calls.push({ url, name }); return { url, name }; },
  contactSheet: async (urls, label) => ({ urls, label }),
} };
let submission;
const stop = new Error('Stop before paid generation');
require.cache[flowPath] = { id: flowPath, filename: flowPath, loaded: true, exports: {
  generate: async (options, files) => { submission = { options, files }; throw stop; },
} };
const config = require('../services/studioVideoConfig');
const video = require('../services/studioVideoService');
const refs = [{ role: 'bride', url: 'test:bride' }, { role: 'dress front', url: 'test:dress-front' }];

test('template #1 resolves the detailed prompt and its source media', () => {
  const options = config.resolve({ tier: 'budget', generationMode: 'balance', scene: 'indoor', subjectMode: 'solo' });
  assert.equal(options.templateVersion, 6);
  assert.equal(options.duration, 10);
  assert.equal(options.resolution, '1080p');
  assert.equal(options.aspectRatio, '9:16');
  assert.ok(options.prompt.length > 2000 && options.prompt.length < 4000);
  assert.ok(existsSync(options.sourceVideoPath));
  assert.ok(existsSync(options.musicPath));
  assert.match(options.prompt, /IDENTITY REPLACEMENT/);
  assert.match(options.prompt, /EXACT SELECTED-DRESS REPLACEMENT/);
  assert.match(options.prompt, /Keep the reference video's existing music/);
  assert.match(options.prompt, /Return the video with audio/);
  assert.equal(options.sound, true);
  for (const section of ['SHOT-BY-SHOT EFFECTS TIMELINE', 'MASTER EFFECTS INVENTORY', 'EFFECTS DENSITY MAP', 'ENERGY ARC']) assert.ok(options.prompt.includes(section));
});
test('Standard approved-image source edit still attaches original bride and dress', async () => {
  calls.length = 0;
  const options = config.resolve({ tier: 'budget', generationMode: 'balance', scene: 'indoor', subjectMode: 'solo' });
  await assert.rejects(video.render('dry-run', options, { references: refs, firstFrameUrl: 'test:approved' }), error => error === stop);
  assert.deepEqual(submission.files.map(file => file.url), ['test:bride', 'test:dress-front']);
  assert.equal(submission.options.sourceVideoPath, options.sourceVideoPath);
  assert.equal(submission.options.firstFrame, undefined);
  assert.match(submission.options.prompt, /Image 1: BRIDE_IDENTITY/);
  assert.match(submission.options.prompt, /Image 2: DRESS_REFERENCE/);
  assert.match(submission.options.prompt, /Attached video: SOURCE_VIDEO/);
  assert.doesNotMatch(submission.options.prompt, /approved bridal look/);
  assert.ok(submission.options.prompt.length <= 10000);
});
test('multi-angle garment views occupy one ingredient slot', async () => {
  const bundle = await video.budgetFiles({ sourceVideoPath: 'source.mp4' }, [...refs, { role: 'dress back', url: 'test:dress-back' }], 'test:approved');
  assert.equal(bundle.files.length, 2);
  assert.deepEqual(bundle.files[1].urls, ['test:dress-front', 'test:dress-back']);
});
test('non-source approved-image workflow retains original bride and dress', async () => {
  const bundle = await video.budgetFiles({}, refs, 'test:approved');
  assert.equal(bundle.firstFrame.url, 'test:approved');
  assert.deepEqual(bundle.files.map(file => file.url), ['test:bride', 'test:dress-front']);
});
