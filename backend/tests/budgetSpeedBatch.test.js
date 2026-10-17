const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
for (const name of ['storageService', 'sessionService', 'googleFlowMcpService']) {
  const id = require.resolve('../services/' + name);
  require.cache[id] = { id, filename: id, loaded: true, exports: {} };
}
const mediaId = require.resolve('../services/studioMediaService');
require.cache[mediaId] = { id: mediaId, filename: mediaId, loaded: true, exports: {
  remoteImage: async (url, name) => ({ originalname: name + '.jpg', buffer: Buffer.from(url) }),
  contactSheet: async (urls, name) => ({ originalname: name + '.jpg', buffer: Buffer.from(urls.join(',')) }),
} };
const config = require('../services/studioVideoConfig');
const video = require('../services/studioVideoService');
const batch = config.budgetSpeedScenes.filter(scene => scene.subjects.couple?.templateNumber >= 4 && scene.subjects.couple?.templateNumber <= 7);

test('Four Speed stories retain source format, complete media and silent music workflow', () => {
  assert.equal(batch.length, 4);
  for (const scene of batch) {
    const recipe = scene.subjects.couple;
    const options = config.resolve({ tier: 'budget', generationMode: 'speed', scene: scene.id, subjectMode: 'couple' });
    assert.equal(options.duration, 10);
    assert.equal(options.aspectRatio, recipe.aspectRatio);
    assert.equal(options.sound, false);
    assert.equal(options.sourceVideoPath, null);
    assert.ok(options.prompt.split('\n').length >= 100);
    assert.equal(options.referenceImageDescriptions.length, options.referenceImagePaths.length);
    for (const file of [...options.referenceImagePaths, options.musicPath, recipe.thumbnailPath]) assert.ok(fs.statSync(file).size > 0);
    assert.equal(scene.subjects.solo.available, false);
  }
  assert.deepEqual(batch.map(scene => scene.subjects.couple.aspectRatio), ['9:16', '9:16', '9:16', '16:9']);
});

test('Each new story attaches identities, real full-front garment and every scene reference within seven slots', async () => {
  for (const scene of batch) {
    const options = config.resolve({ tier: 'budget', generationMode: 'speed', scene: scene.id, subjectMode: 'couple' });
    for (const views of [1, 8]) {
      const angles = ['front', 'detail', 'side', 'back', 'dupatta', 'blouse', 'full', 'other'];
      const refs = [{ role: 'bride', url: 'test:bride' }, { role: 'groom', url: 'test:groom' }, ...angles.slice(0, views).map(angle => ({ role: 'dress ' + angle, url: 'test:' + angle }))];
      const bundle = await video.budgetFiles(options, refs);
      assert.ok(bundle.files.length <= 7);
      assert.equal(bundle.roles.length, bundle.files.length);
      assert.equal(bundle.files[0].identityReference, true);
      assert.match(bundle.roles[0], /reference 1 is the bride, reference 2 is her groom/);
      assert.ok(bundle.roles.some(role => /full front|actual selected dress photograph/.test(role)));
      assert.deepEqual(bundle.roles.filter(role => role.startsWith('SCENE_REFERENCE')), options.referenceImageDescriptions.map(role => role + '; never source identity or outfit, never render sheet panels or source text'));
      assert.equal(bundle.sourcePath, null);
    }
  }
});
