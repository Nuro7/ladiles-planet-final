const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const projectUrl = 'https://flow.google.com/project/test-project';
let assets = [{ name: 'Editorial #1', kind: 'video' }, { name: 'Editorial #10', kind: 'video' }];
let currentUrl = projectUrl;
const uploads = [];
let submitted;
const axiosId = require.resolve('axios');
require.cache[axiosId] = { id: axiosId, filename: axiosId, loaded: true, exports: {
  get: async url => {
    assert.ok(url.endsWith('/api/health'), 'No remote video download should happen.');
    return { data: { name: 'flow-mcp' } };
  },
  post: async (url, body) => {
    if (url.endsWith('/api/status')) return { data: { flow: { signedIn: true, inProject: true, url: currentUrl } } };
    if (url.endsWith('/api/assets')) return { data: assets };
    if (url.includes('/api/upload?')) { uploads.push(url); return { data: { path: '/uploaded/photo-' + uploads.length + '.jpg' } }; }
    if (url.endsWith('/api/generate')) { submitted = body; return { data: { jobs: [{ id: 'test-job' }] } }; }
    if (url.endsWith('/api/wait')) return { data: { jobs: [{ id: 'test-job', status: 'done', files: ['/test/result.mp4'] }] } };
    throw new Error('Unexpected request: ' + url);
  },
} };
const flow = require('../services/googleFlowMcpService');

test('Budget reuses the exact saved clip without uploading or downloading its video file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lp-flow-reuse-'));
  process.env.FLOW_MCP_HOME = dir;
  await writeFile(path.join(dir, 'token'), 'offline-test-token');
  const options = { sourceVideoAsset: 'Editorial #1', flowProjectUrl: projectUrl,
    sourceVideoPath: '/missing/source.mp4', sourceVideoUrl: 'https://must-not-fetch.example/source.mp4',
    prompt: 'Offline test', duration: 10, aspectRatio: '9:16', sound: true };
  const result = await flow.generate(options, [
    { originalname: 'bride.jpg', buffer: Buffer.from('test') },
    { originalname: 'dress.jpg', buffer: Buffer.from('test') },
  ]);
  assert.equal(result.jobId, 'test-job');
  assert.equal(uploads.length, 2);
  assert.equal(submitted.scenes[0].reference_images[2], 'asset:Editorial #1');
  assert.equal(submitted.scenes[0].generate_audio, true);
  assert.equal(submitted.scenes[0].reference_project_url, projectUrl);
  currentUrl = 'https://flow.google.com/project/wrong-project';
  await assert.rejects(flow.verifyVideoAsset('Editorial #1', projectUrl), /another Flow project/);
  currentUrl = projectUrl;
  await assert.rejects(flow.verifyVideoAsset('Editorial', projectUrl), /exactly one/);
  assets.push({ name: 'Editorial #1', kind: 'video' });
  await assert.rejects(flow.verifyVideoAsset('Editorial #1', projectUrl), /exactly one/);
});
