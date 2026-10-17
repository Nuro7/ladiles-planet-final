const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rawFile = path.resolve('test-fixtures', 'raw-flow-1080p.mp4');
const cleanedFile = path.resolve('test-fixtures', 'clean-flow-1080p.mp4');
const mixedFile = path.resolve('test-fixtures', 'finished-1080p.mp4');
const remoteFile = 'https://assets.example/provider-result.mp4';
let calls;
let invalidFiles;
let cleanupError;
let musicError;
let cleanupGate;
let activeId;
let video;
let retainedPreview;
const originalCredentials = process.env.HF_CREDENTIALS;
process.env.HF_CREDENTIALS = 'test-key:test-secret';

function stub(name, exports) {
  const id = path.resolve(__dirname, '..', 'services', name + '.js');
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('storageService', {});
stub('sessionService', {});
stub('studioTemplateService', {});
stub('googleFlowMcpService', {
  upscaleSaved: async id => { calls.push({kind:'savedUpscale',id});return rawFile; },
  generate: async (options) => {
    calls.push({ kind: 'generate', options });
    if (!options.recoverId) await options.onSubmitted?.('saved-flow-job');
    return { file: rawFile };
  },
});
stub('watermarkService', {
  cleanVisibleLogo: async (file, onProgress) => {
    calls.push({ kind: 'cleanup', file, onProgress });
    if(retainedPreview)assert.equal(video.localResults.get(activeId),retainedPreview,'Preview stays available while upscaling');
    else assert.equal(video.localResults.has(activeId), false, 'Raw media must not become available during cleanup');
    if (cleanupGate) await cleanupGate;
    if (cleanupError) throw cleanupError;
    return cleanedFile;
  },
});
stub('studioMediaService', {
  requirePreview720: async file => { calls.push({kind:'previewGate',file}); },
  fullHdOutput: async (file) => {
    calls.push({ kind: 'fullHd', file });
    if (invalidFiles.has(file)) {
      calls.push({ kind: 'upscale', file });
      return path.resolve('test-fixtures', 'upscaled-1080p.mp4');
    }
    return file;
  },
  requireFullHd: async (file) => {
    calls.push({ kind: 'fullHd', file });
    if (invalidFiles.has(file)) throw new Error('The film is below 1080p.');
  },
  finishVideo: async (file, options, id) => {
    calls.push({ kind: 'finish', file, options });
    assert.equal(video.localResults.has(id), false, 'Media must not become available before final processing succeeds');
    if (musicError) throw musicError;
    return options.musicPath ? { file: mixedFile, url: '/api/videos/studio/media/' + id } : { url: file };
  },
});
const axiosId = require.resolve('axios');
require.cache[axiosId] = { id: axiosId, filename: axiosId, loaded: true, exports: {
  create: () => ({ get: async () => ({ data: { status: 'completed', video: { url: remoteFile } } }) }),
} };
video = require('../services/studioVideoService');

function options(tier = 'budget', extra = {}) {
  return { tier, prompt: 'A cat walks slowly across the room.', subjectMode: 'solo', duration: 4, resolution: '1080p', aspectRatio: '16:9', sound: true, ...extra };
}
function verifiedFiles() { return calls.filter(call => call.kind === 'fullHd').map(call => call.file); }

beforeEach(() => {
  calls = [];
  invalidFiles = new Set();
  cleanupError = null;
  musicError = null;
  cleanupGate = null;
  activeId = 'budget-test';
  retainedPreview=null;
  video.localResults.clear();
});
after(() => {
  if (originalCredentials === undefined) delete process.env.HF_CREDENTIALS;
  else process.env.HF_CREDENTIALS = originalCredentials;
});

test('Budget publishes the cleaned 1080p file without exposing its raw result', async () => {
  const onProgress = () => {};
  const url = await video.render(activeId, options(), {}, onProgress);
  assert.equal(url, '/api/videos/studio/media/' + activeId);
  assert.equal(video.localResults.get(activeId), cleanedFile);
  assert.equal(calls.find(call => call.kind === 'cleanup').file, rawFile);
  assert.equal(calls.find(call => call.kind === 'cleanup').onProgress, onProgress);
  assert.equal(calls.find(call => call.kind === 'finish').file, cleanedFile);
  assert.ok(verifiedFiles().includes(rawFile));
  assert.ok(verifiedFiles().includes(cleanedFile));
});

test('Budget preview applies music and publishes before any upscaling',async()=>{
  const url=await video.render(activeId,options('budget',{previewFirst:true,musicPath:'saved-music.m4a'}));
  assert.equal(url,'/api/videos/studio/media/'+activeId+'?version=preview');
  assert.equal(video.localResults.get(activeId),mixedFile);
  assert.equal(calls.some(call=>call.kind==='fullHd'||call.kind==='savedUpscale'),false);
  assert.equal(calls.filter(call=>call.kind==='previewGate').length,2);
});
test('Owner-tested prompt reaches the provider without appended instructions', async () => {
  const prompt = 'PROJECT: VERIFIED\nUse BRIDE_REFERENCE and DRESS_REFERENCE.\nEXECUTE THE TRANSFORMATION.';
  await video.render(activeId, options('budget', {
    prompt, verbatimPrompt: true, generationMode: 'balance', sourceVideoAsset: 'saved-reference',
  }));
  const submitted = calls.find(call => call.kind === 'generate').options;
  assert.equal(submitted.prompt, prompt);
  assert.equal(submitted.verbatimPrompt, true);
  assert.equal(submitted.sourceVideoAsset, 'saved-reference');
});
test('Premium request preparation includes the ornament image as a separate reference', () => {
  const request = video.buildRequest(options('premium', { ornamentReferenceUrl: 'https://assets.example/ornaments.png' }),
    [{ role: 'bride', url: 'https://assets.example/bride.png' }, { role: 'dress front', url: 'https://assets.example/dress.png' }]);
  assert.deepEqual(request.input.image_urls, [
    'https://assets.example/bride.png', 'https://assets.example/dress.png', 'https://assets.example/ornaments.png',
  ]);
});
test('Upscale reuses the saved generation, keeps preview available and publishes verified final',async()=>{
  retainedPreview=cleanedFile;video.localResults.set(activeId,retainedPreview);
  const url=await video.upscale(activeId,options('budget',{musicPath:'saved-music.m4a'}),{provider:{kind:'flow',id:'saved-flow-job'}});
  assert.equal(url,'/api/videos/studio/media/'+activeId+'?version=1080p');
  assert.equal(calls.find(call=>call.kind==='savedUpscale').id,'saved-flow-job');
  assert.equal(calls.some(call=>call.kind==='generate'),false);
  assert.ok(verifiedFiles().includes(mixedFile));
  assert.equal(video.localResults.get(activeId),mixedFile);
});
test('Failed upscale never overwrites the working preview',async()=>{
  retainedPreview=cleanedFile;video.localResults.set(activeId,retainedPreview);
  cleanupError=new Error('Cleanup failed');
  await assert.rejects(video.upscale(activeId,options(),{provider:{kind:'flow',id:'saved-flow-job'}}),/Cleanup failed/);
  assert.equal(video.localResults.get(activeId),retainedPreview);
  assert.equal(calls.some(call=>call.kind==='generate'),false);
});

test('Budget keeps media unavailable while asynchronous cleanup is running', async () => {
  let release;
  cleanupGate = new Promise(resolve => { release = resolve; });
  const pending = video.render(activeId, options());
  for (let attempt = 0; attempt < 200 && !calls.some(call => call.kind === 'cleanup'); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.ok(calls.some(call => call.kind === 'cleanup'), 'Cleanup started');
  assert.equal(video.localResults.has(activeId), false);
  release();
  await pending;
  assert.equal(video.localResults.get(activeId), cleanedFile);
});

test('Budget upscales a 720p raw result before cleanup or publishing', async () => {
  invalidFiles.add(rawFile);
  await video.render(activeId, options());
  assert.equal(calls.some(call => call.kind === 'upscale'), true);
  assert.equal(calls.find(call => call.kind === 'cleanup').file, path.resolve('test-fixtures', 'upscaled-1080p.mp4'));
  assert.equal(video.localResults.get(activeId), cleanedFile);
});

test('Budget rejects a cleaned result that loses its 1080p dimensions', async () => {
  invalidFiles.add(cleanedFile);
  await assert.rejects(video.render(activeId, options()), /below 1080p/);
  assert.equal(calls.some(call => call.kind === 'cleanup'), true);
  assert.equal(calls.some(call => call.kind === 'finish'), false);
  assert.equal(video.localResults.has(activeId), false);
});

test('Budget cleanup failure preserves the submitted job for recovery and never falls back to raw', async () => {
  cleanupError = new Error('Cleanup failed');
  let submitted;
  await assert.rejects(video.render(activeId, options(), { onSubmitted: provider => { submitted = provider; } }), /Cleanup failed/);
  assert.deepEqual(submitted, { kind: 'flow', id: 'saved-flow-job' });
  assert.equal(calls.some(call => call.kind === 'finish'), false);
  assert.equal(video.localResults.has(activeId), false);
});

test('Budget applies selected music to the cleaned result and publishes only the verified final film', async () => {
  const settings = options('budget', { musicPath: 'saved-scene-music.m4a' });
  const url = await video.render(activeId, settings);
  assert.equal(calls.find(call => call.kind === 'finish').file, cleanedFile);
  assert.equal(calls.find(call => call.kind === 'finish').options.musicPath, settings.musicPath);
  assert.ok(verifiedFiles().includes(mixedFile));
  assert.equal(video.localResults.get(activeId), mixedFile);
  assert.equal(url, '/api/videos/studio/media/' + activeId);
});

test('Budget music failure cannot expose a raw or partially finished result', async () => {
  musicError = new Error('Music processing failed');
  await assert.rejects(video.render(activeId, options('budget', { musicPath: 'saved-scene-music.m4a' })), /Music processing failed/);
  assert.equal(video.localResults.has(activeId), false);
});

test('Budget rejects a finished music film that no longer passes the 1080p gate', async () => {
  invalidFiles.add(mixedFile);
  await assert.rejects(video.render(activeId, options('budget', { musicPath: 'saved-scene-music.m4a' })), /below 1080p/);
  assert.equal(video.localResults.has(activeId), false);
});

test('Budget recovery reuses its saved Flow job and reruns cleanup', async () => {
  let submittedAgain = false;
  await video.render(activeId, options(), {
    provider: { kind: 'flow', id: 'existing-flow-job' },
    onSubmitted: () => { submittedAgain = true; },
  });
  assert.equal(calls.find(call => call.kind === 'generate').options.recoverId, 'existing-flow-job');
  assert.equal(submittedAgain, false);
  assert.equal(calls.filter(call => call.kind === 'cleanup').length, 1);
  assert.equal(video.localResults.get(activeId), cleanedFile);
});

test('Premium and Flagship cannot silently recover through the paid API', async () => {
  for (const tier of ['premium', 'flagship']) {
    activeId = tier + '-test';
    await assert.rejects(video.render(activeId, options(tier), { provider: { kind: 'api', id: 'existing-api-job' } }), /Premium MCP|tier is not available/);
    assert.equal(video.localResults.has(activeId), false);
  }
  assert.equal(calls.some(call => call.kind === 'generate'), false);
  assert.equal(calls.some(call => call.kind === 'cleanup'), false);
  assert.equal(calls.some(call => call.kind === 'fullHd'), false);
});
