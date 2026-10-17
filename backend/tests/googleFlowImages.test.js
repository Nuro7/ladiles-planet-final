const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const sharp = require('sharp');
let submitted, fixture;
const stubs = {
  '../services/googleFlowMcpService': { generateImage: async (options, files) => { submitted = { options, files }; return { file: fixture, jobId: 'saved-image' }; } },
  '../services/studioMediaService': { remoteImage: async (url, name) => ({ url, name }), contactSheet: async (urls, name) => ({ urls, name }) },
  '../services/storageService': { uploadImage: async (_, key) => ({ publicUrl: 'https://example.test/' + key }) },
};
for (const [name, exports] of Object.entries(stubs)) { const id = require.resolve(name); require.cache[id] = { id, filename: id, loaded: true, exports }; }
const images = require('../services/googleFlowImageService');
test('Solo image uses Google MCP, original bride and dress, and a distinct image prompt', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lp-google-image-'));
  fixture = path.join(dir, 'result.png');
  await writeFile(fixture, await sharp({ create: { width: 4, height: 6, channels: 3, background: 'red' } }).png().toBuffer());
  const result = await images.generateImage({ sessionId: 'solo', brideImageUrl: 'test:bride', dressImageUrl: 'test:dress', prompt: 'Full-length editorial photograph.' });
  assert.equal(result.provider, 'google-flow-mcp');
  assert.equal(result.resolution, '4x6');
  assert.deepEqual(submitted.files.map(file => file.url), ['test:bride', 'test:dress']);
  assert.match(submitted.options.prompt, /Full-length editorial photograph/);
  assert.match(submitted.options.prompt, /Image 1: BRIDE_IDENTITY: original bride identity/);
});
test('Couple and multi-angle dress occupy two slots, with correctly numbered roles', async () => {
  await images.generateImage({ sessionId: 'couple', prompt: 'Couple in a garden.', references: [
    { role: 'bride', url: 'test:bride' }, { role: 'groom', url: 'test:groom' },
    { role: 'dress front', url: 'test:front' }, { role: 'dress back', url: 'test:back' },
    { role: 'scene style only', url: 'test:setting' },
  ] });
  assert.equal(submitted.files.length, 3);
  assert.deepEqual(submitted.files[0].urls, ['test:bride', 'test:groom']);
  assert.deepEqual(submitted.files[1].urls, ['test:front', 'test:back']);
  assert.match(submitted.options.prompt, /bride first, groom second/);
  assert.match(submitted.options.prompt, /Image 3: ENVIRONMENT_REFERENCE: setting and light only/);
});
test('Local face-free environment is attached without fetching its preview URL', async () => {
  await images.generateImage({ sessionId: 'venue', prompt: 'Solo bridal entrance.',
    brideImageUrl: 'test:bride', dressImageUrl: 'test:dress', referenceImagePath: fixture });
  assert.equal(submitted.files.length, 3);
  assert.equal(submitted.files[2].originalname, 'environment-reference.png');
  assert.ok(submitted.files[2].buffer.length);
  assert.match(submitted.options.prompt, /Image 3: ENVIRONMENT_REFERENCE/);
});
