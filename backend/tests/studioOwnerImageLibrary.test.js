const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const scenes = require('../services/studioImageTemplates');
test('eight numbered shared image templates preserve supplied prompt text', () => {
  assert.equal(scenes.length, 8);
  const root = path.join(__dirname, '../assets/approved-image-prompts');
  assert.equal(scenes[2].subjects.solo.imagePrompt, fs.readFileSync(path.join(root, 'prompt-03-staircase.txt'), 'utf8').trim());
  const source = fs.readFileSync(path.join(root, 'user-image-prompts-03-to-08.txt'), 'utf8').replace(/\r\n/g, '\n');
  for (let number = 4; number <= 8; number++) {
    const recipe = scenes[number - 1].subjects.solo;
    assert.equal(recipe.templateNumber, number);
    assert.ok(source.includes(recipe.imagePrompt));
    assert.ok(recipe.imagePrompt.startsWith('Create a photorealistic'));
    assert.ok(!recipe.imagePrompt.includes('Reference image:'));
    assert.ok(!recipe.imagePrompt.includes('END OF IMAGE PROMPT LIBRARY'));
    assert.equal(recipe.aspectRatio, '16:9');
    assert.equal(recipe.imageResolution, '2k');
    assert.ok(recipe.available);
  }
});
