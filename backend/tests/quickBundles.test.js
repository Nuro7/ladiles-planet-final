const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config({quiet:true});
const config = require('../services/studioVideoConfig');
const {selectedModel} = require('../services/studioHiggsfieldService');
test('Quick defaults to Seedance 2.5 and 480p with 1K or 2K image output', () => {
  const base = {tier:'budget',workflow:'prompt',prompt:'A bridal fashion film',duration:10,aspectRatio:'9:16'};
  for (const imageResolution of ['1k','2k']) {
    const options=config.resolve({...base,imageResolution});
    assert.equal(options.resolution,'480p');
    assert.equal(options.imageResolution,imageResolution);
    assert.deepEqual(selectedModel(options),{id:'seedance_2_5',mode:'video_edit'});
  }
  assert.throws(()=>config.resolve({...base,imageResolution:'4k'}),/image quality/);
});
test('Quick and Premium expose five updated video templates; older templates remain disabled', () => {
  for(const catalog of [config.budgetScenes,config.premiumBalanceScenes]) {
    assert.equal(catalog.filter(x=>x.subjects.solo?.available!==false).length,5);
    assert.ok(catalog.filter(x=>x.subjects.solo?.available===false).every(x=>x.subjects.solo.comingSoon));
  }
});
