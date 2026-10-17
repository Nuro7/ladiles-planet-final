/**
 * klingService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * OFFICIAL KLING AI API — Dedicated Service Layer
 * Base URL  : https://api-singapore.klingai.com/v1
 *
 * Endpoints covered:
 *   POST   /v1/images/kolors-virtual-try-on       → Virtual Try-On (VTON)
 *   GET    /v1/images/kolors-virtual-try-on/:id   → Poll VTON
 *   POST   /v1/images/editing/expand              → Image Canvas Expand (Step 3)
 *   GET    /v1/images/editing/expand/:id          → Poll Expand Task
 *   POST   /v1/videos/omni-video                  → Omni Multi-Shot Video (Kling v3-omni)
 *   GET    /v1/videos/omni-video/:id              → Poll Omni Video Task
 *   POST   /v1/videos/add-sound                   → Add wedding music
 *   GET    /v1/videos/add-sound/:id               → Poll Add-Sound Task
 *
 * KEY PRODUCTION RULES (from official docs + developer reports):
 *   1. JWT refreshed on EVERY request (30-min TTL, HS256)
 *   2. Images MUST be public HTTPS URLs — Kling fetches them directly
 *   3. VTON risk control failures are common — use exponential backoff retry
 *   4. CDN URLs expire — download and store to Supabase immediately
 *   5. kling-v2-0 does NOT support cfg_scale/duration/mode — use v1-6 or v3
 *   6. Video tasks take 2–8 min each — never poll synchronously in an HTTP handler
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios          = require('axios');
const jwt            = require('jsonwebtoken');
const imageValidator = require('../utils/imageValidator');

class KlingService {
    constructor() {
        this.BASE_URL   = 'https://api-singapore.klingai.com/v1';
        this.accessKey1  = process.env.KLING_API_KEY;
        this.secretKey1  = process.env.KLING_SECRET_KEY;
        this.accessKey2  = process.env.KLING_API_KEY_TWO;
        this.secretKey2  = process.env.KLING_SECRET_KEY_TWO;

        // Polling configuration
        this.POLL_INTERVAL_MS  = 8000;   // 8s between polls — reduces Kling rate limiting
        this.MAX_POLL_ATTEMPTS = 113;    // ~15 min max (for video tasks)
        this.VTON_MAX_ATTEMPTS = 75;     // ~10 min max (for VTON / image tasks)

        // VTON retry config — only for actual Kling risk control rejections
        this.VTON_MAX_RETRIES = 3;
        this.VTON_RETRY_BASE_DELAY_MS = 5000;  // 5s, 10s, 20s backoff
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AUTH — Generate a fresh HS256 JWT (30-min TTL) on EVERY call.
    //  Never cache the token — it must be fresh per request.
    // ─────────────────────────────────────────────────────────────────────────
    _generateToken(useSecondKey = false) {
        const accessKey = useSecondKey ? this.accessKey2 : this.accessKey1;
        const secretKey = useSecondKey ? this.secretKey2 : this.secretKey1;

        if (!accessKey || !secretKey) {
            throw new Error(`KLING API keys are missing in .env for ${useSecondKey ? 'Key 2' : 'Key 1'}`);
        }
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss : accessKey,
            exp : now + 1800, // 30 minutes
            nbf : now - 5     // 5s clock skew tolerance
        };
        // Explicit header required by Kling's official JWT spec
        const token = jwt.sign(payload, secretKey, {
            algorithm : 'HS256',
            header    : { alg: 'HS256', typ: 'JWT' }
        });
        console.log(`🔑 [JWT] Generated — iss: ${accessKey} | exp: ${payload.exp} | token: ${token.slice(0, 40)}...`);
        return token;
    }

    // POST headers — includes Content-Type
    _headers(useSecondKey = false) {
        return {
            'Authorization' : `Bearer ${this._generateToken(useSecondKey)}`,
            'Content-Type'  : 'application/json'
        };
    }

    // GET headers — no Content-Type (some Kling servers reject GET with Content-Type)
    _getHeaders(useSecondKey = false) {
        return {
            'Authorization' : `Bearer ${this._generateToken(useSecondKey)}`
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UTILITY — Strip optional `data:image/*;base64,` prefix.
    // ─────────────────────────────────────────────────────────────────────────
    _clean(img) {
        if (!img) return img;
        return img.startsWith('data:image') ? img.split(',')[1] : img;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RETRY WITH EXPONENTIAL BACKOFF
    //  ONLY retries on Kling risk control rejections (code !== 0 on POST).
    //  Does NOT retry on 401, network errors, or poll failures.
    // ─────────────────────────────────────────────────────────────────────────
    async _withRetry(fn, maxRetries = this.VTON_MAX_RETRIES, label = 'Operation') {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;

                // Only retry on explicit Kling risk control or content policy errors
                const isRiskControl = (
                    err.message?.toLowerCase().includes('risk control') ||
                    err.message?.toLowerCase().includes('violation') ||
                    err.message?.toLowerCase().includes('content policy')
                );

                if (!isRiskControl || attempt > maxRetries) {
                    throw err;
                }

                const delayMs = this.VTON_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`⚠️  [${label}] Attempt ${attempt} failed (risk control). Retrying in ${delayMs / 1000}s...`);
                console.warn(`    Reason: ${err.message}`);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
        throw lastError;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SAFE POST — wraps axios.post with full error logging.
    //  Never throws on Kling API errors — returns the response for caller to check.
    // ─────────────────────────────────────────────────────────────────────────
    async _post(path, payload, label = '', retries = 3, useSecondKey = false) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const res = await axios.post(
                `${this.BASE_URL}${path}`,
                payload,
                { headers: this._headers(useSecondKey), timeout: 30000, validateStatus: null }
            );

            if (res.status === 200) return res;

            if (res.status === 401) {
                console.warn(`⚠️  [${label}] POST 401 on attempt ${attempt} — ${JSON.stringify(res.data)}`);
                if (attempt < retries) {
                    console.warn(`⚠️  Waiting 15s then retrying with fresh JWT...`);
                    await new Promise(r => setTimeout(r, 15000));
                    continue;
                }
                throw new Error(`[${label}] Kling authentication failed after ${retries} attempts. Check API keys.`);
            }

            console.error(`❌ [${label}] Kling HTTP ${res.status}: ${JSON.stringify(res.data)}`);
            throw new Error(`[${label}] Kling API returned HTTP ${res.status}: ${JSON.stringify(res.data)}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UNIVERSAL POLLER
    //  Polls any Kling task until succeed / failed / timeout.
    //  Handles 401 gracefully — waits 15s and retries with a fresh JWT.
    // ─────────────────────────────────────────────────────────────────────────
    async _poll(endpoint, extractUrl, maxAttempts = this.MAX_POLL_ATTEMPTS, onProgress = null, useSecondKey = false) {
        let consecutive401s = 0;
        const MAX_CONSECUTIVE_401s = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let res;
            try {
                res = await axios.get(endpoint, {
                    headers        : this._getHeaders(useSecondKey),
                    timeout        : 15000,
                    validateStatus : null
                });
            } catch (networkErr) {
                console.warn(`  ⚠️  [Kling Poll] Network error: ${networkErr.message}. Retrying in 15s...`);
                await new Promise(r => setTimeout(r, 15000));
                continue;
            }

            // 401 — wait and retry, but stop after MAX_CONSECUTIVE_401s
            if (res.status === 401) {
                consecutive401s++;
                console.warn(`  ⚠️  [Kling Poll] 401 (${consecutive401s}/${MAX_CONSECUTIVE_401s}) — ${JSON.stringify(res.data)}`);
                if (consecutive401s >= MAX_CONSECUTIVE_401s) {
                    throw new Error(`Kling polling failed: ${MAX_CONSECUTIVE_401s} consecutive 401s. API key issue or rate limit exceeded.`);
                }
                await new Promise(r => setTimeout(r, 20000));
                continue;
            }
            consecutive401s = 0; // reset on any successful response

            // Other non-200 — log and retry
            if (res.status !== 200) {
                console.warn(`  ⚠️  [Kling Poll] HTTP ${res.status}: ${JSON.stringify(res.data)}. Retrying...`);
                await new Promise(r => setTimeout(r, this.POLL_INTERVAL_MS));
                continue;
            }

            const data = res.data?.data;
            if (!data) throw new Error(`Unexpected Kling response: ${JSON.stringify(res.data)}`);

            const status = data.task_status;
            // Log every poll so user can see progress
            console.log(`  ⏳ [Kling Poll] ${status}  (${(attempt * this.POLL_INTERVAL_MS / 1000).toFixed(0)}s elapsed)`);

            if (status === 'succeed') {
                const url = extractUrl(data);
                if (!url) throw new Error('Kling task succeeded but no URL found in result');
                console.log(`  ✅ [Kling Poll] Completed at attempt ${attempt + 1}`);
                return url;
            }

            if (status === 'failed') {
                const msg = data.task_status_msg || 'unknown reason';
                throw new Error(`Kling task failed: ${msg}`);
            }

            if (onProgress && attempt % 2 === 0) onProgress(attempt);

            await new Promise(r => setTimeout(r, this.POLL_INTERVAL_MS));
        }
        throw new Error(`Kling task timed out after ${maxAttempts * this.POLL_INTERVAL_MS / 1000}s`);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  STEP 2 — VIRTUAL TRY-ON
    //  POST /v1/images/kolors-virtual-try-on
    // ═════════════════════════════════════════════════════════════════════════
    async virtualTryOn({ humanImage, clothImage, outfitType = 'dress', sessionId = '', skipValidation = false }) {
        console.log(`\n[${sessionId}] 👗 [KLING VTON] Starting...`);

        if (!skipValidation) {
            await imageValidator.validateAll({ humanImage, clothImage });
        }

        // Submit task ONCE — only retry on risk control rejection, not on poll failures
        let taskId;
        for (let attempt = 1; attempt <= this.VTON_MAX_RETRIES + 1; attempt++) {
            const payload = {
                model_name  : 'kolors-virtual-try-on-v1-5',
                human_image : this._clean(humanImage),
                cloth_image : this._clean(clothImage),
                vto_type    : outfitType === 'combination' ? 'upper_lower' : 'dress'
            };

            const res = await this._post('/images/kolors-virtual-try-on', payload, 'VTON');

            if (res.data.code === 0) {
                taskId = res.data.data.task_id;
                console.log(`[${sessionId}] 👗 [VTON] Task: ${taskId}`);
                break;
            }

            // Only retry task creation on actual Kling risk control rejection
            if (attempt <= this.VTON_MAX_RETRIES) {
                const delay = this.VTON_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`⚠️  [VTON] Risk control on attempt ${attempt}. Retrying task in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                throw new Error(`VTON failed after ${attempt} attempts: ${res.data.message}`);
            }
        }

        // Poll the single task — no new task created on poll failure
        return await this._poll(
            `${this.BASE_URL}/images/kolors-virtual-try-on/${taskId}`,
            (data) => data.task_result?.images?.[0]?.url,
            this.VTON_MAX_ATTEMPTS
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  STEP 3 — IMAGE EXPAND
    //  POST /v1/images/editing/expand
    //  Takes the VTON output image and expands the canvas outward to fill
    //  the surrounding scene context, making it suitable for 16:9 video.
    //
    //  Expansion ratios (relative to original image dimensions):
    //    left  0.4 — right 0.4 — up 0.3 — down 0.3
    //  These values push a portrait into a near-landscape frame.
    // ═════════════════════════════════════════════════════════════════════════
    async expandImage({ vtonImageUrl, prompt, sessionId = '' }) {
        console.log(`\n[${sessionId}] 🖼️  [KLING ImageExpand] Starting...`);

        await imageValidator.validate(vtonImageUrl, 'vtonImageUrl');

        // Kling expand API requires base64 in the "image" field — raw URLs are rejected.
        // Download from Supabase and convert to base64 before sending.
        console.log(`[${sessionId}] 🖼️  [ImageExpand] Downloading image for base64 conversion...`);
        const imgResponse = await axios.get(vtonImageUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const base64Image = Buffer.from(imgResponse.data).toString('base64');
        console.log(`[${sessionId}] 🖼️  [ImageExpand] Converted — ${Math.round(imgResponse.data.byteLength / 1024)}KB → base64`);

        const payload = {
            image                  : base64Image,
            left_expansion_ratio   : 0.4,
            right_expansion_ratio  : 0.4,
            up_expansion_ratio     : 0.3,
            down_expansion_ratio   : 0.3,
            prompt,
            n                      : 1
        };

        const res = await this._post('/images/editing/expand', payload, 'ImageExpand');

        if (res.data.code !== 0) {
            throw new Error(`[ImageExpand] Kling API error: ${res.data.message}`);
        }

        const taskId = res.data.data.task_id;
        console.log(`[${sessionId}] 🖼️  [ImageExpand] Task: ${taskId}`);

        return await this._poll(
            `${this.BASE_URL}/images/editing/expand/${taskId}`,
            (data) => data.task_result?.images?.[0]?.url,
            this.VTON_MAX_ATTEMPTS
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  LEGACY — IMAGE-TO-VIDEO  (Kling v3 · pro · 16:9)
    //  POST /v1/videos/image2video
    //  NOTE: Superseded by generateOmniVideo(). Kept for fallback only.
    // ═════════════════════════════════════════════════════════════════════════
    async generateShot({
        imageUrl = null,
        prompt,
        negativePrompt = '',
        duration = 15,
        sessionId = '',
        shotLabel = ''
    }) {
        // Quality constants — hard-locked, not overridable by caller
        const MODEL       = 'kling-v3';
        const MODE        = 'pro';
        const ASPECT      = '16:9';
        const CFG_SCALE   = 0.5;

        console.log(`\n[${sessionId}] 🎬 [KLING VideoGen] Shot: ${shotLabel} | ${MODEL} ${MODE} | ${ASPECT} | ${duration}s`);

        if (imageUrl) {
            await imageValidator.validate(imageUrl, `imageUrl[${shotLabel}]`);
        }

        // Prefix every prompt with 4K quality directive so Kling outputs
        // the highest detail render regardless of the scenario prompt content.
        const qualityPrefix = '4K ultra-high definition, photorealistic cinematic quality, sharp detail, professional cinematography. ';
        const finalPrompt   = qualityPrefix + prompt;

        const payload = {
            model_name       : MODEL,
            prompt           : finalPrompt,
            negative_prompt  : negativePrompt,
            duration         : String(duration),
            aspect_ratio     : ASPECT,
            mode             : MODE,
            cfg_scale        : CFG_SCALE,
            external_task_id : `${sessionId}_${shotLabel}`
        };

        // image2video — pass start frame image (expanded canvas from Step 3)
        if (imageUrl) {
            payload.image = this._clean(imageUrl);
        }

        const endpoint = imageUrl ? '/videos/image2video' : '/videos/text2video';
        const res = await this._post(endpoint, payload, `VideoGen[${shotLabel}]`, 3, true);

        if (res.data.code !== 0) {
            throw new Error(`[VideoGen ${shotLabel}] Kling error: ${res.data.message}`);
        }

        const taskId = res.data.data.task_id;
        console.log(`[${sessionId}] 🎬 [VideoGen ${shotLabel}] Task ID: ${taskId} | Poll: /videos/image2video/${taskId}`);

        const pollBase = imageUrl ? 'image2video' : 'text2video';
        return { taskId, endpoint: `${this.BASE_URL}/videos/${pollBase}/${taskId}` };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ROUND-ROBIN MULTI-POLLER
    //  Polls N tasks one at a time in a cycle — never 2 concurrent Kling requests.
    //  5s gap between each individual poll request to stay under rate limit.
    // ─────────────────────────────────────────────────────────────────────────
    async _pollRoundRobin(taskEndpoints, extractUrl, sessionId = '', useSecondKey = false) {
        const n       = taskEndpoints.length;
        const results = new Array(n).fill(null);
        const done    = new Array(n).fill(false);
        const labels  = taskEndpoints.map((_, i) => `Shot${String.fromCharCode(65 + i)}`);
        let totalRounds = 0;
        const MAX_ROUNDS = 150; // ~150 × (n × 5s gap) ≈ 37 min worst case

        let consecutive401s = 0;
        const MAX_CONSECUTIVE_401s = 10; // Stop after 10 consecutive 401s (~5 min wasted)

        while (done.some(d => !d) && totalRounds < MAX_ROUNDS) {
            for (let i = 0; i < n; i++) {
                if (done[i]) continue;

                let res;
                try {
                    res = await axios.get(taskEndpoints[i], {
                        headers        : this._getHeaders(),
                        timeout        : 15000,
                        validateStatus : null
                    });
                } catch (netErr) {
                    console.warn(`  ⚠️  [${labels[i]}] Network error: ${netErr.message}. Will retry.`);
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }

                if (res.status === 401) {
                    consecutive401s++;
                    console.warn(`  ⚠️  [${labels[i]}] 401 (${consecutive401s}/${MAX_CONSECUTIVE_401s}) — Waiting 30s...`);
                    console.warn(`       Kling: ${JSON.stringify(res.data)}`);
                    if (consecutive401s >= MAX_CONSECUTIVE_401s) {
                        throw new Error(`Kling polling aborted — ${MAX_CONSECUTIVE_401s} consecutive 401s. Check API keys or account status.`);
                    }
                    await new Promise(r => setTimeout(r, 30000));
                    continue;
                }

                consecutive401s = 0; // Reset on any successful response

                if (res.status !== 200) {
                    console.warn(`  ⚠️  [${labels[i]}] HTTP ${res.status}. Retrying...`);
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }

                const data   = res.data?.data;
                const status = data?.task_status;
                console.log(`  ⏳ [${labels[i]}] ${status} (round ${totalRounds + 1})`);

                if (status === 'succeed') {
                    const url = extractUrl(data);
                    if (!url) throw new Error(`${labels[i]} succeeded but URL missing`);
                    results[i] = url;
                    done[i]    = true;
                    console.log(`  ✅ [${labels[i]}] Complete!`);
                } else if (status === 'failed') {
                    throw new Error(`${labels[i]} failed: ${data.task_status_msg || 'unknown'}`);
                }

                // 5s gap between each individual poll to avoid simultaneous requests
                if (done.some(d => !d)) {
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            totalRounds++;
        }

        if (results.some(r => r === null)) {
            throw new Error('One or more video shots timed out');
        }
        return results;
    }

    // Fire 3 shot tasks in parallel (POST is fine), then poll round-robin (one at a time).
    // Returns { urls: [A,B,C], taskIds: [idA,idB,idC] }
    async generateMultiShot({ imageUrl, shots, sessionId = '' }) {
        console.log(`\n[${sessionId}] 🎬 [KLING] Submitting 3 shots in parallel...`);

        const tasks = await Promise.all(
            shots.map((shot, i) =>
                this.generateShot({
                    imageUrl,
                    ...shot,
                    sessionId,
                    shotLabel: `Shot${String.fromCharCode(65 + i)}`
                })
            )
        );

        const taskIds     = tasks.map(t => t.taskId);
        const endpoints   = tasks.map(t => t.endpoint);
        const extractUrl  = (data) => data.task_result?.videos?.[0]?.url;

        console.log(`[${sessionId}] 📌 Task IDs: ${taskIds.join(', ')}`);
        console.log(`[${sessionId}] ⏳ Polling round-robin (one request at a time, 5s gap)...`);

        const urls = await this._pollRoundRobin(endpoints, extractUrl, sessionId, true);
        console.log(`[${sessionId}] ✅ All 3 shots complete!`);

        return { urls, taskIds };
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  STEP 2.5 — CREATE BRIDE ELEMENT (identity lock for omni-video)
    //  POST /v1/elements
    //
    //  Uploads the VTON output image as a "bride identity element" in Kling's
    //  element registry. The returned element_id is then passed in the
    //  element_list of generateOmniVideo() so the model locks the bride's
    //  face, skin tone, and body throughout the generated video.
    //
    //  Polling: GET /v1/elements/:taskId until task_status === 'succeed'.
    //  Returns: element_id (string)
    // ═════════════════════════════════════════════════════════════════════════
    async createBrideElement({ imageUrl, sessionId = '' }) {
        console.log(`\n[${sessionId}] 🎭 [KLING Element] Registering VTON result as bride element...`);

        await imageValidator.validate(imageUrl, 'brideElement');

        // ✅ CORRECT endpoint: POST /v1/general/advanced-custom-elements
        // ❌ OLD (404): /v1/images/elements
        const payload = {
            element_name       : 'bride',
            element_description: 'bridal identity',
            reference_type     : 'image_refer',
            element_image_list : {
                frontal_image: imageUrl,
                refer_images : [
                    { image_url: imageUrl },  // same image × 3 = stronger identity reinforcement
                    { image_url: imageUrl },  // Kling treats it as multi-angle confirmation
                    { image_url: imageUrl }   // max 3 allowed per docs
                ]
            }
        };

        // Use second key — element must belong to the video generation account
        const res = await this._post('/general/advanced-custom-elements', payload, 'CreateElement', 3, true);

        if (res.data.code !== 0) {
            throw new Error(`[CreateElement] Kling error: ${res.data.message}`);
        }

        const taskId = res.data.data.task_id;
        console.log(`[${sessionId}] 🎭 [Element] Task: ${taskId} — polling for element_id...`);

        // ✅ CORRECT poll path: GET /v1/general/advanced-custom-elements/{task_id}
        // ✅ CORRECT element_id path: data.task_result.elements[0].element_id
        const elementId = await this._poll(
            `${this.BASE_URL}/general/advanced-custom-elements/${taskId}`,
            (data) => {
                if (data.task_status === 'succeed') {
                    return data.task_result?.elements?.[0]?.element_id || null;
                }
                return null;
            },
            this.VTON_MAX_ATTEMPTS,
            null,
            true
        );

        console.log(`[${sessionId}] 🎭 [Element] Ready — element_id: ${elementId}`);
        return elementId;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  STEP 4 — OMNI VIDEO (Kling v3-omni · pro · 16:9 · 4K quality)
    //  POST /v1/videos/omni-video
    //
    //  Replaces generateShot(). Uses Kling's omni model which supports:
    //    • element_list  — locks bride identity from VTON element
    //    • image_list    — reference images addressable in prompts
    //        image_list[0] → <<<image_1>>> (expanded VTON portrait, start frame)
    //        image_list[1] → <<<image_2>>> (wedding reference style 1)
    //        image_list[2] → <<<image_3>>> (wedding reference style 2)
    //
    //  The caller passes:
    //    elementId   — bride element_id from createBrideElement()
    //    imageList   — [{ image_url }, ...] ordered by <<<image_N>>> index
    //    prompt      — time-stamped multi-shot prompt from scenePrompts
    //    duration    — 5 | 10 | 15 (seconds)
    // ═════════════════════════════════════════════════════════════════════════
    async generateOmniVideo({
        imageList    = [],
        elementList  = [],  // [{ element_id }] — <<<element_1>>> maps to elementList[0]
        videoList    = [],
        prompt       = '',
        multiPrompt  = null,  // [{ index, prompt, duration }] — enables multi_shot mode
        negativePrompt = '',
        duration     = 15,
        sessionId    = ''
    }) {
        const MODEL  = 'kling-v3-omni';
        const MODE   = 'pro';
        const ASPECT = '16:9';

        const isMultiShot = Array.isArray(multiPrompt) && multiPrompt.length > 0;
        console.log(`\n[${sessionId}] 🎬 [KLING OmniVideo] ${MODEL} ${MODE} | ${ASPECT} | ${duration}s | multi_shot: ${isMultiShot} | elements: ${elementList.length}`);

        // Validate all reference image URLs
        for (let i = 0; i < imageList.length; i++) {
            if (imageList[i].image_url) {
                await imageValidator.validate(imageList[i].image_url, `image_list[${i}]`);
            }
        }

        const callbackUrl = process.env.KLING_CALLBACK_URL || '';

        let payload;

        if (isMultiShot) {
            // ── MULTI-SHOT MODE — each shot processed independently
            // <<<element_1>>> re-anchored per shot from element_list[0] = no drift
            // aspect_ratio: 16:9 is valid here (no first_frame conflict)
            payload = {
                model_name      : MODEL,
                multi_shot      : true,
                shot_type       : 'customize',
                prompt          : 'Preserve exact face and outfit of <<<element_1>>> across all shots.',
                multi_prompt    : multiPrompt,  // [{ index, prompt, duration }]
                negative_prompt : negativePrompt,
                duration        : String(duration),
                aspect_ratio    : ASPECT,       // 16:9 — valid with multi_shot (no first_frame)
                mode            : MODE,
                cfg_scale       : 0.8,
                image_list      : imageList,    // VTON url — visual reference (no type/first_frame)
                callback_url    : callbackUrl,
                external_task_id: sessionId
            };
            // Add element_list when element was registered (strongest identity lock)
            if (elementList.length > 0) {
                payload.element_list = elementList;  // <<<element_1>>> maps here
            }
            console.log(`[${sessionId}] 🎬 [OmniVideo] shots: ${multiPrompt.length} | ${multiPrompt.map(s => s.duration + 's').join('+')} | element_list: ${elementList.length}`);
        } else {
            // ── SINGLE-SHOT MODE — fallback when no scenario / multiPrompt
            // Restore quality prefix here — single-shot prompts have headroom under 2500
            const qualityPrefix = '4K ultra-high definition, photorealistic cinematic quality, sharp detail, professional cinematography. ';
            payload = {
                model_name      : MODEL,
                prompt          : qualityPrefix + prompt,
                negative_prompt : negativePrompt,
                duration        : String(duration),
                aspect_ratio    : ASPECT,
                mode            : MODE,
                cfg_scale       : 0.8,
                image_list      : imageList,
                callback_url    : callbackUrl,
                external_task_id: sessionId
            };
            if (elementList.length > 0) {
                payload.element_list = elementList;
            }
        }

        // Only include video_list when provided
        if (videoList.length > 0) {
            payload.video_list = videoList;
        }

        const res = await this._post('/videos/omni-video', payload, 'OmniVideo', 3, true);

        if (res.data.code !== 0) {
            throw new Error(`[OmniVideo] Kling error: ${res.data.message}`);
        }

        const taskId = res.data.data.task_id;
        console.log(`[${sessionId}] 🎬 [OmniVideo] Task ID: ${taskId}`);

        return { taskId, endpoint: `${this.BASE_URL}/videos/omni-video/${taskId}` };
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  STEP 5 — VIDEO EXTEND (optional)
    //  POST /v1/videos/video-extend
    //  GOTCHA: videoId must be the TASK ID from Step 4 (not the video URL)
    // ═════════════════════════════════════════════════════════════════════════
    async extendVideo({ videoId, prompt = '', sessionId = '' }) {
        console.log(`\n[${sessionId}] 📼 [KLING Extend] Task ID: ${videoId}`);

        const res = await this._post('/videos/video-extend', { video_id: videoId, prompt }, 'VideoExtend', 3, true);

        if (res.data.code !== 0) {
            throw new Error(`[VideoExtend] Kling error: ${res.data.message}`);
        }

        const taskId = res.data.data.task_id;
        console.log(`[${sessionId}] 📼 [Extend] Task: ${taskId}`);

        return await this._poll(
            `${this.BASE_URL}/videos/video-extend/${taskId}`,
            (data) => data.task_result?.videos?.[0]?.url,
            this.MAX_POLL_ATTEMPTS,
            null,
            true
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  STEP 6 — ADD WEDDING SOUND
    //  POST /v1/videos/add-sound
    //  GOTCHA: videoId is the TASK ID from Step 4 or Step 5 (not the URL)
    // ═════════════════════════════════════════════════════════════════════════
    async addSound({ videoId, prompt = 'soft Indian shehnai wedding music, ambient, cinematic', sessionId = '' }) {
        console.log(`\n[${sessionId}] 🎵 [KLING Sound] Task ID: ${videoId}`);

        const res = await this._post('/videos/add-sound', { video_id: videoId, prompt }, 'AddSound', 3, true);

        if (res.data.code !== 0) {
            throw new Error(`[AddSound] Kling error: ${res.data.message}`);
        }

        const taskId = res.data.data.task_id;
        console.log(`[${sessionId}] 🎵 [Sound] Task: ${taskId}`);

        return await this._poll(
            `${this.BASE_URL}/videos/add-sound/${taskId}`,
            (data) => data.task_result?.videos?.[0]?.url,
            this.MAX_POLL_ATTEMPTS,
            null,
            true
        );
    }
}

module.exports = new KlingService();
