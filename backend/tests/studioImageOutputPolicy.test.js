const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config({quiet:true});
const policy = require('../services/studioImageOutputPolicy');

test('landscape image rule only changes framing and is not duplicated', () => {
  const input = 'Exact red dress, face and jewellery. A vertical 4:5 portrait composition.';
  const result = policy.landscapeImagePrompt(input);
  assert.ok(result.startsWith('Exact red dress, face and jewellery. A 16:9 landscape composition.'));
  assert.ok(result.includes(policy.LANDSCAPE_RULE));
  assert.equal(policy.landscapeImagePrompt(result),result);
});
test('all published image recipes use landscape output without changing source files', () => {
  for(const scene of require('../services/studioImageTemplates')) {
    const recipe=scene.subjects.solo;
    assert.equal(recipe.aspectRatio,'16:9');
    assert.equal(recipe.imageResolution,'2k');
    assert.doesNotMatch(recipe.imagePrompt,/vertical 4:5 portrait composition|portrait orientation/i);
    assert.ok(recipe.imagePrompt.includes(policy.LANDSCAPE_RULE));
  }
});
test('all modes enforce landscape 2K images independently of portrait video settings', () => {
  const config=require('../services/studioVideoConfig');
  for(const tier of config.tiers) {
    const options=config.resolve({tier:tier.id,workflow:'prompt',prompt:'The exact bridal outfit and identity.',duration:tier.duration,resolution:tier.resolution,aspectRatio:'9:16',imageResolution:'1k'});
    assert.equal(options.imageResolution,'2k',tier.id);
    assert.equal(options.imageAspectRatio,'16:9',tier.id);
    assert.equal(options.aspectRatio,'9:16',tier.id+' video frame must not change');
  }
});
test('image credit quote requests exactly the landscape 2K generation settings', async () => {
  const mcp=require('../services/higgsfieldMCPClient');
  const original=mcp._mcpCall;
  const calls=[];
  mcp._mcpCall=async(name,input)=>{calls.push({name,input}); return {cost:{credits_exact:7}};};
  try {
    const quote=await require('../services/studioCreditQuote').create({tier:'custom',outputType:'image',workflow:'prompt',prompt:'A bridal photograph.',duration:10,resolution:'720p',aspectRatio:'9:16',imageResolution:'1k'});
    assert.equal(quote.costs.image,7);
    assert.equal(calls.length,1);
    assert.equal(calls[0].input.params.get_cost,true);
    assert.equal(calls[0].input.params.resolution,'2k');
    assert.equal(calls[0].input.params.aspect_ratio,'16:9');
  } finally {mcp._mcpCall=original;}
});
