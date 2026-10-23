const test=require('node:test'),assert=require('node:assert/strict');
require('dotenv').config({quiet:true});
const route=require('../services/studioGenerationRoute');
const templates=require('../services/studioTemplateService');
const service=require('../services/studioHiggsfieldService');
test('Ultra Fast forces Grok and strips source videos even if a caller requests balance',async()=>{
  const recipe=require('../services/studioUltraFastTemplates').find(s=>s.id==='ultra-garden').subjects.solo;
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
  await assert.rejects(templates.resolve({tier:'ultrafast',scene:'ultra-palace',outputType:'both'}),/hidden/);
  const scenes=require('../services/studioUltraFastTemplates');
  assert.ok(scenes.filter(scene=>['ultra-garden','ultra-palace','ultra-editorial'].includes(scene.id)).every(scene=>scene.subjects.solo.hidden && !scene.subjects.solo.available));
});
test('all reel studies preserve compact prompts, original soundtrack and landscape in every image bundle',async()=>{
  const fs=require('node:fs');
  const scenes=require('../services/studioUltraReelTemplates');
  const images=require('../services/studioImageTemplates');
  assert.equal(scenes.length,10);
  for(const scene of scenes){
    const r=scene.subjects.solo;
    assert.ok(r.prompt.length<4000);
    assert.equal(r.promptCharacterCount,r.prompt.length);
    assert.ok(r.prompt.includes('MANNEQUIN EXCLUSION'));
    assert.ok(r.prompt.includes('STRICT REFERENCES'));
    assert.ok(r.prompt.includes('jewellery'));
    assert.ok(fs.statSync(r.musicPath).size>0);
    assert.equal(r.cardDesign,'reel-study');
    assert.equal(r.status,'owner-requested-not-tested');
    for(const image of images){
      const o=await templates.resolve({tier:'ultrafast',videoScene:scene.id,imageScene:image.id,outputType:'both',aspectRatio:'9:16'});
      assert.equal(o.prompt,r.prompt);assert.equal(o.aspectRatio,'16:9');
      assert.equal(o.musicPath,r.musicPath);assert.equal(o.duration,10);
      assert.equal(o.model,'grok_video_v15');assert.equal(o.sourceVideoPath,null);
      assert.ok(o.imagePrompt);
    }
  }
});
test('owner template 1 preserves exact prompt and adds saved music without video references',async()=>{
  const fs=require('node:fs'),path=require('node:path');
  const imageScene=require('../services/studioImageTemplates')[0].id;
  const o=await templates.resolve({tier:'ultrafast',scene:'ultra-luxury-01',imageScene,outputType:'both',aspectRatio:'16:9'});
  const exact=fs.readFileSync(path.join(__dirname,'../assets/ultra-fast-luxury-01/prompt.txt'),'utf8').replace(/\r\n/g,'\n').trim();
  assert.equal(o.prompt,exact);assert.equal(o.sourceVideoPath,null);assert.equal(o.model,'grok_video_v15');
  assert.equal(o.duration,10);assert.ok(fs.existsSync(o.musicPath));assert.equal(o.aspectRatio,'16:9');
  assert.ok(o.imagePrompt);assert.equal(o.imageScene,imageScene);
});
test('Ultra Fast rejects image-only but permits video-only testing without an image recipe',async()=>{
  await assert.rejects(templates.resolve({tier:'ultrafast',scene:'ultra-luxury-01',outputType:'image'}),/video-only testing/);
  for(const scene of require('../services/studioUltraFastTemplates').filter(s=>s.subjects.solo.available)) {
    const o=await templates.resolve({tier:'ultrafast',videoScene:scene.id,outputType:'video',aspectRatio:'16:9'});
    assert.equal(o.model,'grok_video_v15');assert.equal(o.imageTemplateId,undefined);
    assert.equal(o.sourceVideoPath,null);assert.ok(o.musicPath);
  }
});
test('Ultra Fast identity revision binds the bride to the first actual image',()=>{
  const scene=require('../services/studioUltraFastTemplates').find(s=>s.id==='ultra-luxury-01').subjects.solo;
  assert.equal(scene.version,'ultra-luxury-v2-identity');
  assert.ok(scene.prompt.includes('FIRST attached image'));
  assert.ok(scene.prompt.includes('ONLY face-identity authority'));
  assert.ok(scene.prompt.includes('No identity blending'));
  assert.ok(scene.prompt.includes('EXACT DRESS FROM MULTI-ANGLE REFERENCES:'));
});
