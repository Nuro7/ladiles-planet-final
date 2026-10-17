#!/usr/bin/env node
// Offline Google Flow / Gemini Omni Flash preflight for a numbered template.
// Uses the vendored MIT-licensed google-flow-scripting-skill validator.
// Never contacts Flow, uploads assets, spends credits, or edits live prompts.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('../services/studioVideoConfig');

function option(name, fallback) {
  const index = process.argv.indexOf('--' + name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const tier = option('tier', 'budget');
const mode = option('mode', 'balance');
const number = Number(option('number', '1'));
const strict = process.argv.includes('--strict');
if (!['budget', 'premium'].includes(tier) || !['speed', 'balance'].includes(mode) || !Number.isInteger(number) || number < 1) {
  console.error('Usage: node scripts/audit-flow-template-prompt.js --tier budget|premium --mode speed|balance --number 1 [--strict]');
  process.exit(2);
}

const source = tier === 'budget'
  ? mode === 'speed' ? config.budgetSpeedScenes : config.budgetScenes
  : mode === 'speed' ? config.premiumSpeedScenes : config.premiumBalanceScenes;
const entries = source.flatMap(scene => ['solo', 'couple'].flatMap(subject => {
  const recipe = scene.subjects?.[subject];
  return recipe?.available !== false && recipe?.templateId && recipe?.prompt
    ? [{ scene, subject, recipe }] : [];
}));
const selected = entries[number - 1];
if (!selected) {
  console.error(`No ${tier} ${mode} prompt ${number}. Available: 1-${entries.length}.`);
  process.exit(2);
}

const prefix = tier === 'budget' ? mode === 'speed' ? 1 : 2 : mode === 'speed' ? 3 : 4;
const { scene, subject } = selected;
const savedPath = path.join(__dirname, '..', 'data', 'studio-templates.json');
const saved = fs.existsSync(savedPath) ? JSON.parse(fs.readFileSync(savedPath, 'utf8')).recipes || {} : {};
const overrideKey = `${tier === 'budget' ? 'budget:' : ''}${scene.id}:${subject}`;
const recipe = { ...selected.recipe, ...saved[overrideKey] };
const prompt = String(recipe.prompt || '').trim();
const sourcePath = recipe.sourceVideoPath || null;
const warnings = [];
if (mode === 'balance' && (!sourcePath || !fs.existsSync(sourcePath))) warnings.push('Balance reference video is missing locally.');
if (mode === 'speed' && !recipe.referenceImagePaths?.length && !recipe.referenceImagePath) warnings.push('Speed scene images are missing from the recipe.');
if (/the platform adds the saved original music/i.test(prompt)) warnings.push('Prompt contains backend music-finishing instructions that do not belong in the Flow composer.');
if (!['16:9', '9:16'].includes(recipe.aspectRatio)) warnings.push('Template aspect ratio is not a supported native Flow ratio.');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-flow-prompt-'));
try {
  const promptPath = path.join(temp, 'prompt.txt');
  fs.writeFileSync(promptPath, prompt + '\n', 'utf8');
  const validator = path.join(__dirname, '..', 'tools', 'google-flow-scripting-skill', 'scripts', 'validate.py');
  const python = process.env.PYTHON || 'python';
  const result = spawnSync(python, [validator, promptPath,
    '--segment-length', String(recipe.duration || 10), '--surface', 'flow', '--model', 'omni-flash',
    '--mode', mode === 'balance' ? 'video-edit' : 'references-to-video',
    '--beat-mode', 'off', '--no-require-audio', '--json'], { encoding: 'utf8' });
  if (result.error || !result.stdout) {
    console.error(result.error?.message || result.stderr || 'Prompt validator did not produce a result.');
    process.exitCode = 2;
  } else {
    const audit = JSON.parse(result.stdout);
    console.log(JSON.stringify({
      template: `${prefix}.${number}`, tier, mode, scene: scene.id, subject,
      templateId: recipe.templateId, version: recipe.version, duration: recipe.duration,
      aspectRatio: recipe.aspectRatio, sourceVideoPath: sourcePath,
      warnings, validator: audit,
    }, null, 2));
    if (strict && (warnings.length || result.status !== 0)) process.exitCode = 1;
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
