import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCreationRunning, canStartCreation, showCreationResults } from '../src/studio/experience/backgroundCreation.js';

test('every mode can hide results to explore without changing the active job', () => {
  for (const tier of ['ultrafast','budget','premium','flagship','custom']) {
    const job=Object.freeze({id:'keep-provider-job',tier,image:Object.freeze({status:'ready'}),video:Object.freeze({status:'generating'})});
    assert.equal(isCreationRunning(job),true);
    assert.equal(showCreationResults(job,false),true);
    assert.equal(showCreationResults(job,true),false);
    assert.equal(showCreationResults(job,false),true);
    assert.equal(job.id,'keep-provider-job');
    assert.equal(job.video.status,'generating');
    assert.equal(canStartCreation(job),false);
  }
});
test('new submissions stay blocked through upload, image, video and upscale processing', () => {
  for (const job of [{image:{status:'queued'}},{image:{status:'generating'}},{video:{status:'queued'}},{video:{status:'generating'}},{video:{status:'ready',upscaleStatus:'generating'}}]) {
    assert.equal(canStartCreation(job),false);
  }
  assert.equal(canStartCreation({image:{status:'ready'},video:{status:'ready'}}),true);
  assert.equal(canStartCreation(null,true),false);
});
test('navigation retains the active creation and its poller, with no generation mutation calls', () => {
  const studio=readFileSync(new URL('../src/studio/modules/CinematicStudio.jsx',import.meta.url),'utf8');
  const navigation=studio.slice(studio.indexOf('  function explore()'),studio.indexOf('  function chooseOutput('));
  assert.doesNotMatch(navigation,/setJob\(null\)|removeItem\(LAST_JOB\)|startStudioExperience|retryStudioVideo|reset\(/);
  assert.match(navigation,/setExploring\(true\)/);
  assert.match(studio,/if \(!canStartCreation\(job, busy\)/);
  assert.match(studio,/onClick=\{\(\) => chooseTier\(id\)\} disabled=\{busy \|\| !config\}/);
  const monitor=readFileSync(new URL('../src/studio/experience/BackgroundCreationNotice.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(monitor,/startStudioExperience|retryStudioVideo|regenerateStudioImage|method:\s*['"]POST/);
  assert.match(monitor,/getStudioExperience\(id\)/);
  assert.match(monitor,/View progress/);
});
