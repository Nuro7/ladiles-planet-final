import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
const result=buildSync({entryPoints:[fileURLToPath(new URL('../src/studio/experience/GenerationWaitingScene.jsx',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,packages:'external',loader:{'.css':'empty'},jsx:'automatic'});
const compiled={exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);
const {default:Scene,waitingSceneCopy}=compiled.exports;
test('waiting scene renders supplied references and clearly labels decorative motion',()=>{
  const html=renderToStaticMarkup(React.createElement(Scene,{kind:'video',state:{status:'generating',stage:'submitted'},referencePreviews:[{src:'/reference.jpg',label:'Dress reference'}]}));
  assert.match(html,/reference.jpg/);
  assert.match(html,/not a preview of the unfinished result/);
  assert.match(html,/Pause waiting animation/);
  assert.doesNotMatch(html,/\d+%|Grok|Seedance|Higgsfield/);
});
test('status copy follows backend stages instead of an invented timed progress sequence',()=>{
  assert.match(waitingSceneCopy('video',{status:'queued'}).title,/queued/);
  assert.match(waitingSceneCopy('video',{status:'generating',stage:'submitted'}).detail,/Request accepted/);
  assert.match(waitingSceneCopy('image',{status:'generating',stage:'preparing'}).title,/Preparing/);
});
test('motions support pause and reduced motion; scene cannot submit generations',()=>{
  const css=readFileSync(new URL('../src/studio/experience/generationWaitingScene.css',import.meta.url),'utf8');
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/animation-play-state:paused/);
  assert.match(css,/grid-column:3/);
  const source=readFileSync(new URL('../src/studio/experience/GenerationWaitingScene.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/fetch\(|startStudioExperience|setInterval|setTimeout/);
});
