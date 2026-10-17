const { test } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../services/studioVideoConfig');

test('kissing template is excluded from both Budget catalogs and retained in both Premium catalogs', () => {
  for (const catalog of [config.budgetSpeedScenes, config.budgetScenes]) assert.equal(catalog.some(scene => scene.id === 'garden-kiss-embrace'), false);
  for (const catalog of [config.premiumSpeedScenes, config.premiumBalanceScenes]) assert.equal(catalog.some(scene => scene.id === 'garden-kiss-embrace'), true);
  for (const generationMode of ['speed', 'balance']) assert.throws(() => config.resolve({tier:'budget', generationMode, scene:'garden-kiss-embrace', workflow:'preset'}), /Premium only/);
});
