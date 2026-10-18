const test=require('node:test'),assert=require('node:assert/strict');
require('dotenv').config({quiet:true});
const route=require('../services/studioGenerationRoute');
const templates=require('../services/studioTemplateService');
const service=require('../services/studioHiggsfieldService');
test('Ultra Fast forces Grok and strips source videos even if a caller requests balance',async()=>{
  const recipe=require('../services/studioUltraFastTemplates')[0].subjects.solo;
  const o=route.enforce(route.resolve('ultrafast','balance'),{...recipe,tier:'ultrafast',generationMode:'balance',model:'wan3_0_prime',aspectRatio:'9:16'});
  assert.equal(o.model,'grok_video_v15');assert.equal(o.generationMode,'speed');assert.equal(o.sourceVideoPath,null);assert.equal(o.sourceVideoUrl,null);
  assert.ok(o.prompt.includes('SHOT 4, 8–10s'));
  assert.ok(o.prompt.length<4000);
  const params=service.videoParams(o,[{role:'image_references',value:'bride-id'}]);
  assert.equal(params.model,'grok_video_v15');assert.equal(params.mode,undefined);assert.equal(params.generate_audio,undefined);
  assert.ok(params.medias.every(m=>m.role==='image_references'));
  assert.equal(route.resolve('ultrafast','balance').useReferenceVideo,false);
});
test('unapproved Ultra Fast templates are hidden and cannot generate',async()=>{
  await assert.rejects(templates.resolve({tier:'ultrafast',scene:'ultra-palace',outputType:'video'}),/hidden/);
  const scenes=require('../services/studioUltraFastTemplates');
  assert.ok(scenes.every(scene=>scene.subjects.solo.hidden && !scene.subjects.solo.available));
});
