require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const templates = require('../services/studioTemplateService');
const config = require('../services/studioVideoConfig');
async function main() {
  const registry = fs.readFileSync(path.join(__dirname, '../../frontend/src/studio/templateTestStatus.js'), 'utf8');
  const confirmed = new Map([...registry.matchAll(/'budget:balance:video:solo:([^']+)':\s*\{\s*version:\s*(\d+),\s*status:\s*'passed'/g)].map(match => [match[1], Number(match[2])]));
  const blocks = [
    'LADIES PLANET — CURRENT PASSED QUICK VIDEO PROMPTS',
    'Exported: ' + new Date().toISOString(),
    'Quick model: Gemini Omni Flash 1.1 (gemini_omni_flash_1_1), Higgsfield MCP, edit mode.',
    'Premium: Seedance 2.5. Flagship: Higgsfield Genjutsu.',
    'PASS PROVENANCE: The five Quick prompt passes were reported by the owner in Google Flow. They do not certify successful Higgsfield model tests.',
    'These are the currently assembled template prompts, including the shared jewellery section. No rewriting or shortening was performed. Check the per-prompt character count against the chosen provider input limit.',
  ];
  let count = 0;
  for (const scene of config.budgetScenes) {
    const recipe = await templates.recipe(scene.id, 'solo', 'budget', 'balance');
    if (confirmed.get(recipe.templateId) !== recipe.version) continue;
    const options = await templates.resolve({ tier: 'budget', generationMode: 'balance', workflow: 'preset',
      scene: scene.id, videoScene: scene.id, subjectMode: 'solo', videoSubjectMode: 'solo', outputType: 'video', resolution: '720p' });
    count++;
    blocks.push('\n' + '='.repeat(72), `${count}. ${recipe.label || scene.label}`, `Template ID: ${recipe.templateId}`,
      `Scene: ${scene.id}`, `Version: ${recipe.version}`, 'Status: PASSED — owner-reported Google Flow test',
      `Duration: ${options.duration}s | Reference frame: ${options.aspectRatio}`,
      `Active platform motion reference: ${options.sourceVideoPath}`,
      `Music: ${options.musicPath}`, `Characters in current assembled prompt: ${options.prompt.length}`,
      'PROMPT START\n', options.prompt, '\nPROMPT END');
  }
  const output = path.join(__dirname, '../assets/testing-video-libraries/Quick - All Passed Video Prompts.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, blocks.join('\n\n'), 'utf8');
  console.log(JSON.stringify({ output, prompts: count, bytes: fs.statSync(output).size }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
