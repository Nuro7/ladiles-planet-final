/**
 * mcp-healthcheck.js — exercises every MCP code path our app uses,
 * reports which are healthy and which are degraded. No credits spent.
 */
require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const oauth = require('../services/higgsfieldOAuthService');
const mcp   = require('../services/higgsfieldMCPClient');

const TOKEN_FILE = path.join(__dirname, '..', 'data', 'higgsfield-oauth-tokens.json');

const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => console.log(`❌ ${m}`);
const warn = (m) => console.log(`⚠️  ${m}`);
const head = (m) => console.log(`\n━━━━━━ ${m} ━━━━━━`);

(async () => {
    // 1. OAuth token status
    head('OAuth tokens');
    try {
        const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        const ageMin = Math.round((Date.now() - t.obtained_at) / 60000);
        const remainMin = Math.round((t.expires_at - Date.now()) / 60000);
        ok(`access_token present (obtained ${ageMin} min ago, expires in ${remainMin} min)`);
        if (!t.refresh_token) warn('no refresh_token stored');
        else ok('refresh_token stored');
    } catch (e) {
        fail(`token file unreadable: ${e.message}`);
        return;
    }

    // 2. Live access_token call
    head('Access token retrieval');
    try {
        const tok = await oauth.getAccessToken();
        ok(`getAccessToken returned ${tok.length}-char token`);
    } catch (e) {
        fail(`getAccessToken failed: ${e.message}`);
    }

    // 3. MCP tools (read-only)
    head('MCP read tools');
    const tools = [
        ['balance', {}],
        ['show_plans_and_credits', {}],
    ];
    for (const [name, args] of tools) {
        try {
            const r = await mcp._mcpCall(name, args);
            if (r?.error)          fail(`${name}: server returned error → ${r.error}`);
            else if (r?.text && /requires.*plan|out of credits|something went wrong/i.test(r.text))
                                    fail(`${name}: ${r.text}`);
            else                   ok(`${name}: ${JSON.stringify(r).slice(0, 120)}`);
        } catch (e) {
            fail(`${name} threw: ${e.message.slice(0, 200)}`);
        }
    }

    // 4. Video cost preflight (per model)
    head('Video cost preflight');
    const videoModels = [
        ['Cinematic AI (Seedance Fast)', 'seedance-2.0-fast', { mode: 'fast', resolution: '720p' }],
        ['Cinematic AI Pro (Seedance)',  'seedance-2.0',      { mode: 'std',  resolution: '720p' }],
        ['Motion AI (Kling 3.0)',        'kling-3.0',          { mode: 'fast', resolution: '720p' }],
        ['Cinema Studio',                'cinema-studio',      { mode: 'std',  resolution: '720p' }],
    ];
    for (const [label, model, params] of videoModels) {
        try {
            const r = await mcp.getRealCost({ model, duration: 5, ...params, multiShot: true, sound: true });
            ok(`${label}: ${r.credits} credits (source: ${r.source})`);
        } catch (e) {
            fail(`${label}: ${e.message.slice(0, 160)}`);
        }
    }

    // 5. Image cost preflight (per model)
    head('Image cost preflight');
    const imageModels = [
        ['Nano Banana',     'nano-banana',     { resolution: '1k' }],
        ['Nano Banana Pro', 'nano-banana-pro', { resolution: '1k' }],
        ['ChatGPT Image',   'chatgpt-image',   { resolution: '1k', quality: 'medium' }],
    ];
    for (const [label, model, params] of imageModels) {
        try {
            const r = await mcp.getRealImageCost({ model, aspectRatio: '3:4', ...params });
            ok(`${label}: ${r.credits} credits (source: ${r.source})`);
        } catch (e) {
            fail(`${label}: ${e.message.slice(0, 160)}`);
        }
    }

    console.log('\n✨ healthcheck complete\n');
    process.exit(0);
})().catch((e) => {
    console.error('💥 healthcheck crashed:', e.message);
    process.exit(1);
});
