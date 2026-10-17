const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

async function waitFor(check) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error('Timed out waiting for job state.');
}

let images = 0;
const imageCalls = [];
const videoCalls = [];
const services = {
  '../services/dressService': { getDressById: async id => ({ id, name: 'Blue lehenga', isAvailable: true, imageUrl: 'https://assets.example/front.jpg', images: ['front', 'back', 'side', 'full', 'detail'].map(angle => ({ url: 'https://assets.example/' + angle + '.jpg', angle })) }) },
  '../services/dressFlowSyncService': {enqueue:async()=>({key:'test-cache',status:'ready'})},
  '../services/storageService': { uploadImage: async (_, name) => ({ publicUrl: `https://assets.example/${name}` }) },
  '../services/googleFlowImageService': { generateImage: async input => { imageCalls.push(input); return { imageUrl: `https://assets.example/result-${++images}.jpg` }; } },
  '../services/studioVideoService': { credentials: () => 'configured', localResults: new Map(), render: async (id, options, input) => { videoCalls.push({ id, options, input }); await new Promise(resolve => setTimeout(resolve, 35)); return `https://assets.example/${id}.mp4`; } },
  '../services/googleFlowMcpService': { ready: async () => true, status: async () => ({ ready: true }) },
};
for (const [name, exports] of Object.entries(services)) {
  const id = require.resolve(name);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

test('Standard waits for approval and uses the approved image as the film reference', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lp-studio-test-'));
  process.env.STUDIO_EXPERIENCE_STORE = path.join(dir, 'jobs.json');
  process.env.STUDIO_TEMPLATE_STORE = path.join(dir, 'templates.json');
  const experience = require('../services/studioExperienceService');
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const files = {
    brideImage: [{ mimetype: 'image/jpeg', buffer: pixel }],
    dressImage: [{ mimetype: 'image/png', buffer: pixel }],
  };
  const standard = await experience.start({ tier: 'budget', scene: 'outdoor', mode: 'standard' }, files);
  const ready = await waitFor(async () => {
    const current = await experience.get(standard.id);
    return current.image.status === 'ready' ? current : null;
  });
  assert.equal(ready.image.status, 'ready');
  assert.equal(ready.video.status, 'awaiting_approval');
  assert.ok(ready.image.startedAt);
  assert.equal(ready.image.elapsedMs, Date.parse(ready.image.finishedAt) - Date.parse(ready.image.startedAt));
  assert.equal(ready.video.startedAt, undefined);
  assert.equal(ready.finishedAt, undefined, 'Approval wait is not a completed creation.');
  assert.ok(ready.serverNow);
  assert.equal(videoCalls.length, 0);
  assert.equal(ready.assets, undefined);
  await experience.approve(standard.id);
  await waitFor(async () => (await experience.get(standard.id)).video.status === 'ready');
  assert.equal(videoCalls[0].input.firstFrameUrl, ready.image.url);
  let saved;
  for (let attempt = 0; attempt < 150; attempt++) {
    saved = JSON.parse(await readFile(process.env.STUDIO_EXPERIENCE_STORE, 'utf8'));
    if (saved[0].video.status === 'ready') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(saved[0].video.status, 'ready');
  assert.equal(saved[0].video.elapsedMs, Date.parse(saved[0].video.finishedAt) - Date.parse(saved[0].video.startedAt));
  assert.ok(saved[0].video.elapsedMs >= 35, 'The timer must include final processing before the renderer returns.');
  assert.equal(saved[0].elapsedMs, Date.parse(saved[0].finishedAt) - Date.parse(saved[0].startedAt));
  assert.equal(saved[0].serverNow, undefined, 'Response clock must not be persisted.');

  const vip = await experience.start({ tier: 'budget', scene: 'indoor', mode: 'vip' }, files);
  const parallel = await waitFor(async () => {
    const current = await experience.get(vip.id);
    return current.image.status === 'ready' && current.video.status === 'ready' ? current : null;
  });
  assert.equal(parallel.image.status, 'ready');
  assert.equal(parallel.video.status, 'ready');
  assert.deepEqual(videoCalls[1].input.imageUrls, [saved[0].assets.brideUrl.replace(standard.id, vip.id), saved[0].assets.dressUrl.replace(standard.id, vip.id), '/api/videos/studio/template-environment/BUDGET_SPEED_01']);
  assert.equal(videoCalls[1].options.templateId, 'BUDGET_SPEED_01');
  assert.equal(videoCalls[1].input.firstFrameUrl, null);

  await assert.rejects(experience.start({ tier: 'budget', scene: 'mandap', subjectMode: 'couple' }, files), /bride and the groom/);
  const couple = await experience.start({ tier: 'budget', scene: 'mandap', mode: 'vip', subjectMode: 'couple', dressId: 'blue' }, { brideImage: files.brideImage, groomImage: files.brideImage });
  await waitFor(async () => (await experience.get(couple.id)).video.status === 'ready');
  const coupleCall = videoCalls.find(call => call.id === couple.id);
  assert.deepEqual(coupleCall.input.references.map(ref => ref.role), ['bride', 'groom', 'dress front', 'dress back', 'dress side', 'dress full', 'dress detail']);
  assert.match(coupleCall.options.prompt, /groom/);
  const photoOnly = await experience.start({ tier: 'budget', scene: 'indoor', mode: 'standard', outputType: 'image' }, files);
  await waitFor(async () => (await experience.get(photoOnly.id)).image.status === 'ready');
  assert.equal((await experience.get(photoOnly.id)).video.status, 'skipped');
  await assert.rejects(experience.approve(photoOnly.id), /approve/);
  const imageCount = images;
  const videoOnly = await experience.start({ tier: 'budget', scene: 'indoor', mode: 'standard', outputType: 'video' }, files);
  await waitFor(async () => (await experience.get(videoOnly.id)).video.status === 'ready');
  assert.equal((await experience.get(videoOnly.id)).image.status, 'skipped');
  assert.equal(images, imageCount, 'Video only must not call image generation.');
  assert.equal(videoCalls.find(call => call.id === videoOnly.id).input.firstFrameUrl, null);
  const preview=await experience.get(videoOnly.id);
  assert.equal(preview.video.isPreview,true);
  assert.equal(preview.video.quality,'720p');
  let finishUpscale;
  services['../services/studioVideoService'].upscale=async id=>{
    await new Promise(resolve=>{finishUpscale=resolve;});
    services['../services/studioVideoService'].localResults.set(id,'test-final.mp4');
    return '/api/videos/studio/media/'+id+'?version=1080p';
  };
  await experience.upscaleVideo(videoOnly.id);
  const scaling=await experience.get(videoOnly.id);
  assert.equal(scaling.video.status,'ready');
  assert.equal(scaling.video.url,preview.video.url,'Preview remains playable');
  await assert.rejects(experience.upscaleVideo(videoOnly.id),/already started/);
  finishUpscale();
  const final=await waitFor(async()=>{const value=await experience.get(videoOnly.id);return value.video.upscaleStatus==='done'?value:null;});
  assert.equal(final.video.quality,'1080p');assert.equal(final.video.isPreview,false);
  assert.equal(await experience.localVideoFile(videoOnly.id),'test-final.mp4');
  await assert.rejects(experience.regenerateImage(videoOnly.id), /video-only/);
  const templates = require('../services/studioTemplateService');
  await templates.update('outdoor', 'solo', { imagePrompt: 'IMAGE TEST: Bride in a sunny garden.' }, {}, 'budget');
  await templates.update('palace', 'solo', { prompt: 'VIDEO TEST: Bride walks through a palace.' }, {}, 'budget');
  const separate = await experience.start({ tier: 'budget', scene: 'palace', imageScene: 'outdoor', videoScene: 'palace', mode: 'vip', outputType: 'both' }, files);
  await waitFor(async () => (await experience.get(separate.id)).image.status === 'ready' && (await experience.get(separate.id)).video.status === 'ready');
  assert.match(imageCalls.find(call => call.sessionId === separate.id).prompt, /IMAGE TEST/);
  assert.match(videoCalls.find(call => call.id === separate.id).options.prompt, /VIDEO TEST/);
  assert.equal((await experience.get(separate.id)).imageScene, 'outdoor');
  assert.equal((await experience.get(separate.id)).videoScene, 'palace');
  const custom = await experience.start({ tier: 'budget', mode: 'standard', workflow: 'prompt', prompt: 'A beautiful wedding garden', duration: 10, resolution: '1080p', aspectRatio: '9:16' });
  await waitFor(async () => (await experience.get(custom.id)).video.status === 'ready');
  assert.equal((await experience.get(custom.id)).image.status, 'skipped');
  assert.ok((await experience.list()).length >= 5);
});
