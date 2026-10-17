const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const route = require('../services/studioGenerationRoute');
const config = require('../services/studioVideoConfig');
const higgsfield = require('../services/studioHiggsfieldService');
const mcp = require('../services/higgsfieldMCPClient');

test('Budget and Premium use one Higgsfield route', () => {
  assert.equal(route.resolve('budget', 'speed').provider, 'higgsfield-mcp');
  assert.equal(route.resolve('budget', 'balance').provider, 'higgsfield-mcp');
  assert.equal(route.resolve('premium', 'speed').provider, 'higgsfield-mcp');
  assert.equal(route.resolve('premium', 'balance').provider, 'higgsfield-mcp');
});

test('Quick locks Wan Prime; Premium and Custom allow only the two approved models', () => {
  assert.deepEqual(higgsfield.selectedModel({ tier: 'budget', generationMode: 'speed', model: 'seedance_2_5' }),
    { id: 'wan3_0_prime' });
  assert.deepEqual(higgsfield.selectedModel({ tier: 'premium' }), {id:'wan3_0_prime'});
  assert.deepEqual(higgsfield.selectedModel({ tier: 'premium', model: 'seedance_2_5' }),
    { id: 'seedance_2_5', mode: 'video_edit' });
  for (const model of ['seedance_2_0','seedance_2_0_fast','seedance_2_0_mini']) assert.throws(()=>higgsfield.selectedModel({tier:'premium',model}));
  assert.deepEqual(higgsfield.selectedModel({tier:'flagship'}),{id:'hf_mult_motion_control'});
});

test('Custom preserves the typed prompt and validates source-dependent edit settings', () => {
  const body={tier:'custom',workflow:'prompt',outputType:'video',prompt:'My exact custom prompt.',duration:30,resolution:'1080p',aspectRatio:'16:9'};
  const options=config.resolve(body);
  assert.equal(options.prompt,body.prompt);
  assert.equal(options.duration,30);
  assert.equal(options.model,'wan3_0_prime');
  assert.throws(()=>config.resolve({...body,model:'seedance_2_5'}),/reference video/);
  const params=higgsfield.videoParams({...options,model:'seedance_2_5'},[{role:'video_references',value:'clip'}]);
  assert.equal(params.mode,'video_edit');
  assert.equal(params.duration,undefined);
  assert.equal(params.aspect_ratio,undefined);
});

test('Custom Budget respects portrait and landscape', () => {
  const base = { tier: 'budget', workflow: 'prompt', generationMode: 'speed', subjectMode: 'solo',
    prompt: 'A bridal portrait in a palace.', duration: 8, resolution: '720p' };
  assert.equal(config.resolve({ ...base, aspectRatio: '9:16' }).aspectRatio, '9:16');
  assert.equal(config.resolve({ ...base, aspectRatio: '16:9' }).aspectRatio, '16:9');
});

test('No paid video submission occurs without explicit spend enablement', async () => {
  const previous = process.env.HIGGSFIELD_SPEND_ENABLED;
  delete process.env.HIGGSFIELD_SPEND_ENABLED;
  const original = mcp._mcpCall;
  const calls = [];
  mcp._mcpCall = async (name, input) => {
    calls.push({ name, input });
    if (name === 'media_import_url') return { media_id: 'safe-reference-id' };
    if (name === 'generate_video' && input.params.get_cost === true) return { cost: { credits_exact: 12 } };
    throw new Error('A paid generation was submitted');
  };
  try {
    await assert.rejects(higgsfield.makeVideo({
      options: { tier: 'budget', generationMode: 'speed', prompt: 'Bridal film', aspectRatio: '9:16',
        duration: 8, resolution: '720p' },
      references: [{ role: 'bride', url: 'https://example.com/bride.jpg' }], sessionId: 'test',
    }), { code: 'OWNER_APPROVAL_REQUIRED' });
    assert.equal(calls.filter(call => call.name === 'generate_video' && !call.input.params.get_cost).length, 0);
  } finally {
    mcp._mcpCall = original;
    if (previous === undefined) delete process.env.HIGGSFIELD_SPEND_ENABLED;
    else process.env.HIGGSFIELD_SPEND_ENABLED = previous;
  }
});

test('All studio images select GPT Image 2 medium 2K and never submit while approval is off', async () => {
  const previous = process.env.HIGGSFIELD_SPEND_ENABLED;
  delete process.env.HIGGSFIELD_SPEND_ENABLED;
  const original = mcp._mcpCall;
  const calls = [];
  mcp._mcpCall = async (name, input) => {
    calls.push({ name, input });
    if (name === 'media_import_url') return { media_id: 'safe-image-id' };
    if (name === 'generate_image' && input.params.get_cost === true) return { cost: { credits_exact: 5 } };
    throw new Error('A paid image generation was submitted');
  };
  try {
    await assert.rejects(higgsfield.makeImage({ prompt: 'Full bridal portrait', brideImageUrl: 'https://example.com/bride.jpg',
      dressImageUrl: 'https://example.com/dress.jpg', aspectRatio: '3:4', sessionId: 'test' }), { code: 'OWNER_APPROVAL_REQUIRED' });
    const quote = calls.find(call => call.name === 'generate_image');
    assert.equal(quote.input.params.model, 'gpt_image_2');
    assert.equal(quote.input.params.quality, 'medium');
    assert.equal(quote.input.params.resolution, '2k');
    assert.equal(quote.input.params.medias.length, 2);
    assert.ok(quote.input.params.medias.every(media => media.role === 'image'));
    assert.equal(calls.filter(call => call.name === 'generate_image' && !call.input.params.get_cost).length, 0);
  } finally {
    mcp._mcpCall = original;
    if (previous === undefined) delete process.env.HIGGSFIELD_SPEND_ENABLED;
    else process.env.HIGGSFIELD_SPEND_ENABLED = previous;
  }
});
