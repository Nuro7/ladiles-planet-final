/**
 * diagnose-models.js
 * ────────────────────────────────────────────────────────────────────
 * Runs the same MCP preflight that aiWorkflowService runs for each
 * model the studio offers. Surfaces server errors per model.
 *
 * Uses get_cost: true so NO credits are spent.
 *
 * Usage:  node scripts/diagnose-models.js
 * ────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const client = require('../services/higgsfieldMCPClient');
const { getPrompt } = require('../services/bridalScenarioPrompts');

const TEST_BRIDE = 'https://placehold.co/1024x768/jpg';
const TEST_DRESS = 'https://placehold.co/1024x768/jpg';

const MODELS = [
    { uiLabel: 'Cinematic AI',     id: 'seedance-2.0-fast', mode: 'fast' },
    { uiLabel: 'Cinematic AI Pro', id: 'seedance-2.0',      mode: 'std'  },
    { uiLabel: 'Grok Imagine 1.5', id: 'grok-imagine-1.5',  mode: 'std'  },
    { uiLabel: 'Motion AI',        id: 'kling-3.0',          mode: 'fast' },
    { uiLabel: 'Cinema Studio',    id: 'cinema-studio',      mode: 'std'  },
];

(async () => {
    console.log('\n🔬 Diagnosing every model the UI offers...\n');

    for (const m of MODELS) {
        const mcpId = client._mcpModelId(m.id);
        const promptCfg = getPrompt('stage_entry', '');

        const medias = client._buildMedias(mcpId, TEST_BRIDE, TEST_DRESS, promptCfg.referenceImages);
        const params = client._normalizeParams(mcpId, {
            model       : mcpId,
            prompt      : promptCfg.prompt,
            duration    : 10,
            aspect_ratio: '16:9',
            medias,
            get_cost    : true,
            count       : 1
        }, { resolution: '720p', mode: m.mode, sound: true });

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Model:    ${m.uiLabel} → ${mcpId}`);
        console.log(`Mode:     ${m.mode}`);
        console.log(`Medias:   ${medias.length} item(s) — roles: ${medias.map(x=>x.role).join(', ')}`);
        console.log(`Param keys: ${Object.keys(params).join(', ')}`);

        try {
            const res = await client._mcpCall('generate_video', { params });
            if (res?.error) {
                console.log(`❌ SERVER ERROR: ${JSON.stringify(res.error)}`);
            } else if (res?.cost?.credits != null) {
                console.log(`✅ OK · credits = ${res.cost.credits} (preflight)`);
            } else {
                console.log(`⚠️  Unexpected response shape:`, JSON.stringify(res).slice(0, 200));
            }
        } catch (err) {
            console.log(`💥 THROWN: ${err.message}`);
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('Done. If a model shows ❌ or 💥, that\'s the broken one.\n');
    process.exit(0);
})().catch(err => {
    console.error('💥 Diagnose crashed:', err.message);
    process.exit(1);
});
