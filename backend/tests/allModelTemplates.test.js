const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const config = require('../services/studioVideoConfig');
const routes = require('../services/studioGenerationRoute');

test('All nineteen distinct templates resolve across four catalogs with the correct reference mode', () => {
  const expected = config.budgetSpeedScenes.map(scene => scene.id).sort();
  assert.equal(expected.length, 19);
  assert.ok(!expected.includes('indoor'));
  assert.equal(expected.filter(id => id === 'sculpted-romance').length, 1);
  for (const [tier, mode, name] of [
    ['budget','speed','budgetSpeedScenes'], ['budget','balance','budgetScenes'],
    ['premium','speed','premiumSpeedScenes'], ['premium','balance','premiumBalanceScenes'],
  ]) {
    assert.deepEqual(config[name].map(scene => scene.id).sort(), expected);
    for (const scene of config[name]) {
      const subject = Object.keys(scene.subjects).find(key => scene.subjects[key].available !== false);
      const options = config.resolve({tier, generationMode:mode, scene:scene.id, subjectMode:subject});
      assert.equal(options.duration, 10);
      assert.equal(options.sound, false);
      const entry = scene.subjects[subject];
      for (const file of [entry.thumbnailPath, options.musicPath]) assert.ok(fs.statSync(file).size > 0);
      if (mode === 'speed') {
        assert.equal(options.sourceVideoPath, null);
        assert.ok(options.referenceImagePaths.length > 0);
        for (const file of options.referenceImagePaths) assert.ok(fs.statSync(file).size > 0);
      } else {
        assert.ok(fs.statSync(options.sourceVideoPath).size > 0);
        assert.deepEqual(options.referenceImagePaths, []);
      }
      if (entry.templateNumber >= 10) assert.equal(subject, 'solo');
    }
  }
});

test('Registering Premium templates does not bypass unverified reference capabilities', () => {
  const route = routes.resolve('premium','balance');
  assert.throws(() => routes.enforce(route, {sourceVideoPath:'reference.mp4'}), /unavailable until Higgsfield/);
});
