const test = require('node:test');
const assert = require('node:assert/strict');
const { MANNEQUIN_EXCLUSION, withMannequinExclusion } = require('../services/studioImagePromptRules');

test('adds only the requested mannequin instruction, preserving all original wording', () => {
  const original = 'EXACT owner prompt.\nPreserve colour, embroidery and framing.  ';
  assert.equal(withMannequinExclusion(original), original + '\n\n' + MANNEQUIN_EXCLUSION);
});
test('does not append duplicate mannequin instructions', () => {
  const once = withMannequinExclusion('Bridal portrait.');
  assert.equal(withMannequinExclusion(once), once);
});
