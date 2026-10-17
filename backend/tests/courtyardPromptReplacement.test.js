const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ quiet: true });
const templates = require('../services/studioTemplateService');
const { withBridalOrnaments } = require('../services/bridalOrnamentsPrompt');
test('Royal Red Garden has a ten-second reference and the exact supplied prompt in both tiers', async () => {
  const expected = fs.readFileSync(path.join(__dirname, '../assets/royal-red-garden/prompt.txt'), 'utf8').trim();
  for (const tier of ['budget', 'shared']) {
    const recipe = await templates.recipe('royal-red-garden-veil-turn', 'solo', tier, 'balance');
    assert.equal(recipe.prompt, expected);
    assert.equal(withBridalOrnaments(recipe.prompt), expected);
    assert.equal(recipe.duration, 10);
    assert.equal(recipe.useSourceAudio, false);
    assert.ok(fs.existsSync(recipe.sourceVideoPath));
  }
});
test('Garden V2 uses the supplied prompt in Quick and Premium without duplicate jewellery instructions', async () => {
  const expected = fs.readFileSync(path.join(__dirname, '../assets/budget-speed-batch-12/garden-v2.txt'), 'utf8').trim();
  for (const tier of ['budget', 'shared']) {
    const recipe = await templates.recipe('garden-veil-spin', 'solo', tier, 'balance');
    assert.equal(recipe.prompt, expected);
    assert.equal(withBridalOrnaments(recipe.prompt), expected);
    assert.equal(recipe.version, 'garden-v2');
    assert.equal(recipe.duration, 10);
    assert.equal(fs.existsSync(recipe.sourceVideoPath), true);
  }
});
test('Courtyard V2 uses the exact replacement prompt and music clip in both tiers', async () => {
  const expected = fs.readFileSync(path.join(__dirname, '../assets/budget-speed-batch-14/courtyard-v2.txt'), 'utf8').trim();
  for (const tier of ['budget', 'shared']) {
    const recipe = await templates.recipe('courtyard-breeze-portrait', 'solo', tier, 'balance');
    assert.equal(recipe.prompt, expected);
    assert.equal(withBridalOrnaments(recipe.prompt), expected);
    assert.equal(recipe.version, 'courtyard-v2');
    assert.equal(recipe.duration, 10);
    assert.equal(recipe.useSourceAudio, true);
    assert.equal(fs.existsSync(recipe.sourceVideoPath), true);
    assert.match(recipe.sourceVideoPath, /reference-with-music\.mp4$/);
  }
});
