const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');

test('video creation accepts a saved bride ID without an uploaded bride file', async () => {
  process.env.STUDIO_EXPERIENCE_STORE = path.join(await mkdtemp(path.join(tmpdir(),'lp-named-creation-')), 'jobs.json');
  let input;
  const mocks = {
    '../services/studioTemplateService': { resolve: async () => ({ tier:'budget',workflow:'preset',scene:'palace-crimson-reveal',generationMode:'speed',subjectMode:'solo',videoSubjectMode:'solo',imageSubjectMode:'solo',aspectRatio:'9:16',prompt:'Bridal film' }) },
    '../services/savedBrideService': { resolve:async(id,imageId)=>({brideId:id,imageId,name:'Remia',url:'https://example.test/remia.jpg'}) },
    '../services/dressService': {getDressById:async()=>({id:'dress-21',name:'Blue Lehenga 21',isAvailable:true,imageUrl:'https://example.test/dress.jpg',images:[{url:'https://example.test/dress.jpg',angle:'front'}]})},
    '../services/dressFlowSyncService': {enqueue:async()=>({key:'dress-key'})},
    '../services/googleFlowMcpService': {ready:async()=>true,status:async()=>({ready:true})},
    '../services/studioVideoService': { localResults:new Map(),render:async(id,options,refs)=>{input=refs;return 'https://example.test/result.mp4';} },
    '../services/googleFlowImageService': {},
    '../services/storageService': {uploadImage:async()=>{throw new Error('Saved inputs must not upload again');}},
  };
  for(const [name,exports] of Object.entries(mocks)){const id=require.resolve(name);require.cache[id]={id,filename:id,loaded:true,exports};}
  const creation=require('../services/studioCreationService');
  const job=await creation.start({tier:'budget',mode:'standard',outputType:'video',brideId:'remia-id',brideImageId:'photo-id',dressId:'dress-21'});
  assert.equal(job.brideName,'Remia');
  let result;
  for(let attempt=0;attempt<100;attempt++){result=await creation.get(job.id);if(result.video.status==='ready')break;await new Promise(resolve=>setTimeout(resolve,10));}
  assert.equal(result.video.status,'ready');
  assert.equal(input.references.find(ref=>ref.role==='bride').url,'https://example.test/remia.jpg');
});
