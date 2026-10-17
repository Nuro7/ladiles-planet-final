const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mkdtemp } = require('node:fs/promises');
const { tmpdir } = require('node:os');
for (const name of ['storageService', 'sessionService']) {
  const id = require.resolve('../services/' + name);
  require.cache[id] = { id, filename: id, loaded: true, exports: {} };
}
const config = require('../services/studioVideoConfig');
let submission;
const stop = new Error('No generation submitted');
const flowId = require.resolve('../services/googleFlowMcpService');
require.cache[flowId] = { id: flowId, filename: flowId, loaded: true, exports: { generate: async (options, files) => { submission = {options, files}; throw stop; } } };
const mediaId = require.resolve('../services/studioMediaService');
require.cache[mediaId] = { id: mediaId, filename: mediaId, loaded: true, exports: { remoteImage: async (url, name) => ({url, name}), contactSheet: async (urls, name) => ({urls, name}) } };
const video = require('../services/studioVideoService');

test('Approved Balance #1 retains complete text, silent landscape settings, and source', async () => {
  process.env.STUDIO_TEMPLATE_STORE = path.join(await mkdtemp(path.join(tmpdir(), 'lp-approved-')), 'templates.json');
  const templates = require('../services/studioTemplateService');
  const options = await templates.resolve({tier:'budget',generationMode:'balance',scene:'sculpted-romance',subjectMode:'solo',outputType:'video',sound:true});
  assert.equal(options.templateId, 'BUDGET_BALANCE_01');
  assert.equal(options.prompt, fs.readFileSync(path.join(__dirname,'../assets/budget-balance-01/prompt.txt'),'utf8').trim());
  assert.ok(options.prompt.length > 10000);
  assert.equal(options.sound, false);
  assert.equal(options.duration, 10);
  assert.equal(options.aspectRatio, '16:9');
  assert.equal(options.referenceVideoRole, 'inspiration');
  assert.ok(options.musicPath.endsWith('music.m4a'));
  assert.ok(fs.statSync(options.musicPath).size > 0);
  assert.match(options.prompt,/retain the reference setting/);
  assert.ok(fs.statSync(options.sourceVideoPath).size > 0);
  const angles=['front','detail','side','back','dupatta','blouse'];
  const refs = [{role:'bride',url:'test:bride'},...angles.map((angle,i)=>({role:'dress '+angle,url:'test:dress-'+i}))];
  await assert.rejects(video.render('dry-approved',options,{references:refs}),e=>e===stop);
  assert.equal(submission.files.length,5);
  assert.equal(submission.options.extendedReferences,true);
  assert.equal(submission.files[1].urls.length,6);
  assert.equal(submission.options.sourceVideoPath, options.sourceVideoPath);
  assert.match(submission.options.prompt,/cinematic inspiration only/);
  assert.doesNotMatch(submission.options.prompt,/authoritative source for motion/);
  const publicValue = await templates.publicConfig();
  const approved = publicValue.budgetScenes.find(scene=>scene.id==='sculpted-romance');
  assert.equal(approved.category,'pre-wedding');
  assert.equal(approved.subjects.solo.templateNumber,1);
  assert.equal(approved.subjects.solo.hasReferenceVideo,true);
  assert.equal(approved.subjects.solo.sourceVideoPath,undefined);
  assert.equal(publicValue.budgetSpeedScenes.some(scene=>scene.subjects.solo.templateId==='BUDGET_SPEED_01'),false);
});
test('Solo fashion template now has a photos-only Speed variant and still rejects a couple', () => {
  const speed = config.resolve({tier:'budget',generationMode:'speed',scene:'sculpted-romance'});
  assert.equal(speed.sourceVideoPath,null);
  assert.ok(speed.referenceImagePaths.length);
  assert.throws(()=>config.resolve({tier:'budget',generationMode:'balance',scene:'sculpted-romance',subjectMode:'couple'}),/Bride only/);
});
