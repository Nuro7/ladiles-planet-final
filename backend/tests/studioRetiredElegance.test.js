const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('dotenv').config({quiet:true});
test('Pure Elegance is absent from every selectable video catalog while original assets remain',()=>{
  const config=require('../services/studioVideoConfig');
  for(const [name,catalog] of Object.entries(config)) if(Array.isArray(catalog)) assert.ok(!catalog.some(scene=>scene.id==='pure-elegance-landscape'),name);
  for(const name of ['prompt.txt','reference-10s-landscape.mp4','template-thumbnail.jpg']) assert.ok(fs.existsSync(path.join(__dirname,'../assets/elegance-landscape',name)));
});
test('stale clients cannot start a retired Pure Elegance template',async()=>{
  const service=require('../services/studioTemplateService');
  for(const tier of ['budget','premium']) await assert.rejects(service.resolve({tier,outputType:'video',generationMode:'balance',scene:'pure-elegance-landscape',videoScene:'pure-elegance-landscape',subjectMode:'solo'}),/valid scene|scene preset/);
});
