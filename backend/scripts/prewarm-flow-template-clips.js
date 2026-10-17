// No generation is submitted: this only saves static template video references
// in the currently open Flow project for later Balance requests.
const { existsSync } = require('node:fs');
const config = require('../services/studioVideoConfig');
const flow = require('../services/googleFlowMcpService');
const cache = require('../services/flowTemplateClipCache');

async function main() {
  const state = await flow.status(true);
  if (!state.ready) throw new Error(state.message);
  const sources = [...new Set([config.budgetScenes, config.premiumBalanceScenes]
    .flatMap(scenes => scenes.flatMap(scene => Object.values(scene.subjects)))
    .map(recipe => recipe.sourceVideoPath)
    .filter(source => source && existsSync(source)))];
  console.log(`Saving ${sources.length} unique template clips in the current Flow project.`);
  for (const [index, source] of sources.entries()) {
    const saved = await cache.resolve(source);
    console.log(`${index + 1}/${sources.length}: ${saved.name}`);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
