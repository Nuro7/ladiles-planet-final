const test=require('node:test'),assert=require('node:assert/strict');
require('dotenv').config({quiet:true});
const variant=require('../services/studioFlagshipModel');
const service=require('../services/studioHiggsfieldService');
test('Flagship Lite trial and explicit Pro rollback',()=>{
 const saved=process.env.FLAGSHIP_VIDEO_VARIANT;
 try{
  delete process.env.FLAGSHIP_VIDEO_VARIANT;
  assert.equal(variant.current(),variant.LITE);
  const params=service.videoParams({tier:'flagship',duration:10,aspectRatio:'16:9',resolution:'720p'},[{role:'video_references',value:'source'}]);
  assert.equal(params.model,variant.LITE);assert.equal(params.duration,undefined);assert.equal(params.aspect_ratio,undefined);assert.equal(params.generate_audio,undefined);
  process.env.FLAGSHIP_VIDEO_VARIANT='pro';assert.equal(variant.current(),variant.PRO);
  assert.equal(service.selectedModel({tier:'flagship',model:variant.LITE}).id,variant.LITE);
  assert.equal(service.selectedModel({tier:'flagship',model:variant.PRO}).id,variant.PRO);
 }finally{if(saved===undefined)delete process.env.FLAGSHIP_VIDEO_VARIANT;else process.env.FLAGSHIP_VIDEO_VARIANT=saved;}
});
