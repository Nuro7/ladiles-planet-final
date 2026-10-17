// Local export only: no network, media uploads or AI generation.
const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ quiet: true });
const config = require('../services/studioVideoConfig');
const templates = require('../services/studioTemplateService');

async function main() {
  const destination = path.resolve(__dirname, '../../output/manual-testing/ALL-VIDEO-PROMPTS-BY-MODE.txt');
  const jewellery = path.resolve(__dirname, '../assets/global/bridal-ornaments-reference.png');
  const groups = [
    { name: 'QUICK', tier: 'budget', storage: 'budget', scenes: config.budgetScenes, model: 'Wan 3.0 Prime', quality: '480p (locked)' },
    { name: 'PREMIUM', tier: 'premium', storage: 'shared', scenes: config.premiumBalanceScenes, model: 'Wan 3.0 Prime (default) / Seedance 2.5 Edit', quality: '480p / 720p / 1080p' },
    { name: 'FLAGSHIP', tier: 'flagship', storage: 'shared', scenes: config.flagshipScenes, model: 'Genjutsu (hf_mult_motion_control)', quality: '480p / 720p / 1080p' },
  ];
  const entries = [];
  for (const group of groups) {
    for (const scene of group.scenes) {
      for (const [subject, base] of Object.entries(scene.subjects || {})) {
        if (subject !== (group.tier === 'flagship' ? 'couple' : 'solo')) continue;
        const recipe = await templates.recipe(scene.id, subject, group.storage, 'balance');
        if (!recipe.prompt?.trim()) continue;
        const active = recipe.available !== false && !recipe.comingSoon;
        let effective = recipe.prompt;
        if (active) effective = (await templates.resolve({ tier: group.tier, workflow: 'preset', generationMode: 'balance', outputType: 'video', scene: scene.id, subjectMode: subject, model: group.tier === 'flagship' ? 'hf_mult_motion_control' : 'wan3_0_prime' })).prompt;
        entries.push({ group, scene, subject, recipe, active, prompt: effective, stored: recipe.prompt, base });
      }
    }
  }
  const line = '='.repeat(84);
  const sections = [
    'LADIES PLANET — VIDEO PROMPTS FOR MANUAL TESTING',
    `Exported: ${new Date().toISOString()}`,
    '',
    'CONTENTS: Current Quick, Premium and Flagship template prompts, including stored',
    'Coming soon cards. Removed templates and historical generation jobs are not the',
    'current template catalog and are not included. Quick/Premium duplicates are kept',
    'under their respective modes so you can test each route independently.',
    '',
    'HOW TO TEST',
    '1. Choose the model listed for the mode in Higgsfield.',
    '2. Attach the listed reference video, your bride photo and all views of ONE dress.',
    '3. Attach the jewellery sheet listed below. For Flagship also attach the groom photo.',
    '4. Copy only the text between BEGIN PROMPT and END PROMPT.',
    '5. Match the listed duration/frame where the model allows it. Seedance 2.5 Edit',
    '   follows the source clip duration/frame. Wan Prime uses the selected output settings.',
    '6. Record your result as PASS or FAIL for the exact model and settings tested.',
    '',
    'Availability is not proof of successful output on the newly selected model.',
    'Prompt wording and any old model names inside it are preserved, not rewritten.',
    'An additional runtime ornaments section, if present, is included in the effective prompt.',
    'Original music paths are listed separately: a prompt cannot attach or transfer music.',
    `GLOBAL JEWELLERY SHEET: ${jewellery}`,
    '',
    'INDEX',
    ...entries.map((entry, i) => `${String(i + 1).padStart(2, '0')}. ${entry.group.name} | ${entry.recipe.label || entry.scene.label} | ${entry.active ? 'ACTIVE' : 'COMING SOON / DISABLED'}`),
  ];
  for (const [i, entry] of entries.entries()) {
    const { group, scene, subject, recipe } = entry;
    const source = recipe.sourceVideoPath || recipe.sourceVideoUrl || recipe.sourceAspectRatioPath || '(No source video configured)';
    sections.push('', line, `${String(i + 1).padStart(2, '0')}. ${group.name} — ${recipe.label || scene.label}`, line,
      `Video / card name: ${recipe.label || scene.label}`,
      `Scene ID: ${scene.id}`,
      `Template ID: ${recipe.templateId || '(not assigned)'}`,
      `Template number: ${recipe.templateNumber ?? '(not assigned)'}`,
      `Version: ${recipe.version ?? '(not assigned)'}`,
      `Availability: ${entry.active ? 'ACTIVE' : 'COMING SOON / DISABLED — stored prompt only'}`,
      `Stored approval status: ${recipe.status || '(not recorded)'}`,
      `Subject: ${subject === 'couple' ? 'Bride and groom' : 'Bride only'}`,
      `Model selection: ${group.model}`,
      `Video quality: ${group.quality}`,
      `Reference duration: ${recipe.duration || '(not recorded)'} seconds`,
      `Reference aspect ratio: ${recipe.aspectRatio || '(not recorded)'}`,
      `Reference video location: ${source}`,
      `Reference source filename: ${recipe.sourceFilename || path.basename(source)}`,
      `Separate music location: ${recipe.musicPath || '(none)'}`,
      `Platform uses reference-video audio: ${recipe.useSourceAudio ? 'Yes' : 'No'}`,
      `AI audio setting: ${recipe.sound === false ? 'Off' : recipe.sound === true ? 'On' : 'Default'}`,
      `Jewellery sheet: ${jewellery}`,
      `Prompt length: ${entry.prompt.length} characters`,
      '', 'BEGIN PROMPT', entry.prompt, 'END PROMPT', '',
      'MANUAL TEST RECORD', 'Model: ____________________  Quality: __________  Date: __________',
      'Generation time: __________  Credits: __________  PASS / FAIL: __________',
      'Notes: _________________________________________________________________');
  }
  sections.push('', line, 'CUSTOM MODE', line,
    'Custom mode has no inbuilt template prompt. Type or paste your own prompt.',
    'Video models: Wan 3.0 Prime (default) or Seedance 2.5 Edit.',
    'Wan Prime duration: 2–30 seconds. Seedance Edit requires a reference clip.',
    'Quality: 480p / 720p / 1080p. Portrait or landscape where the model allows it.',
    'Image generation in all modes uses GPT Image 2, medium, 1K or 2K.', '');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, sections.join('\r\n'), 'utf8');
  const saved = await fs.readFile(destination, 'utf8');
  if (saved.split('BEGIN PROMPT').length - 1 !== entries.length + 1) throw new Error('Export section count mismatch.');
  console.log(JSON.stringify({ file: destination, prompts: entries.length, active: entries.filter(item => item.active).length, bytes: Buffer.byteLength(saved) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
