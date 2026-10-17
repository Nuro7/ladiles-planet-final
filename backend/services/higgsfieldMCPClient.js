/**
 * higgsfieldMCPClient.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MCP client that authenticates via OAuth (Path B) — uses the user's existing
 * app.higgsfield.ai consumer subscription credits instead of separate
 * developer-cloud billing.
 *
 * Talks to mcp.higgsfield.ai/mcp using JSON-RPC over HTTPS with Bearer auth.
 * The Bearer token is the access_token obtained from higgsfieldOAuthService.
 *
 * Public methods mirror higgsfieldAPIService for drop-in compatibility:
 *   - generateBridalVideo({ ... })
 *   - getBalance()
 *   - calculateCredits({ ... })
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios       = require('axios');
const oauth       = require('./higgsfieldOAuthService');
const { getPrompt } = require('./bridalScenarioPrompts');

const MCP_URL = 'https://mcp.higgsfield.ai/mcp';

class HiggsfieldMCPClient {

    constructor() {
        this.POLL_INTERVAL_MS  = 5000;
        this.MAX_POLL_ATTEMPTS = 168;    // ~14 min max (some videos need 6-12 min)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CORE — JSON-RPC call to MCP with OAuth Bearer token
    //
    //  IMPORTANT: Higgsfield MCP responds with text/event-stream (SSE), not
    //  plain JSON. We request `responseType: 'text'` and parse the SSE frames
    //  manually — the last `data: {...}` line is the final result.
    // ─────────────────────────────────────────────────────────────────────────
    async _mcpCall(toolName, args = {}) {
        const accessToken = await oauth.getAccessToken();

        const payload = {
            jsonrpc : '2.0',
            id      : Date.now(),
            method  : 'tools/call',
            params  : { name: toolName, arguments: args }
        };

        const res = await axios.post(MCP_URL, payload, {
            headers : {
                'Authorization' : `Bearer ${accessToken}`,
                'Content-Type'  : 'application/json',
                'Accept'        : 'application/json, text/event-stream'
            },
            timeout        : 120000,
            validateStatus : null,
            responseType   : 'text'      // ← SSE/text parsing handled below
        });

        if (res.status === 401) {
            const error = new Error('Higgsfield connection expired. Reconnect the AI Engine before creating.');
            error.code = 'PROVIDER_REQUEST_REJECTED'; throw error;
        }
        if (res.status !== 200) {
            const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            const error = new Error(`Higgsfield MCP HTTP ${res.status}: ${body.slice(0, 400)}`);
            if ([400,403,404,422,429].includes(res.status)) error.code = 'PROVIDER_REQUEST_REJECTED';
            throw error;
        }

        // Parse response — could be SSE (text/event-stream) OR plain JSON
        const raw = String(res.data || '');
        let data;
        if (raw.includes('data: ') || (res.headers?.['content-type'] || '').includes('event-stream')) {
            // SSE: collect all "data: ..." lines, use the LAST one with a final result
            const dataLines = raw.split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('data:'));
            if (!dataLines.length) {
                throw new Error('SSE response had no data lines: ' + raw.slice(0, 200));
            }
            // Use the last data line (final message)
            const lastLine = dataLines[dataLines.length - 1].replace(/^data:\s*/, '');
            try { data = JSON.parse(lastLine); }
            catch (e) { throw new Error('SSE data JSON parse failed: ' + e.message); }
        } else {
            // Plain JSON fallback
            try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; }
            catch (e) { throw new Error('Response not JSON: ' + raw.slice(0, 200)); }
        }

        if (data.error) {
            throw new Error(`MCP error: ${JSON.stringify(data.error)}`);
        }

        // MCP result shapes:
        //   1. result.structuredContent  → preferred, already parsed
        //   2. result.content[0].text     → JSON-encoded string
        //   3. result                     → raw fallback
        const r = data.result;
        if (r?.isError) {
            const message = r.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') || 'Higgsfield rejected the tool request.';
            const error = new Error(message); error.code = 'PROVIDER_REQUEST_REJECTED'; throw error;
        }
        if (r?.structuredContent) return r.structuredContent;
        const text = r?.content?.[0]?.text;
        if (text) {
            try { return JSON.parse(text); } catch { return { text }; }
        }
        return r;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ACCOUNT
    // ─────────────────────────────────────────────────────────────────────────
    async getBalance() {
        const r = await this._mcpCall('balance');
        // Higgsfield returns { error: "Something went wrong" } as a HTTP-200
        // payload when the OAuth token is partially-degraded (refresh token
        // rejected). Treat that as a hard failure so the controller can fall
        // back instead of forwarding the error to the UI as a balance value.
        if (r?.error) {
            throw new Error(`Higgsfield balance unavailable: ${r.error}. Reconnect at /api/higgsfield-oauth/start`);
        }
        return r;
    }

    async listModels() {
        return await this._mcpCall('models_explore', {
            action: 'list', type: 'video', input: 'image', limit: 20
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REAL COST PREFLIGHT — asks Higgsfield for the EXACT cost before generating.
    //  Uses get_cost: true flag — no actual job is submitted, no credits spent.
    //  This returns the authoritative number Higgsfield will charge.
    // ─────────────────────────────────────────────────────────────────────────
    async getRealCost({ model = 'seedance-2.0-fast', duration = 5, resolution = '720p', mode = 'fast', multiShot = true, sound = true }) {
        const mcpModel = this._mcpModelId(model);
        const placeholderImg = 'https://placehold.co/1024x768.jpg';
        const medias = this._buildMedias(mcpModel, placeholderImg, placeholderImg);

        const params = this._normalizeParams(mcpModel, {
            model        : mcpModel,
            prompt       : 'preview',
            duration     : Math.max(4, Math.min(15, Number(duration) || 5)),
            aspect_ratio : '16:9',
            medias,
            get_cost     : true,    // ← preflight, no generation
            count        : 1
        }, { resolution, mode, sound });

        const res = await this._mcpCall('generate_video', { params });

        // Higgsfield returns { cost: { credits, credits_exact }, adjustments: {...} }
        if (res?.cost?.credits != null) {
            return {
                credits        : res.cost.credits_exact || res.cost.credits,
                credits_rounded: res.cost.credits,
                adjustments    : res.adjustments || {},
                source         : 'higgsfield'
            };
        }
        if (res?.error) throw new Error(res.error);
        throw new Error('Cost preflight returned no credits');
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FALLBACK COST CALCULATOR — formula used when preflight fails / no OAuth
    // ─────────────────────────────────────────────────────────────────────────
    calculateCredits({ duration = 10, resolution = '720p', mode = 'fast', multiShot = true, sound = true }) {
        let cps = 1.0;
        if (resolution === '720p')  cps *= 1.0;
        if (resolution === '1080p') cps *= 2.0;
        if (resolution === '4K')    cps *= 6.0;
        if (mode === 'std')         cps *= 1.3;
        if (multiShot)              cps *= 1.1;
        if (sound)                  cps *= 1.05;
        return Math.round(duration * cps * 10) / 10;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  GENERATE VIDEO — drop-in replacement for higgsfieldAPIService method
    //
    //  NOTE: Higgsfield MCP accepts HTTPS URLs directly in medias[].value,
    //  so we skip the presigned-URL upload dance entirely and just pass the
    //  Supabase image URLs straight through.
    // ─────────────────────────────────────────────────────────────────────────
    async generateBridalVideo({
        brideImageUrl,
        dressImageUrl,
        scenario      = 'stage_entry',
        customPrompt  = '',
        sessionId     = '',
        // Default to seedance-2.0-fast — supports multi-reference (bride + dress)
        // Kling 3.0 only takes one start_image which loses dress detail
        model         = 'seedance-2.0-fast',
        duration      = 10,
        resolution    = '720p',
        mode          = 'fast',
        multiShot     = true,
        sound         = true
    }) {
        if (!brideImageUrl) throw new Error('brideImageUrl is required');
        if (!dressImageUrl) throw new Error('dressImageUrl is required');

        const mcpModel = this._mcpModelId(model);
        console.log(`\n[${sessionId}] 🎬 [MCP] model=${mcpModel} duration=${duration}s res=${resolution}`);

        // 1. Resolve prompt
        const promptCfg = getPrompt(scenario, customPrompt);

        // 2. Build medias[] — roles depend on model.
        //    For seedance_2_0 → both get role 'image' (multi-reference works natively)
        //    For kling3_0 / others → bride is start_image (single-ref), dress merged into prompt
        //    Additionally, scenarios may have hidden style-anchor reference images that
        //    we append to medias[] for stronger style consistency (e.g., Outdoor scenario).
        //    The raw Supabase URLs are then imported into Higgsfield (→ media_ids)
        //    because generate_video no longer accepts HTTPS URLs in medias[].value.
        const medias = await this._resolveMediaIds(
            this._buildMedias(mcpModel, brideImageUrl, dressImageUrl, promptCfg.referenceImages),
            sessionId
        );

        // 3. Submit generation — params wrapper per Higgsfield schema.
        //    Different models accept different param options. We normalize
        //    UI-facing values (fast/std) → model-specific values per server schema.
        const params = this._normalizeParams(mcpModel, {
            model        : mcpModel,
            prompt       : promptCfg.prompt,
            duration,
            aspect_ratio : '16:9',
            medias,
            count        : 1
        }, { resolution, mode, sound });

        console.log(`[${sessionId}] 📤 MCP generate_video payload:`,
            JSON.stringify({ model: mcpModel, mediasCount: medias.length, ...params, medias: undefined, prompt: undefined }));

        let job;
        try {
            job = await this._submitVideoJob(params, sessionId);
        } catch (err) {
            // Reword common gating errors (plan/credits) into a clear single line.
            if (/requires.*plan|out of credits|insufficient|upgrade/i.test(err.message || '')) {
                throw new Error(this._friendlyError(err.message, mcpModel));
            }
            throw err;
        }

        // Higgsfield can return a business-logic error in the result body
        // (e.g. "Fetch failed (400) for <url>", "Requires basic plan or higher")
        // even with HTTP 200 success.
        if (job?.error) {
            throw new Error(this._friendlyError(job.error, mcpModel));
        }
        // Some plan-gated errors come back as plain text in content[0].text → { text: '...' }
        if (job?.text && /requires.*plan|out of credits|upgrade|insufficient/i.test(job.text)) {
            throw new Error(this._friendlyError(job.text, mcpModel));
        }

        // Verified shape from live test:
        //   { results: [ { id, type, status, model, params, results: {...} } ] }
        const firstResult = job?.results?.[0];
        const jobId = firstResult?.id
                   || job?.job_id
                   || job?.id;

        if (!jobId) {
            console.error(`[${sessionId}] ⚠️ generate_video response had no recognizable job ID. Raw response:`);
            console.error(JSON.stringify(job, null, 2));
            // If the raw body mentions a plan-gating message, surface that instead.
            const blob = JSON.stringify(job);
            if (/requires.*plan|out of credits|upgrade|insufficient/i.test(blob)) {
                throw new Error(this._friendlyError(blob, mcpModel));
            }
            throw new Error('generate_video returned no job ID. Response: ' + blob.slice(0, 400));
        }
        console.log(`[${sessionId}] ⏳ Job ${jobId} — initial status: ${firstResult?.status} — polling...`);

        // 4. Poll until ready
        const videoUrl = await this._pollJob(jobId, sessionId);

        return {
            videoUrl,
            duration,
            resolution,
            model,
            jobId,
            scenario,
            scenarioLabel : promptCfg.scenarioLabel,
            creditsUsed   : this.calculateCredits({ duration, resolution, mode, multiShot, sound }),
            generatedAt   : new Date().toISOString(),
            via           : 'mcp+oauth'
        };
    }

    // Turn raw Higgsfield error strings into a clear, single-line message
    // the UI can show. The most common gating errors map to "needs upgrade".
    _friendlyError(raw, mcpModel) {
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        const modelLabel = ({
            kling3_0             : 'Motion AI (Kling 3.0)',
            cinematic_studio_3_0 : 'Cinema Studio',
        })[mcpModel] || mcpModel;
        if (/requires.*basic plan|requires.*plus plan|requires.*plan or higher/i.test(text)) {
            return `${modelLabel} needs a Higgsfield Plus plan. Switch to Cinematic AI to use your free credits, or upgrade at higgsfield.ai/pricing.`;
        }
        if (/out of credits|insufficient/i.test(text)) {
            return `Not enough Higgsfield credits to run ${modelLabel}. Top up your plan at higgsfield.ai/pricing, or pick Cinematic AI.`;
        }
        return `Higgsfield: ${text.slice(0, 300)}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  IMAGE GENERATION — bridal fashion poster generation
    //
    //  Uses Higgsfield image models that accept multiple `image` role references
    //  (bride + dress) and produce a single high-resolution still suitable for
    //  use as a marketing/poster asset.
    //
    //  Supported model IDs (mapped from friendly names):
    //    nano-banana       → nano_banana       (budget)
    //    nano-banana-pro   → nano_banana_2     (ultimate quality)
    //    chatgpt-image     → gpt_image_2       (OpenAI GPT Image 2)
    // ─────────────────────────────────────────────────────────────────────────
    _mcpImageModelId(name) {
        const map = {
            'nano-banana'      : 'nano_banana',
            'nano-banana-pro'  : 'nano_banana_2',
            'chatgpt-image'    : 'gpt_image_2',
            'gpt-image'        : 'gpt_image_2',
        };
        return map[name] || name;
    }

    // Normalize image params per model — each accepts a different set of
    // resolution/quality fields. Maps our UI's friendly tier name to what
    // each model actually accepts.
    //
    //   nano_banana_2  / nano_banana_flash → resolution: 1k | 2k | 4k
    //   gpt_image_2                         → resolution: 1k | 2k | 4k
    //                                         quality   : low | medium | high
    //   nano_banana                         → (no params)
    _normalizeImageParams(mcpModel, baseParams, ui) {
        const out = { ...baseParams };
        const { quality, resolution } = ui;

        if (mcpModel === 'nano_banana_2' || mcpModel === 'nano_banana_flash') {
            if (resolution) out.resolution = resolution; // 1k / 2k / 4k
            return out;
        }
        if (mcpModel === 'gpt_image_2') {
            if (resolution) out.resolution = resolution;
            if (quality)    out.quality    = quality;
            return out;
        }
        // nano_banana / others — minimal params, server uses defaults
        return out;
    }

    // Preflight cost via get_cost: true. No credits consumed. The server
    // refuses any image preflight when it has 0 plans (degraded OAuth state),
    // in which case getRealImageCost throws and the caller falls back to a
    // simple formula.
    async getRealImageCost({ model, aspectRatio = '3:4', quality = 'medium', resolution = '1k' }) {
        const mcpModel = this._mcpImageModelId(model);
        const placeholderImg = 'https://placehold.co/1024x1280.jpg';
        const params = this._normalizeImageParams(mcpModel, {
            model        : mcpModel,
            prompt       : 'preview',
            aspect_ratio : aspectRatio,
            medias       : [{ role: 'image', value: placeholderImg }],
            get_cost     : true,
            count        : 1,
        }, { quality, resolution });

        const res = await this._mcpCall('generate_image', { params });
        if (res?.cost?.credits != null) {
            return {
                credits         : res.cost.credits_exact || res.cost.credits,
                credits_rounded : res.cost.credits,
                source          : 'higgsfield',
            };
        }
        if (res?.error) throw new Error(res.error);
        throw new Error('Image cost preflight returned no credits');
    }

    // Local formula fallback when preflight fails (e.g. degraded OAuth).
    // Rough numbers based on Higgsfield's current pricing per generation.
    calculateImageCredits({ model, quality = 'medium', resolution = '1k' }) {
        const m = this._mcpImageModelId(model);
        let cost = 1.0;
        if (m === 'nano_banana')      cost = 1.5;
        if (m === 'nano_banana_2')    cost = resolution === '4k' ? 8 : resolution === '2k' ? 4 : 2.5;
        if (m === 'gpt_image_2') {
            const r = { '1k': 1, '2k': 2, '4k': 4 }[resolution] || 1;
            const q = { low: 0.7, medium: 1, high: 1.6 }[quality] || 1;
            cost = 3 * r * q;
        }
        return Math.round(cost * 10) / 10;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  GENERATE IMAGE — bridal poster generation with bride + dress references
    //
    //  Returns: { imageUrl, model, aspectRatio, jobId, generatedAt, ... }
    // ─────────────────────────────────────────────────────────────────────────
    async generateImage({
        brideImageUrl,
        dressImageUrl,
        referenceImages = [],
        prompt,
        sessionId    = '',
        model        = 'nano-banana-pro',
        aspectRatio  = '3:4',
        quality      = 'medium',
        resolution   = '1k',
    }) {
        if (!brideImageUrl) throw new Error('brideImageUrl is required');
        if (!prompt || prompt.trim().length < 5) {
            throw new Error('prompt is required (min 5 chars)');
        }

        const mcpModel = this._mcpImageModelId(model);
        console.log(`\n[${sessionId}] 🖼️  [Image] model=${mcpModel} aspect=${aspectRatio} res=${resolution} quality=${quality}`);

        // medias[]: bride is always present; dress is appended if provided.
        // Both use the generic `image` role — every supported image model
        // accepts this for multi-reference.
        const medias = [{ role: 'image', value: brideImageUrl }];
        if (dressImageUrl) medias.push({ role: 'image', value: dressImageUrl });
        for (const url of [...new Set(referenceImages)].filter(url => url && url !== brideImageUrl && url !== dressImageUrl)) {
            medias.push({ role: 'image', value: url });
        }
        // Import URLs → media_ids (generate_image no longer accepts raw URLs).
        const importedMedias = await this._resolveMediaIds(medias, sessionId);

        const params = this._normalizeImageParams(mcpModel, {
            model        : mcpModel,
            prompt       : prompt.trim(),
            aspect_ratio : aspectRatio,
            medias        : importedMedias,
            count        : 1,
        }, { quality, resolution });

        console.log(`[${sessionId}] 📤 Image payload:`,
            JSON.stringify({ model: mcpModel, mediasCount: medias.length, ...params, medias: undefined, prompt: undefined }));

        let job;
        try {
            job = await this._mcpCall('generate_image', { params });
        } catch (err) {
            if (/requires.*plan|out of credits|insufficient|upgrade/i.test(err.message || '')) {
                throw new Error(this._friendlyError(err.message, mcpModel));
            }
            throw err;
        }
        if (job?.error) throw new Error(this._friendlyError(job.error, mcpModel));

        // Image responses are usually synchronous — the URL may be in
        //   results[0].results.rawUrl   (most providers)
        //   results[0].rawUrl
        //   results[0].url
        const first = job?.results?.[0];
        const imageUrl = first?.results?.rawUrl
                      || first?.results?.url
                      || first?.results?.image_url
                      || first?.rawUrl
                      || first?.url;

        // If we got an immediate URL, return now. Otherwise treat it as a
        // job and poll via job_display (same flow as videos).
        if (imageUrl) {
            console.log(`[${sessionId}] ✅ Image ready (synchronous): ${imageUrl.slice(-60)}`);
            return {
                imageUrl,
                model,
                aspectRatio,
                resolution,
                quality,
                jobId      : first?.id || null,
                generatedAt: new Date().toISOString(),
                via        : 'mcp+oauth',
            };
        }

        const jobId = first?.id || job?.job_id || job?.id;
        if (!jobId) {
            console.error(`[${sessionId}] ⚠️ generate_image had no URL or job ID. Raw:`);
            console.error(JSON.stringify(job, null, 2));
            throw new Error('generate_image returned no URL or job ID');
        }

        console.log(`[${sessionId}] ⏳ Image job ${jobId} — polling...`);
        const polledUrl = await this._pollJob(jobId, sessionId, 'image');
        return {
            imageUrl   : polledUrl,
            model,
            aspectRatio,
            resolution,
            quality,
            jobId,
            generatedAt: new Date().toISOString(),
            via        : 'mcp+oauth',
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EXTEND VIDEO — generates a new clip that visually starts from a given
    //  frame URL (typically the last frame of an existing video). Higgsfield
    //  has no native "extend" model, so this is start_image-based continuation.
    //
    //  Works for all models that accept a single start_image role:
    //    seedance_2_0, kling3_0, cinematic_studio_3_0, kling2_6, etc.
    // ─────────────────────────────────────────────────────────────────────────
    async extendVideo({
        startFrameUrl,
        brideImageUrl,    // ← NEW: original bride reference for face identity lock
        dressImageUrl,    // ← NEW: original dress reference for outfit lock
        prompt,
        sessionId  = '',
        model      = 'seedance-2.0-fast',
        duration   = 5,
        resolution = '720p',
        mode       = 'fast',
        sound      = true,
    }) {
        if (!startFrameUrl) throw new Error('startFrameUrl is required for extend');
        if (!prompt || prompt.trim().length < 5) {
            throw new Error('Extension prompt is required (min 5 chars)');
        }

        const mcpModel = this._mcpModelId(model);
        const clampedDuration = Math.max(4, Math.min(15, Number(duration) || 5));

        console.log(`\n[${sessionId}] 🎞️  [Extend] model=${mcpModel} duration=${clampedDuration}s starting from frame: ${startFrameUrl.slice(-60)}`);
        if (brideImageUrl) console.log(`[${sessionId}]    + bride identity ref: ${brideImageUrl.slice(-50)}`);
        if (dressImageUrl) console.log(`[${sessionId}]    + dress outfit ref:   ${dressImageUrl.slice(-50)}`);

        // medias[] strategy depends on the model:
        //
        //   SEEDANCE (supports multi-reference): DROP start_image entirely.
        //     When start_image is present, the model locks the face to that
        //     frame's face crop — which is often motion-blurred or at a
        //     non-frontal angle — causing face drift on the extension.
        //     Instead pass everything as `image` role with the bride
        //     reference DUPLICATED for stronger identity weighting:
        //       [image: bride, image: bride, image: dress, image: last_frame]
        //     The model uses the bride photo as canonical face and the last
        //     frame as a soft "scene continuation" hint.
        //     The slight visual seam at the join is masked by ffmpeg concat.
        //
        //   KLING (single ref only): pass last frame as start_image — no
        //     other choice. Identity may drift; that's a known Kling limit.
        //
        //   CINEMA STUDIO: same multi-ref strategy as Seedance.
        const supportsMultiRef =
            mcpModel === 'seedance_2_0' ||
            mcpModel.startsWith('seedance') ||
            mcpModel === 'cinematic_studio_3_0';

        const medias = [];
        if (supportsMultiRef) {
            // Duplicate bride reference for stronger identity weighting.
            // Past successful bridal gens with 4 `image` refs preserved face
            // perfectly — we mirror that pattern here.
            if (brideImageUrl) {
                medias.push({ role: 'image', value: brideImageUrl });
                medias.push({ role: 'image', value: brideImageUrl });
            }
            if (dressImageUrl) medias.push({ role: 'image', value: dressImageUrl });
            // Last frame as a generic image reference — NOT start_image —
            // so it informs scene/pose without overriding identity.
            medias.push({ role: 'image', value: startFrameUrl });
        } else {
            // Kling / single-ref fallback
            medias.push({ role: 'start_image', value: startFrameUrl });
        }

        // Wrap the user's continuation prompt with an aggressive identity-
        // preservation block. Explicitly references the bride/dress photos by
        // their position in medias[] so the model knows which is the
        // canonical identity source vs the continuity hint.
        const hasBrideRef = supportsMultiRef && brideImageUrl;
        const hasDressRef = supportsMultiRef && dressImageUrl;
        const continuationPrompt = `${prompt.trim()}

============================================
ABSOLUTE IDENTITY LOCK — HIGHEST PRIORITY
============================================
${hasBrideRef ? `THE BRIDE'S FACE MUST EXACTLY MATCH THE FIRST REFERENCE IMAGE.
That photo is the canonical, locked face — match it pixel-perfect:
- same exact face shape
- same exact eyes
- same exact nose
- same exact lips
- same exact jawline
- same exact skin tone
- same exact hairline and hair colour
- same exact body proportions

DO NOT generate a different woman.
DO NOT morph the face.
DO NOT beautify or alter facial structure.
DO NOT use ANY other face — only the face in the first reference image.

If the start frame face and the reference photo face disagree, the REFERENCE PHOTO WINS.`
: 'Preserve bride identity perfectly — same face, eyes, lips, jawline, skin tone, hair as the previous shot. NO face morph, NO identity drift, NO different bride.'}

${hasDressRef ? `THE LEHENGA / DUPATTA / JEWELRY MUST EXACTLY MATCH THE DRESS REFERENCE IMAGE.
Preserve every embroidery thread, colour, dupatta drape, blouse stitching, and jewelry placement IDENTICALLY.`
: 'Preserve the bridal outfit perfectly — identical lehenga, dupatta, jewelry as the previous shot. NO outfit redesign.'}

============================================
SCENE CONTINUITY
============================================
The final reference (start frame) shows the LAST MOMENT of the previous clip — pick up the camera angle, pose, lighting, and venue from EXACTLY that position, then continue evolving naturally based on the user direction above.

Same wedding venue, same warm cinematic color grade, same crowd / decor / atmosphere.

NO scene jump. NO lighting reset. NO new location. NO new bride. NO new outfit.`;

        // Import URLs → media_ids (generate_video no longer accepts raw URLs).
        const importedMedias = await this._resolveMediaIds(medias, sessionId);

        const params = this._normalizeParams(mcpModel, {
            model        : mcpModel,
            prompt       : continuationPrompt,
            duration     : clampedDuration,
            aspect_ratio : '16:9',
            medias        : importedMedias,
            count        : 1,
        }, { resolution, mode, sound });

        console.log(`[${sessionId}] 📤 Extend payload:`,
            JSON.stringify({ model: mcpModel, duration: clampedDuration, mediasCount: medias.length, ...params, medias: undefined, prompt: undefined }));

        let job;
        try {
            job = await this._submitVideoJob(params, sessionId);
        } catch (err) {
            if (/requires.*plan|out of credits|insufficient|upgrade/i.test(err.message || '')) {
                throw new Error(this._friendlyError(err.message, mcpModel));
            }
            throw err;
        }
        if (job?.error) throw new Error(this._friendlyError(job.error, mcpModel));

        const jobId = job?.results?.[0]?.id || job?.job_id || job?.id;
        if (!jobId) {
            throw new Error('Extend returned no job ID. Response: ' + JSON.stringify(job).slice(0, 300));
        }
        console.log(`[${sessionId}] ⏳ Extend job ${jobId} — polling...`);

        const videoUrl = await this._pollJob(jobId, sessionId);

        return {
            videoUrl,
            duration   : clampedDuration,
            resolution,
            model,
            jobId,
            via        : 'mcp+oauth+extend',
            generatedAt: new Date().toISOString(),
        };
    }

    // Map our friendly model names → Higgsfield MCP model_id values (verified live)
    // NOTE: "Grok Imagine 1.5" is a Higgsfield model (visible in the Higgsfield
    // model list). Its model_id follows Higgsfield's convention (kling3_0,
    // seedance_2_0, veo3_1 …) → 'grok_imagine_1_5'. If the live id differs,
    // override via env HIGGSFIELD_GROK_MODEL_ID — no code change needed.
    // Confirm the live id with: node scripts/diagnose-models.js
    _mcpModelId(name) {
        const map = {
            'kling-3.0'         : 'kling3_0',
            'kling-2.6'         : 'kling2_6',
            'kling-2.1'         : 'kling2_6',
            'seedance-2.0'      : 'seedance_2_0',
            'seedance-2.0-fast' : 'seedance_2_0',        // diff is mode, not id
            'grok-imagine-1.5'  : process.env.HIGGSFIELD_GROK_MODEL_ID || 'grok_imagine_1_5',
            'cinema-studio'     : 'cinematic_studio_3_0', // Higgsfield's flagship video
            'cinema-studio-v2'  : 'cinematic_studio_video_v2',
            'marketing-studio'  : 'marketing_studio_video',
            'veo-3.1'           : 'veo3_1',
            'veo-3.1-lite'      : 'veo3_1_lite'
        };
        return map[name] || name;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Per-model param normalization — each Higgsfield model has different
    //  allowed values for `mode`, `resolution`, etc. Mapping the UI's simple
    //  fast/std + 720p/1080p/4K choices to what each model actually accepts.
    //
    //  Verified from models_explore + live error messages:
    //    seedance_2_0   → mode: [std, fast]              resolution: [480p, 720p, 1080p]
    //    kling3_0       → mode: [std, pro, 4k]           sound: [on, off]   (no resolution)
    //    higgsfield_soul → (minimal params)
    //    cinematic_studio_3_0 → (model-specific)
    // ─────────────────────────────────────────────────────────────────────────
    _normalizeParams(mcpModel, baseParams, ui) {
        const out = { ...baseParams };
        const { resolution, mode, sound } = ui;

        if (mcpModel === 'seedance_2_0' || mcpModel.startsWith('seedance')) {
            // Seedance accepts both
            if (resolution) out.resolution = resolution;       // 480p / 720p / 1080p
            if (mode === 'fast' || mode === 'std') out.mode = mode;
            return out;
        }

        if (mcpModel === 'kling3_0' || mcpModel.startsWith('kling')) {
            // Kling 3.0: mode encodes quality tier — map UI value
            //   UI 'fast' (lowest)  → std  (cheap)
            //   UI 'std'  (better)  → pro  (premium)
            //   resolution 4K       → 4k mode
            let klingMode = 'std';
            if (resolution === '4K')        klingMode = '4k';
            else if (mode === 'std')        klingMode = 'pro';
            else if (mode === 'fast')       klingMode = 'std';
            out.mode = klingMode;
            // Sound is a top-level Kling param: 'on' | 'off'
            out.sound = sound === false ? 'off' : 'on';
            // Kling has no resolution param — quality is implicit in mode
            return out;
        }

        if (mcpModel.startsWith('grok')) {
            // Higgsfield "Grok Imagine 1.5" — image-to-video, 720p, 1–15s. It has
            // no fast/std quality tier like Seedance, so we pass the resolution
            // (720p) through and let the engine default the rest.
            if (resolution) out.resolution = resolution;   // 720p
            out.sound = sound === false ? 'off' : 'on';
            return out;
        }

        // Default: send minimum params, let server use defaults
        return out;
    }

    // Build the medias[] array based on which model is selected.
    // Different models accept different role names per Higgsfield's schema.
    //
    // @param scenarioRefs - extra style-anchor reference images from the
    //                       scenario config (hidden from the client UI).
    //                       These get appended for models that support
    //                       multi-reference (seedance only).
    _buildMedias(mcpModel, brideUrl, dressUrl, scenarioRefs = []) {
        // seedance_2_0 supports multi-reference with role 'image'
        // Both bride + dress + extra anchors passed as references
        if (mcpModel === 'seedance_2_0' || mcpModel.startsWith('seedance')) {
            const out = [
                { role: 'image', value: brideUrl },
                { role: 'image', value: dressUrl }
            ];
            // Append scenario reference images (style anchors).
            // Limit to 4 extras to avoid hitting any per-request media cap.
            const validRefs = (scenarioRefs || []).filter(u => u && u.startsWith('http')).slice(0, 4);
            for (const refUrl of validRefs) {
                out.push({ role: 'image', value: refUrl });
            }
            return out;
        }
        // Kling — accepts start_image only. We use the bride as the start frame.
        // Dress style must be described in the prompt because Kling can't take
        // a separate dress reference image. Scenario refs are ignored for Kling.
        if (mcpModel.startsWith('kling')) {
            return [{ role: 'start_image', value: brideUrl }];
        }
        // Grok Imagine — image-to-video from a single start frame (bride).
        // Dress style is carried by the prompt, same as Kling.
        if (mcpModel.startsWith('grok')) {
            return [{ role: 'start_image', value: brideUrl }];
        }
        // Higgsfield Cinema Studio / Veo — fall back to start_image only
        return [{ role: 'start_image', value: brideUrl }];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  MEDIA IMPORT — Higgsfield's generate_* tools NO LONGER accept raw HTTPS
    //  URLs in params.medias. Each source URL must first be imported via the
    //  media_import_url tool, which uploads it into Higgsfield storage and
    //  returns a confirmed media_id — that ID is what generation expects in
    //  medias[].value. We cache per-URL (as a Promise, so concurrent imports
    //  of the same URL — e.g. the bride ref duplicated for identity weighting —
    //  collapse to a single upload).
    // ─────────────────────────────────────────────────────────────────────────
    async _importMediaUrl(url, sessionId = '') {
        if (!this._mediaIdCache) this._mediaIdCache = new Map();
        if (this._mediaIdCache.has(url)) return this._mediaIdCache.get(url);

        const p = (async () => {
            const r = await this._mcpCall('media_import_url', { url, type: 'image' });
            const id = r?.media_id || r?.id || r?.mediaId
                    || r?.media?.id || r?.result?.media_id
                    || (Array.isArray(r?.medias)  ? r.medias[0]?.id  : null)
                    || (Array.isArray(r?.results) ? r.results[0]?.id : null);
            if (!id) {
                throw new Error('media_import_url returned no media_id. Response: ' + JSON.stringify(r).slice(0, 300));
            }
            console.log(`[${sessionId}] 📥 imported media ${String(url).slice(0, 60)}… → ${id}`);
            return id;
        })();

        this._mediaIdCache.set(url, p);
        try {
            return await p;
        } catch (e) {
            this._mediaIdCache.delete(url);   // never cache a failed import
            throw e;
        }
    }

    // Walk a medias[] array and replace every raw http(s) URL value with an
    // imported Higgsfield media_id. Values that are already IDs pass through
    // untouched. Imports run in parallel (deduped by the per-URL cache).
    async _resolveMediaIds(medias, sessionId = '') {
        return Promise.all((medias || []).map(async (m) => {
            const v = m?.value;
            if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
                return { ...m, value: await this._importMediaUrl(v, sessionId) };
            }
            return m;
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PRESET GUARD — Higgsfield's MCP intercepts prompts that happen to
    //  resemble a built-in preset (e.g. "Earth zoom out"): instead of starting
    //  a job it returns { notice: { type:'preset_recommendation', ... } } and
    //  waits to be told "use the preset" or "generate literally". The studio
    //  always wants a LITERAL generation from the user's own prompt, so we
    //  transparently retry once with declined_preset_id set, which forces it.
    // ─────────────────────────────────────────────────────────────────────────
    async _submitVideoJob(params, sessionId = '') {
        let job = await this._mcpCall('generate_video', { params });
        const notice = job?.notice;
        if (notice?.type === 'preset_recommendation') {
            const declinedId = notice?.data?.retry_literal_with?.declined_preset_id
                            || notice?.data?.preset?.id;
            if (!declinedId) throw new Error('Higgsfield suggested a preset without a retry identifier. No automatic retry was submitted.');
            console.log(`[${sessionId}] ↩️  Preset "${notice?.data?.preset?.name}" suggested — retrying literal (declined_preset_id=${declinedId})`);
            job = await this._mcpCall('generate_video', {
                params: { ...params, declined_preset_id: declinedId }
            });
        }
        const rejection = require('./higgsfieldSubmission').rejection(job);
        if (rejection) throw rejection;
        return job;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Poll using job_display — verified schema: { ids: [<uuid>...] }
    //  Response: { results: [ { id, status, results: { rawUrl, ... } } ] }
    //  Status values seen: 'pending', 'in_progress', 'completed', 'failed', 'nsfw'
    // ─────────────────────────────────────────────────────────────────────────
    //  job_display returns state=undefined (API shape changed), so we poll
    //  show_generations instead — confirmed working: it returns each item with
    //  { id, status:'completed', results:{ rawUrl } }. We find our job by id.
    //  @param kind - 'video' or 'image' (which generation list to search)
    async _pollJob(jobId, sessionId = '', kind = 'video') {
        const {itemsFrom, failureFor} = require('./higgsfieldJobState');
        let connectionFailures = 0;
        for (let attempt = 1; attempt <= this.MAX_POLL_ATTEMPTS; attempt++) {
            let found = null;
            try {
                const res = await this._mcpCall('show_generations', { type: kind, size: 30 });
                const items = itemsFrom(res);
                found = items.find(it => String(it.id) === String(jobId));
                if (!found) {
                    const direct = await this._mcpCall('job_display', {id:jobId});
                    found = itemsFrom(direct).find(it => String(it.id) === String(jobId));
                }
                connectionFailures = 0;
            } catch (e) {
                if (++connectionFailures >= 3) throw new Error('Unable to check Higgsfield generation status. The request is saved; check or recover it before retrying to avoid duplicate charges.');
            }

            const failure = failureFor(found);
            if (failure) throw failure;
            const state = String(found?.status || found?.state || '').toLowerCase().trim();
            const elapsed = (attempt * this.POLL_INTERVAL_MS / 1000).toFixed(0);
            console.log(`[${sessionId}] ⏳ poll state=${state || 'pending'} (${elapsed}s)`);

            if (found && ['completed', 'succeeded', 'succeed', 'done', 'success'].includes(state)) {
                const url = found.results?.rawUrl
                         || found.results?.url
                         || found.results?.video_url
                         || found.results?.image_url
                         || found.results?.minUrl;
                if (url) return url;
            }
            if (['failed', 'error', 'cancelled'].includes(state)) {
                throw new Error(`Job failed: ${found?.error || found?.error_message || 'unknown'}`);
            }
            if (state === 'nsfw') {
                throw new Error('Job rejected as NSFW (credits refunded)');
            }
            await new Promise(r => setTimeout(r, this.POLL_INTERVAL_MS));
        }
        throw new Error(`Job ${jobId} timed out after ${this.MAX_POLL_ATTEMPTS * this.POLL_INTERVAL_MS / 1000}s`);
    }

    // ── History sync ────────────────────────────────────────────
    // Fetches the user's generation history from Higgsfield MCP so that
    // content created directly on higgsfield.ai also appears in Ladies Planet.

    async fetchGenerationHistory(limit = 100) {
        try {
            // type: 'video' filters to video generations only
            const result = await this._mcpCall('show_generations', { type: 'video', size: limit });
            return result?.items || result?.generations || result?.data || [];
        } catch (err) {
            console.warn('[MCP] fetchGenerationHistory failed:', err.message);
            return [];
        }
    }

    // Image generations live in show_generations with type:'image', NOT in show_medias
    // show_medias returns uploaded reference images (media library), not generated images
    async fetchImageGenerationHistory(limit = 100) {
        try {
            const result = await this._mcpCall('show_generations', { type: 'image', size: limit });
            return result?.items || result?.generations || result?.data || [];
        } catch (err) {
            console.warn('[MCP] fetchImageGenerationHistory failed:', err.message);
            return [];
        }
    }

    async fetchMediaLibrary(limit = 100) {
        try {
            const result = await this._mcpCall('show_medias', { size: limit });
            return result?.medias || result?.items || result?.data || [];
        } catch (err) {
            console.warn('[MCP] fetchMediaLibrary failed:', err.message);
            return [];
        }
    }
}

module.exports = new HiggsfieldMCPClient();
