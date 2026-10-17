const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
process.env.DRESS_FLOW_STORE=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'lp-sync-')),'sync.json');
let imports=0, fail=false;
for(const [name,exports] of Object.entries({
  './googleFlowMcpService':{currentProject:async()=> 'https://flow.google.com/project/test',importAssets:async(files,project,onQueued)=>{imports++;await onQueued('upload-job');if(fail)throw Error('Connection needs attention');return files.map((_,i)=>'saved-'+i);}},
  './studioMediaService':{contactSheet:async()=>({buffer:Buffer.from('sheet')}),remoteImage:async()=>({buffer:Buffer.from('photo')})},
})) {const id=require.resolve('../services/'+name.slice(2));require.cache[id]={id,filename:id,loaded:true,exports};}
const sync=require('../services/dressFlowSyncService');
test('Gallery sync is upload-only and reused despite refreshed signed URL tokens',async()=>{
  const views=[{url:'https://storage.test/front.jpg?token=old',angle:'front'},{url:'https://storage.test/side.jpg',angle:'side'}];
  const first=await sync.enqueue(views,'Blue lehenga');
  const saved=await sync.bundle(first.key,true);
  assert.equal(saved.assetNames.length,3);
  assert.equal(saved.photos[0].assetName,'saved-1');
  assert.equal(saved.projectUrl,'https://flow.google.com/project/test');
  const again=await sync.enqueue([{...views[0],url:'https://storage.test/front.jpg?token=new'},views[1]],'Blue lehenga');
  assert.equal(again.key,first.key);assert.equal(again.status,'ready');assert.equal(imports,1);
  assert.notEqual(sync.key([{...views[0],angle:'detail'},views[1]]),first.key);
});
test('Sync failures remain visible and retry resumes the saved upload job',async()=>{
  fail=true;
  const state=await sync.enqueue([{url:'https://storage.test/red.jpg',angle:'front'}],'Red dress');
  await assert.rejects(sync.bundle(state.key,true),/not ready/);
  assert.equal((await sync.get(state.key)).status,'attention');
  fail=false;await sync.retry(state.key);assert.equal((await sync.bundle(state.key,true)).status,'ready');
});
