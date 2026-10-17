/**
 * higgsfieldAPIService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HIGGSFIELD CLOUD API — REST Client (replaces MCP version)
 *
 * Base URL: https://platform.higgsfield.ai
 * Auth: Authorization: Key {api_key}:{api_key_secret}
 *
 * Endpoint patterns:
 *   POST /bytedance/seedance/v1/pro/image-to-video
 *   POST /kling-video/v3/pro/image-to-video
 *   POST /higgsfield-ai/soul/standard
 *
 * Required env vars:
 *   HIGGSFIELD_API_KEY      — from cloud.higgsfield.ai
 *   HIGGSFIELD_API_SECRET   — generated alongside the key
 *
 * This service supports the full Settings Configurator UX:
 *   - duration (5/10/15)
 *   - resolution (720p/1080p/4K)
 *   - mode (fast/std)
 *   - multi-shot toggle
 *   - sound toggle
 *   - custom prompt
 *   - preset scenarios
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const { getPrompt } = require('./bridalScenarioPrompts');

class HiggsfieldAPIService {

    constructor() {
        this.BASE_URL    = 'https://platform.higgsfield.ai';
        this.API_KEY     = process.env.HIGGSFIELD_API_KEY;
        this.API_SECRET  = process.env.HIGGSFIELD_API_SECRET;

        // Polling configuration
        this.POLL_INTERVAL_MS  = 5000;
        this.MAX_POLL_ATTEMPTS = 48;  // ~4 min max

        // Model → endpoint mapping (verified live against platform.higgsfield.ai)
        this.MODEL_ENDPOINTS = {
            'kling-3.0'         : '/kling-video/v3.0/pro/image-to-video',   // ✅ verified
            'kling-2.1'         : '/kling-video/v2.1/pro/image-to-video',   // ✅ verified
            'higgsfield-soul'   : '/higgsfield-ai/soul/standard',           // ✅ verified
            'higgsfield-dop'    : '/higgsfield-ai/dop/standard'              // ✅ verified
            // TODO: Seedance / Veo exact endpoint paths need verification — Higgsfield docs vary
        };

        this.DEFAULT_MODEL = 'kling-3.0';

        this.isSimulationMode = !this.API_KEY || !this.API_SECRET ||
                                this.API_KEY === 'your_higgsfield_api_key_here';

        if (this.isSimulationMode) {
            console.warn('⚠️  [HiggsfieldAPI] Credentials not set — SIMULATION MODE');
        } else {
            console.log('✅  [HiggsfieldAPI] Connected to', this.BASE_URL);
        }
    }

    _authHeader() {
        return `Key ${this.API_KEY}:${this.API_SECRET}`;
    }

    /**
     * Calculate estimated credit cost before generation.
     * Used by the frontend to show live cost preview as user changes settings.
     */
    calculateCredits({
        duration   = 10,
        resolution = '720p',
        mode       = 'fast',
        multiShot  = true,
        sound      = true
    }) {
        let costPerSec = 1.0;

        if (resolution === '720p')  costPerSec *= 1.0;
        if (resolution === '1080p') costPerSec *= 2.0;
        if (resolution === '4K')    costPerSec *= 6.0;

        if (mode === 'std') costPerSec *= 1.3;
        if (multiShot)      costPerSec *= 1.1;
        if (sound)          costPerSec *= 1.05;

        return Math.round(duration * costPerSec * 10) / 10;
    }

    /**
     * Main: Generate a bridal video.
     *
     * @param {Object} input
     *   brideImageUrl  string  — Supabase public URL (bride photo)
     *   dressImageUrl  string  — Supabase public URL (dress photo)
     *   scenario       string  — preset key OR 'custom'
     *   customPrompt   string  — required when scenario === 'custom'
     *   sessionId      string  — for logging
     *   model          string  — 'kling-3.0' (default) | 'seedance-2.0-fast' | etc.
     *   duration       number  — 5 | 10 | 15
     *   resolution     string  — '720p' | '1080p' | '4K'
     *   mode           string  — 'fast' | 'std'
     *   multiShot      bool    — multi-shot generation
     *   sound          bool    — built-in audio (Kling 3.0)
     */
    async generateBridalVideo(input) {
        if (this.isSimulationMode) return this._simulateGeneration(input);

        const {
            brideImageUrl,
            dressImageUrl,
            scenario = 'stage_entry',
            customPrompt = '',
            sessionId = '',
            model = this.DEFAULT_MODEL,
            duration = 10,
            resolution = '720p',
            mode = 'fast',
            multiShot = true,
            sound = true
        } = input;

        if (!brideImageUrl) throw new Error('brideImageUrl is required');
        if (!dressImageUrl) throw new Error('dressImageUrl is required');

        const endpoint = this.MODEL_ENDPOINTS[model];
        if (!endpoint) {
            throw new Error(`Unknown model: ${model}. Valid: ${Object.keys(this.MODEL_ENDPOINTS).join(', ')}`);
        }

        console.log(`\n[${sessionId}] 🎬 [HiggsfieldAPI] ${model} | ${duration}s | ${resolution} | ${mode}`);

        // 1. Resolve prompt (preset OR custom)
        const promptConfig = getPrompt(scenario, customPrompt);
        console.log(`[${sessionId}] 📝 Scenario: ${promptConfig.scenarioLabel}`);

        // 2. Build request body
        const body = {
            image_url      : brideImageUrl,      // primary reference (bride identity)
            reference_url  : dressImageUrl,      // secondary reference (dress)
            prompt         : promptConfig.prompt,
            negative_prompt: promptConfig.negativePrompt,
            duration       : duration,
            aspect_ratio   : '16:9',
            resolution     : resolution,
            mode           : mode,
            multi_shot     : multiShot,
            generate_audio : sound
        };

        // 3. Submit generation request
        const url = this.BASE_URL + endpoint;
        console.log(`[${sessionId}] 🚀 POST ${url}`);

        const submitRes = await axios.post(url, body, {
            headers: {
                'Authorization' : this._authHeader(),
                'Content-Type'  : 'application/json',
                'Accept'        : 'application/json'
            },
            timeout: 30000
        });

        const jobId = submitRes.data?.job_id || submitRes.data?.id;
        if (!jobId) {
            throw new Error(`[HiggsfieldAPI] No job ID in response: ${JSON.stringify(submitRes.data)}`);
        }

        console.log(`[${sessionId}] ⏳ Job: ${jobId} — polling...`);

        // 4. Poll for completion
        const videoUrl = await this._pollJob(jobId, sessionId);

        return {
            videoUrl,
            duration,
            resolution,
            model,
            jobId,
            scenario,
            scenarioLabel : promptConfig.scenarioLabel,
            creditsUsed   : this.calculateCredits({ duration, resolution, mode, multiShot, sound }),
            generatedAt   : new Date().toISOString()
        };
    }

    async _pollJob(jobId, sessionId = '') {
        // Status endpoint pattern (verify with actual Higgsfield response)
        const statusUrl = `${this.BASE_URL}/jobs/${jobId}`;

        for (let attempt = 1; attempt <= this.MAX_POLL_ATTEMPTS; attempt++) {
            const res = await axios.get(statusUrl, {
                headers: { 'Authorization': this._authHeader() },
                timeout: 15000,
                validateStatus: null
            });

            if (res.status !== 200) {
                console.warn(`[${sessionId}] ⚠️  Poll HTTP ${res.status}, retrying...`);
                await new Promise(r => setTimeout(r, this.POLL_INTERVAL_MS));
                continue;
            }

            const status = res.data?.status || res.data?.state;
            const elapsed = (attempt * this.POLL_INTERVAL_MS / 1000).toFixed(0);
            console.log(`[${sessionId}] ⏳ ${status} (${elapsed}s elapsed)`);

            if (status === 'completed' || status === 'succeeded') {
                const url = res.data.video_url || res.data.output_url || res.data.result?.video_url;
                if (!url) throw new Error(`Completed but no video URL: ${JSON.stringify(res.data)}`);
                return url;
            }

            if (status === 'failed' || status === 'error') {
                throw new Error(`Job failed: ${res.data.error || 'unknown'}`);
            }

            if (status === 'nsfw') {
                throw new Error('Job rejected — content flagged NSFW (credits refunded)');
            }

            await new Promise(r => setTimeout(r, this.POLL_INTERVAL_MS));
        }

        throw new Error(`Job ${jobId} timed out after ${this.MAX_POLL_ATTEMPTS * this.POLL_INTERVAL_MS / 1000}s`);
    }

    /**
     * Get current account balance + plan info.
     */
    async getBalance() {
        if (this.isSimulationMode) return { credits: 950, plan: 'plus (sim)' };

        const res = await axios.get(`${this.BASE_URL}/account/balance`, {
            headers: { 'Authorization': this._authHeader() },
            timeout: 10000
        });

        return res.data;
    }

    _simulateGeneration(input) {
        console.log('⚠️  [HiggsfieldAPI] SIMULATION — returning mock video');
        return Promise.resolve({
            videoUrl     : 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
            duration     : input.duration || 10,
            resolution   : input.resolution || '720p',
            model        : input.model || 'kling-3.0',
            jobId        : `sim-${Date.now()}`,
            scenario     : input.scenario || 'stage_entry',
            scenarioLabel: 'Simulation',
            creditsUsed  : this.calculateCredits(input),
            generatedAt  : new Date().toISOString(),
            simulated    : true
        });
    }
}

module.exports = new HiggsfieldAPIService();
