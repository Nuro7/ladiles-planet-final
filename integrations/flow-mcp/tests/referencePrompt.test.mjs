import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindReferenceNames } from '../dist/referencePrompt.js';
test('Owner-tested text remains exact even with named identity and garment attachments', () => {
  const prompt = 'BRIDE_IDENTITY\nDRESS_REFERENCE\nKeep the original scene.';
  assert.equal(bindReferenceNames(prompt, ['bride.jpg', 'dress.jpg', 'reference.mp4'], [1], true), prompt);
  assert.throws(() => bindReferenceNames(prompt, ['dress.jpg'], [2], true), /identity reference is missing/);
});

test('dynamic aliases bind to actual Flow titles and attached image numbers', () => {
  const prompt = 'Use BRIDE_IDENTITY wearing DRESS_REFERENCE in ENVIRONMENT_REFERENCE.\nImage 1: BRIDE_IDENTITY: identity only.\nImage 2: DRESS_REFERENCE: garment only.\nImage 3: ENVIRONMENT_REFERENCE: two screenshots of one venue.';
  const result = bindReferenceNames(prompt, ['Bride One', 'dress.png', 'venue-pair']);
  assert.match(result, /Use the attached asset named "Bride One" wearing the attached asset named "dress.png"/);
  assert.match(result, /in the attached asset named "venue-pair"/);
  assert.match(result, /Image 3: "venue-pair". Role: ENVIRONMENT_REFERENCE: two screenshots/);
  assert.ok(!result.includes('undefined'));
});
test('changed filenames and extensions do not require a template rewrite', () => {
  const prompt = 'Use BRIDE_IDENTITY.\nImage 1: BRIDE_IDENTITY: identity only.';
  for (const name of ['bride1.png', 'fm-second-job-ref1.webp', 'Face "A" $1']) {
    assert.ok(bindReferenceNames(prompt, [name]).includes('the attached asset named ' + JSON.stringify(name)));
  }
});
test('text-only requests are unchanged; generic references get an explicit title list', () => {
  assert.equal(bindReferenceNames('Wedding garden.', []), 'Wedding garden.');
  assert.match(bindReferenceNames('Wedding garden.', ['garden']), /Image 1: "garden"/);
});
test('Worker fills prompt before attaching ingredients, then validates and records references', () => {
  const source = readFileSync(new URL('../src/flow.ts', import.meta.url), 'utf8');
  const start = source.indexOf('const submittedPrompt = bindReferenceNames');
  const section = source.slice(start, source.indexOf('const start = page.getByRole', start));
  assert.ok(section.indexOf('()=>typePrompt') >= 0);
  assert.ok(section.indexOf('()=>typePrompt') < section.indexOf('for (const name of attachedNames) await attachAsset'));
  assert.match(section,/attached !== wanted/);
  assert.match(section,/name: "Ingredient", exact: true/);
  assert.match(section,/job.attachedAssetNames/);
  assert.match(section,/job.submittedPrompt/);
});

test('Only the explicitly marked bride is an identity authority, never dress or motion assets',()=>{
  const names=['new-bride.jpg','cached-dress.jpg','source-video'];
  const result=bindReferenceNames('Image 1: BRIDE_IDENTITY: face only.\nImage 2: DRESS_REFERENCE: outfit only.',names,[1]);
  assert.match(result,/IDENTITY AUTHORITY — Only "new-bride.jpg" define/);
  assert.doesNotMatch(result,/IDENTITY AUTHORITY — Only "cached-dress/);
  assert.throws(()=>bindReferenceNames('Bride',names,[4]),/identity reference is missing/);
  assert.throws(()=>bindReferenceNames('Bride',[],[1]),/identity reference is missing/);
  const core=readFileSync(new URL('../src/core.ts',import.meta.url),'utf8');
  assert.match(core,/\.filter\(\(n\) => characterLook\(n\) !== undefined\)/);
});

test('New references upload before model settings and stage timing is persisted',()=>{
  const source=readFileSync(new URL('../src/flow.ts',import.meta.url),'utf8');
  const start=source.indexOf('// Attachments are independent');
  const block=source.slice(start,source.indexOf('const frameAssets:',start));
  assert.ok(block.indexOf('uploadAsset')<block.indexOf('applySettings'));
  assert.match(source,/job\.stageTimings/);
});
test('Preparation-only mode returns before the generation button click',()=>{
  const source=readFileSync(new URL('../src/flow.ts',import.meta.url),'utf8');
  const prep=source.indexOf('if (s.prepare_only)');
  assert.ok(prep>0&&prep<source.indexOf('await start.click()',prep));
  assert.match(source.slice(prep,source.indexOf('const start = page.getByRole',prep)),/return \[\]/);
});
