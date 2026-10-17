const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
for (const name of ['storageService', 'sessionService']) {
  const id = require.resolve('../services/' + name);
  require.cache[id] = { id, filename: id, loaded: true, exports: {} };
}
const mediaId = require.resolve('../services/studioMediaService');
require.cache[mediaId] = { id: mediaId, filename: mediaId, loaded: true, exports: {
  remoteImage: async (url, name) => ({ url, name }),
  contactSheet: async (urls, name) => ({ urls, name }),
} };
const { budgetFiles } = require('../services/studioVideoService');
const syncId = require.resolve('../services/dressFlowSyncService');
require.cache[syncId] = {id:syncId,filename:syncId,loaded:true,exports:{bundle:async()=>({sheet:{assetName:'saved-sheet',projectUrl:'https://flow.google.com/project/test'},photos:['front','detail','side'].map(angle=>({angle,assetName:'saved-'+angle,projectUrl:'https://flow.google.com/project/test'}))})}};
const environment = path.join(__dirname, '..', 'assets', 'budget-speed-01', 'environment-pair.png');
test('1, 4, 5, 6 and 8 dress views retain bride, dress, environment and ornaments', async () => {
  for (const count of [1, 4, 5, 6, 8]) {
    const views = Array.from({ length: count }, (_, i) => ({ role: 'dress view ' + i, url: 'test:dress-' + i }));
    const result = await budgetFiles({ referenceImagePath: environment }, [{ role: 'bride', url: 'test:bride' }, ...views], 'test:approved');
    assert.equal(result.files.length, 4);
    assert.equal(result.files[0].url, 'test:bride');
    if (count === 1) assert.equal(result.files[1].url, 'test:dress-0');
    else assert.equal(result.files[1].urls.length, count);
    assert.ok(result.files[2].buffer.length);
    assert.match(result.roles[2], /ENVIRONMENT_REFERENCE/);
    assert.match(result.roles[3], /BRIDAL_ORNAMENTS_REFERENCE/);
    assert.equal(result.files[3].originalname, 'bridal-ornaments-reference.png');
    // Frame mode replaces ingredients in Flow: retain all three authorities instead.
    assert.equal(result.firstFrame, undefined);
    assert.equal(result.sourcePath, undefined);
  }
});
test('Verified extended bundle includes sheet plus individual front, close-up and side',async()=>{
  const result=await budgetFiles({extendedReferences:true,sourceVideoPath:'source.mp4'},[
    {role:'bride',url:'test:bride'},{role:'dress front',url:'test:front'},
    {role:'dress detail',url:'test:detail'},{role:'dress side',url:'test:side'},
  ]);
  assert.equal(result.files.length,6);
  assert.deepEqual(result.files.slice(2,5).map(file=>file.url),['test:front','test:detail','test:side']);
  assert.match(result.roles[3],/stitching/);
  assert.match(result.roles[5],/BRIDAL_ORNAMENTS_REFERENCE/);
  assert.equal(result.sourcePath,'source.mp4');
});

test('Extended references require only the full-front dress photo', async () => {
  const result = await budgetFiles({extendedReferences:true,sourceVideoAsset:'saved-video'},[
    {role:'bride',url:'test:bride'},{role:'dress front',url:'test:front'},
  ]);
  assert.equal(result.files.length,3);
  assert.equal(result.files[1].url,'test:front');
  assert.ok(!result.roles.some(role=>/individual side|individual close-up/.test(role)));
  await assert.rejects(budgetFiles({extendedReferences:true}, [
    {role:'bride',url:'test:bride'}, {role:'dress detail',url:'test:detail'},
  ]), /one full-front/);
});

test('Single saved front photo is reused directly without a duplicate sheet or invented optional views',async()=>{
  const result=await budgetFiles({extendedReferences:true,flowDressKey:'cached',sourceVideoAsset:'saved-video'},[
    {role:'bride',url:'test:bride'},{role:'dress front',url:'test:front'},
  ]);
  assert.equal(result.files.length,3);assert.equal(result.files[1].assetName,'saved-front');
});

test('Ready saved dress uses asset names for every garment reference, not new dress uploads',async()=>{
  const result=await budgetFiles({flowDressKey:'cached',extendedReferences:true,sourceVideoAsset:'saved-video'},[
    {role:'bride',url:'test:new-bride'},...['front','detail','side'].map(angle=>({role:'dress '+angle,url:'test:'+angle})),
  ]);
  assert.equal(result.files[0].url,'test:new-bride');
  assert.equal(result.files[0].identityReference,true);
  assert.ok(result.files.slice(1).every(file=>!file.identityReference));
  assert.deepEqual(result.files.slice(1,-1).map(f=>f.assetName),['saved-sheet','saved-front','saved-detail','saved-side']);
  assert.match(result.roles.at(-1),/BRIDAL_ORNAMENTS_REFERENCE/);
});
