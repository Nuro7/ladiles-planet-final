const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../services/studioVideoConfig');
const templates = require('../services/studioTemplateService');
const { prepareDatabaseJewellery } = require('../services/studioVideoService');

const expected = [
  ['PREMIUM_WAN_01', 25, '9:16'],
  ['PREMIUM_WAN_02', 26, '16:9'],
  ['PREMIUM_WAN_03', 27, '9:16'],
  ['PREMIUM_WAN_04', 28, '9:16'],
  ['PREMIUM_WAN_05', 29, '9:16'],
  ['PREMIUM_WAN_06', 30, '16:9'],
];

test('Premium Wan 25-30 are available only in Premium Balance with exact references', async () => {
  const cards = config.premiumBalanceScenes.filter(scene => scene.subjects.solo?.templateId?.startsWith('PREMIUM_WAN_'));
  assert.equal(cards.length, 6);
  assert.deepEqual(cards.map(scene => [scene.subjects.solo.templateId, scene.subjects.solo.templateNumber, scene.subjects.solo.aspectRatio]), expected);
  for (const scene of cards) {
    assert.equal(scene.subjects.solo.available, true);
    assert.equal(scene.subjects.solo.duration, 15);
    assert.equal(scene.subjects.solo.verbatimPrompt, true);
    assert.equal(scene.subjects.solo.jewelleryMode, 'database-or-minimal');
    assert.equal((scene.subjects.solo.prompt.match(/\{\{JEWELLERY_BLOCK\}\}/g) || []).length, 1);
    assert.ok(require('node:fs').existsSync(scene.subjects.solo.sourceVideoPath));
    assert.ok(require('node:fs').existsSync(scene.subjects.solo.musicPath));
    assert.equal(config.premiumSpeedScenes.some(item => item.id === scene.id), false);
    assert.equal(config.budgetScenes.some(item => item.id === scene.id), false);
    assert.equal(config.budgetSpeedScenes.some(item => item.id === scene.id), false);
  }
});

test('Premium Wan prompts preserve verbatim text and both jewellery routes stay within 5,000 characters', async () => {
  for (const scene of config.premiumBalanceScenes.filter(item => item.subjects.solo?.templateId?.startsWith('PREMIUM_WAN_'))) {
    const options = await templates.resolve({
      tier:'premium', generationMode:'balance', workflow:'preset', scene:scene.id,
      subjectMode:'solo', model:'wan3_0_prime', resolution:'720p', outputType:'video',
    });
    assert.equal(options.prompt, scene.subjects.solo.prompt);
    const minimal = prepareDatabaseJewellery(options, []);
    assert.doesNotMatch(minimal.options.prompt, /\{\{JEWELLERY_BLOCK\}\}/);
    assert.match(minimal.options.prompt, /No jewellery reference is attached/);
    assert.ok(minimal.options.prompt.length <= 5000);
    assert.equal(minimal.references.some(ref => ref.role === 'jewellery'), false);

    const found = prepareDatabaseJewellery(options, [
      { role:'bride', url:'https://example.invalid/bride.jpg' },
      { role:'jewellery', url:'https://example.invalid/jewellery.jpg' },
      { role:'dress front', url:'https://example.invalid/dress.jpg' },
    ]);
    assert.match(found.options.prompt, /The LAST image is the JEWELLERY reference/);
    assert.ok(found.options.prompt.length <= 5000);
    assert.equal(found.references.at(-1).role, 'jewellery');
  }
});
