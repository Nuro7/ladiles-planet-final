import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAudioSetting } from '../dist/flow.js';
function fixture(initial, available=true) {
  let checked=initial, clicks=0;
  const invisible={isVisible:async()=>false};
  const toggle={isVisible:async()=>available,isChecked:async()=>checked,click:async()=>{checked=!checked;clicks++;}};
  const page={keyboard:{press:async()=>{}},getByRole(role,opts){
    if(role==='button'&&opts.name instanceof RegExp)return {all:async()=>[{isVisible:async()=>true,click:async()=>{}}]};
    if(role==='checkbox')return toggle;
    return invisible;
  }};
  return {page,checked:()=>checked,clicks:()=>clicks};
}
test('Silent project checkbox is enabled once, then left unchanged',async()=>{
  const f=fixture(false), job={params:{type:'video',generate_audio:false}};
  await applyAudioSetting(f.page,job); await applyAudioSetting(f.page,job);
  assert.equal(f.checked(),true);assert.equal(f.clicks(),1);
});
test('Requests for generated audio disable the silent project checkbox',async()=>{
  const f=fixture(true);
  await applyAudioSetting(f.page,{params:{type:'video',generate_audio:true}});
  assert.equal(f.checked(),false);
});
test('Missing project audio control blocks instead of ignoring the setting',async()=>{
  const f=fixture(false,false);
  await assert.rejects(applyAudioSetting(f.page,{params:{type:'video',generate_audio:false}}),/No generation was submitted/);
});
