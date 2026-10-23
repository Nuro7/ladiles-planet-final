import test from 'node:test';
import assert from 'node:assert/strict';
import { assetNamePattern, sameAssetName } from '../dist/assetNames.js';

test('matches saved dress title with or without extension and picker type', () => {
  const pattern = assetNamePattern('fm-2bde2e56-stock1.jpg');
  for (const name of ['fm-2bde2e56-stock1.jpg', 'fm-2bde2e56-stock1', 'fm-2bde2e56-stock1 Image', 'fm-2bde2e56-stock1.jpg Image']) assert.equal(pattern.test(name), true);
  assert.equal(sameAssetName('fm-2bde2e56-stock1.jpg', 'fm-2bde2e56-stock1'), true);
});
test('does not select shared prefixes, other extensions or other assets', () => {
  const pattern = assetNamePattern('fm-2bde2e56-stock1.jpg');
  for (const name of ['fm-2bde2e56-stock10.jpg', 'fm-2bde2e56-stock1.png', 'fm-2bde2e56-stock1-extra.jpg', 'other-stock1.jpg']) assert.equal(pattern.test(name), false);
});
test('escapes punctuation in exact filenames', () => {
  assert.equal(assetNamePattern('dress (blue)+1.jpg').test('dress (blue)+1 Image'), true);
  assert.equal(assetNamePattern('dress (blue)+1.jpg').test('dress blue1.jpg'), false);
});
