import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { templateLibraryMode } from '../src/studio/templateNavigation.js';

const source=readFileSync(new URL('../src/studio/modules/CinematicStudio.jsx',import.meta.url),'utf8');
function handler(name,next,context) {
  const code=source.slice(source.indexOf('  function '+name+'('),source.indexOf('  function '+next+'('));
  return new Function(...Object.keys(context),code+';return '+name+';')(...Object.values(context));
}
function draft(overrides={}) {
  const state={};
  const context={busy:false,job:null,tierId:'premium',subject:'solo',output:'video',chosenTemplates:{},
    remember:value=>{state.preferences=value;},explore:()=>{state.exploring=true;},...overrides};
  for(const name of ['Output','Ratio','ImageScene','Scene','ImageSubject','VideoSubject','Subject','ChosenTemplates','Error','TemplateOpen','BundleSearch','BundleLimit']) context['set'+name]=value=>{state[name]=value;};
  return {state,context};
}
test('Premium combined output shows bundles while single outputs and Flagship remain separate',()=>{
  for(const tier of ['ultrafast','budget','premium']) for(const guided of [true,false]) {
    assert.equal(templateLibraryMode(tier,'both',guided),'bundles-and-cards');
  }
  for(const tier of ['premium','flagship']) for(const output of (tier==='premium'?['image','video']:['image','video','both'])) for(const guided of [true,false]) {
    assert.equal(templateLibraryMode(tier,output,guided),'guided-cards');
  }
});
test('Premium and Flagship card taps open immediately even with a stale combined preference',()=>{
  for(const tierId of ['premium','flagship']) for(const kind of ['image','video']) {
    const {state,context}=draft({tierId,output:'both',job:{id:'keep-running'}});
    handler('chooseTemplate','chooseBundleSubject',context)(kind,'chosen-card',kind==='video' && tierId==='flagship'?'couple':'solo');
    assert.equal(state.Output,kind);
    assert.equal(state.TemplateOpen,true);
    assert.equal(state.exploring,true);
  }
});
test('a single image-only or video-only card tap opens the upload form',()=>{
  for(const output of ['image','video']) {
    const {state,context}=draft({output});
    const select=handler('chooseTemplate','chooseBundleSubject',context);
    select(output,'selected-template',output==='video'?'couple':'solo');
    assert.equal(state.TemplateOpen,true);
    assert.equal(state.ChosenTemplates[output],true);
    assert.equal(state[output==='video'?'Scene':'ImageScene'],'selected-template');
  }
});
test('one bundle tap selects both exact prompts and opens uploads, including groom for Flagship',()=>{
  for(const videoSubject of ['solo','couple']) {
    const existing=Object.freeze({id:'original-job',video:Object.freeze({status:'generating'})});
    const {state,context}=draft({output:'both',job:existing});
    const select=handler('chooseBundle','selectFiles',context);
    select({imageTemplate:{item:{id:'image-2'},subject:'solo'},videoTemplate:{item:{id:'video-1'},subject:videoSubject,assets:{aspectRatio:'9:16'}}});
    assert.deepEqual(state.ChosenTemplates,{image:true,video:true});
    assert.equal(state.TemplateOpen,true);
    assert.equal(state.ImageScene,'image-2');
    assert.equal(state.Scene,'video-1');
    assert.equal(state.VideoSubject,videoSubject);
    assert.equal(state.exploring,true);
    assert.equal(existing.video.status,'generating');
  }
});
