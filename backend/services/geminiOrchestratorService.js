/**
 * geminiOrchestratorService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GEMINI AI ORCHESTRATOR — natural-language → Higgsfield settings
 *
 * Acts as the "manager" / "brain" of the platform — reads the user's natural
 * language request (e.g. "make a 15-second sangeet dance video in 4K") and
 * decides which Higgsfield model + settings to use.
 *
 * Then the existing higgsfieldAPIService is called with those settings.
 *
 * Required env var:
 *   GEMINI_API_KEY  — from aistudio.google.com/app/apikey
 *
 * Optional env var:
 *   GEMINI_MODEL    — defaults to 'gemini-2.0-flash' (free tier, fast)
 *
 * Free tier: 15 requests/min, 1500 requests/day — way more than enough for
 * a bridal boutique (≈ ₹0 cost per video for LLM layer).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Valid options the orchestrator can pick from — must match higgsfieldAPIService config
const VALID_MODELS = [
    'kling-3.0',          // multi-shot, audio, cinematic — DEFAULT
    'kling-2.6',
    'seedance-2.0',
    'seedance-2.0-fast',
    'veo-3.1',
    'veo-3.1-fast',
    'higgsfield-soul'
];

const VALID_SCENARIOS = [
    'stage_entry',
    'mandap_moment',
    'sangeet_dance',
    'sofa_pose',
    'reception_walk',
    'custom'
];

const VALID_RESOLUTIONS = ['720p', '1080p', '4K'];
const VALID_DURATIONS   = [5, 10, 15];
const VALID_MODES       = ['fast', 'std'];

const SYSTEM_INSTRUCTION = `You are the AI orchestrator for Ladies Planet, a luxury bridal boutique platform.

Your job: read the staff member's request and pick the optimal Higgsfield video generation settings as JSON.

AVAILABLE MODELS (cost increases left-to-right):
- "kling-3.0"          → multi-shot scenes, built-in audio, cinematic motion. BEST DEFAULT for bridal.
- "seedance-2.0-fast"  → strong multi-reference identity preservation. Cheaper but no audio.
- "seedance-2.0"       → premium Seedance with higher quality
- "veo-3.1-fast"       → Google Veo with audio, premium quality
- "veo-3.1"            → top-tier Google Veo (most expensive)
- "higgsfield-soul"    → Higgsfield's own cinematic model
- "kling-2.6"          → older Kling, cheaper fallback

PRESET SCENARIOS (use the closest match to user's intent):
- "stage_entry"     → grand stage entrance, petal shower, audience
- "mandap_moment"   → sacred mandap ceremony with groom, fire, garlands
- "sangeet_dance"   → joyful sangeet performance, LED lights
- "sofa_pose"       → elegant solo portrait on royal sofa
- "reception_walk"  → grand reception entrance, fairy lights
- "custom"          → fall back to this ONLY if user describes a scene that doesn't match presets; then set customPrompt with their description

SETTINGS:
- duration:   5, 10, or 15 seconds
- resolution: "720p" (default), "1080p" (premium), "4K" (ultra premium — expensive)
- mode:       "fast" (default, cheap) or "std" (higher quality, more expensive)
- multiShot:  true (cinematic multi-scene) or false (single shot)
- sound:      true (wedding music) or false

DEFAULTS when user doesn't specify:
- model: "kling-3.0"
- scenario: "stage_entry"
- duration: 10
- resolution: "720p"
- mode: "fast"
- multiShot: true
- sound: true

RESPOND WITH JSON ONLY — no markdown, no commentary. Exact format:
{
  "model": "<one of VALID_MODELS>",
  "scenario": "<one of VALID_SCENARIOS>",
  "duration": <5 | 10 | 15>,
  "resolution": "<720p | 1080p | 4K>",
  "mode": "<fast | std>",
  "multiShot": <true | false>,
  "sound": <true | false>,
  "customPrompt": "<empty string OR user-described scene if scenario === custom>",
  "reasoning": "<one short sentence explaining your choices>"
}`;

class GeminiOrchestratorService {

    constructor() {
        this.API_KEY = process.env.GEMINI_API_KEY;
        this.MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

        this.isSimulationMode = !this.API_KEY || this.API_KEY === 'your_gemini_api_key_here';

        if (this.isSimulationMode) {
            console.warn('⚠️  [GeminiOrchestrator] GEMINI_API_KEY not set — SIMULATION MODE');
            this.model = null;
        } else {
            try {
                const genAI = new GoogleGenerativeAI(this.API_KEY);
                this.model = genAI.getGenerativeModel({
                    model              : this.MODEL_NAME,
                    systemInstruction  : SYSTEM_INSTRUCTION,
                    generationConfig   : {
                        responseMimeType : 'application/json',
                        temperature      : 0.3   // low randomness, more consistent picks
                    }
                });
                console.log(`✅  [GeminiOrchestrator] Initialized with ${this.MODEL_NAME}`);
            } catch (err) {
                console.error('❌  [GeminiOrchestrator] Init failed:', err.message);
                this.isSimulationMode = true;
                this.model = null;
            }
        }
    }

    /**
     * Parse a natural-language user request into Higgsfield generation settings.
     *
     * @param {string} userPrompt - e.g. "make a 15s sangeet dance in 4K with Kling 3.0"
     * @returns {Promise<{
     *   model        : string,
     *   scenario     : string,
     *   duration     : number,
     *   resolution   : string,
     *   mode         : string,
     *   multiShot    : boolean,
     *   sound        : boolean,
     *   customPrompt : string,
     *   reasoning    : string
     * }>}
     */
    async parseUserRequest(userPrompt) {
        if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length < 3) {
            throw new Error('userPrompt is required (at least 3 characters)');
        }

        if (this.isSimulationMode) {
            return this._simulateParse(userPrompt);
        }

        console.log(`🧠 [Gemini] Parsing: "${userPrompt.slice(0, 80)}..."`);

        let result;
        try {
            result = await this.model.generateContent(userPrompt);
        } catch (err) {
            // Graceful fallback when Gemini is down / over quota / disabled.
            // We log the issue, then fall back to keyword-based parsing so the
            // bridal flow keeps working even if Gemini is unavailable.
            console.warn(`⚠️  [Gemini] API failed (${err.message?.slice(0, 100)}) — using keyword fallback`);
            return { ...this._simulateParse(userPrompt), fallback: true, fallbackReason: err.message?.slice(0, 200) };
        }

        const text = result.response.text().trim();

        // Gemini sometimes wraps in ```json``` despite responseMimeType — be defensive
        const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error(`Gemini returned non-JSON response: ${text.slice(0, 200)}`);
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
            throw new Error(`Failed to parse Gemini JSON: ${e.message} — raw: ${jsonMatch[0].slice(0, 200)}`);
        }

        // Validate & sanitize
        const settings = this._validateAndSanitize(parsed);
        console.log(`✅ [Gemini] Resolved settings:`, settings);
        return settings;
    }

    _validateAndSanitize(parsed) {
        const settings = {
            model        : VALID_MODELS.includes(parsed.model) ? parsed.model : 'kling-3.0',
            scenario     : VALID_SCENARIOS.includes(parsed.scenario) ? parsed.scenario : 'stage_entry',
            duration     : VALID_DURATIONS.includes(Number(parsed.duration)) ? Number(parsed.duration) : 10,
            resolution   : VALID_RESOLUTIONS.includes(parsed.resolution) ? parsed.resolution : '720p',
            mode         : VALID_MODES.includes(parsed.mode) ? parsed.mode : 'fast',
            multiShot    : parsed.multiShot !== false,
            sound        : parsed.sound !== false,
            customPrompt : typeof parsed.customPrompt === 'string' ? parsed.customPrompt : '',
            reasoning    : typeof parsed.reasoning === 'string' ? parsed.reasoning : 'Default selection'
        };

        // Safety: if scenario is "custom" but no customPrompt provided, fall back to stage_entry
        if (settings.scenario === 'custom' && settings.customPrompt.trim().length < 10) {
            settings.scenario = 'stage_entry';
            settings.customPrompt = '';
            settings.reasoning += ' [fallback: custom needed a longer prompt]';
        }

        return settings;
    }

    _simulateParse(userPrompt) {
        // Very simple keyword-based fallback when API key is missing
        const lower = userPrompt.toLowerCase();
        let scenario = 'stage_entry';
        if (lower.includes('mandap'))    scenario = 'mandap_moment';
        if (lower.includes('sangeet'))   scenario = 'sangeet_dance';
        if (lower.includes('sofa') || lower.includes('portrait')) scenario = 'sofa_pose';
        if (lower.includes('reception')) scenario = 'reception_walk';

        let duration = 10;
        if (lower.includes('5 second') || lower.includes('5s')) duration = 5;
        if (lower.includes('15 second') || lower.includes('15s')) duration = 15;

        let resolution = '720p';
        if (lower.includes('1080') || lower.includes('hd'))   resolution = '1080p';
        if (lower.includes('4k') || lower.includes('ultra')) resolution = '4K';

        return {
            model        : 'kling-3.0',
            scenario,
            duration,
            resolution,
            mode         : 'fast',
            multiShot    : true,
            sound        : true,
            customPrompt : '',
            reasoning    : 'Simulation keyword-based parse (GEMINI_API_KEY not set)',
            simulated    : true
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROMPT EXPANDER — turn short keywords into rich cinematic wedding scenes
    //
    //  Input:  "bride rotating scene"
    //  Output: 3-5 paragraphs covering scene, action, camera angles, lighting,
    //          audience, mood — ready to feed into Higgsfield Seedance/Kling.
    //
    //  Used by /api/videos/expand-prompt and /api/images/expand-prompt so the
    //  client can type 2-3 keywords and get a production-grade prompt back.
    // ─────────────────────────────────────────────────────────────────────────
    async expandSimplePrompt(userText, { kind = 'video' } = {}) {
        const clean = (userText || '').trim();
        if (clean.length < 2) {
            throw new Error('userText is required (min 2 chars)');
        }

        if (this.isSimulationMode) {
            return { expanded: this._templateExpand(clean, kind), source: 'template' };
        }

        const target = kind === 'image' ? 'still image / bridal poster' : 'cinematic wedding video';
        const sceneCount = kind === 'image' ? '1 scene' : '4-6 connected scenes';

        const expanderPrompt = `You are a Pakistani/Indian luxury wedding cinematography director writing prompts for a video AI engine.

Take the user's brief keywords and expand them into a rich, production-ready ${target} prompt with:

1. **Setting** — luxury wedding hall / outdoor / stage / venue, with concrete decor: flowers, fairy lights, cream and gold tones, crowd if relevant.
2. **Bride direction** — what she does, her expression, her dupatta/jewelry/lehenga details.
3. **${sceneCount}** — each with explicit camera angle (close-up, side, dolly, orbit), lens (85mm, etc.), framing, and motion.
4. **Lighting** — golden hour rim, soft Rembrandt key, dreamy bokeh, etc.
5. **Atmosphere effects** — confetti, smoke haze, sparklers, crowd reactions where appropriate.
6. **Quality keywords** — Sony FX3 / RED Komodo / shallow DOF / 4K / ultra-realistic skin / cinematic.

DO NOT include any negative-prompt or "no X" lines — those are added separately.
DO NOT mention the AI model or any technical params (resolution / aspect ratio / duration).
Keep the bride identity / dress lock implicit — that block is added separately too.

The expanded prompt should be ${kind === 'image' ? '120-220 words' : '250-400 words'} of vivid scene direction.

USER KEYWORDS: ${JSON.stringify(clean)}

Return ONLY the expanded prompt text — no JSON, no headers, no commentary.`;

        // Try a list of Gemini models — newer models exhaust quota first; the
        // fallback chain ensures we still get a real expansion when the primary
        // model is rate-limited. Each model has its own per-day quota bucket.
        const genAI = new GoogleGenerativeAI(this.API_KEY);
        const candidates = Array.from(new Set([
            this.MODEL_NAME,
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
        ]));

        let lastErr;
        for (const modelName of candidates) {
            try {
                const rawModel = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.75,            // higher creativity for scene-writing
                        responseMimeType: 'text/plain',
                    },
                });
                const result = await rawModel.generateContent(expanderPrompt);
                const text = result.response.text().trim();
                if (!text || text.length < 50) {
                    throw new Error('Empty/short response');
                }
                console.log(`🪄 [Gemini:${modelName}] Expanded "${clean.slice(0, 40)}…" → ${text.length} chars`);
                return { expanded: text, source: 'gemini', model: modelName };
            } catch (err) {
                lastErr = err;
                const is429 = /429|quota|rate.?limit/i.test(err.message || '');
                console.warn(`⚠️  [Gemini:${modelName}] ${is429 ? 'rate-limited' : 'failed'} — trying next…`);
                if (!is429) break;   // non-quota errors → don't retry other models
            }
        }
        console.warn(`⚠️  [Gemini] All models exhausted (${lastErr?.message?.slice(0, 80)}) — using template fallback`);
        return { expanded: this._templateExpand(clean, kind), source: 'template', fallback: true };
    }

    // Deterministic fallback when Gemini is unavailable. Recognizes common
    // bridal action keywords and injects matching scene details so the result
    // is still production-grade even without LLM access.
    _templateExpand(userText, kind) {
        const cap = userText.charAt(0).toUpperCase() + userText.slice(1);
        const lower = userText.toLowerCase();

        // Detect intent keywords and produce a context-specific scene block.
        // Falls through to a generic block if nothing matches.
        const sceneHints = [];
        if (/rotat|spin|twirl|circle/.test(lower)) {
            sceneHints.push('Bride spins gracefully under hanging chandeliers as her lehenga flares wide in a glowing arc. Dupatta lifts in slow motion. Camera: 360° orbit around her, ground-level then rising. Shutter held just slow enough to soften the spin into a dreamy blur.');
        }
        if (/walk|enter|aisle|pathway/.test(lower)) {
            sceneHints.push("Bride steps forward gracefully along a flower-petal pathway. Long dupatta trails behind. Each step is a beat in the music. Camera: slow front dolly with subtle handheld realism, then 3/4 side tracking shot at 85mm.");
        }
        if (/hug|embrace/.test(lower)) {
            sceneHints.push('Bride and groom share an emotional embrace. Bride closes her eyes peacefully against his shoulder. Camera: slow cinematic push-in, shallow depth of field, dreamy bokeh of fairy lights behind them.');
        }
        if (/kiss/.test(lower)) {
            sceneHints.push('Groom gently lifts bride\'s chin and kisses her forehead. Bride\'s eyelashes lower softly. Camera: tight 85mm close-up on the kiss; cuts to a side silhouette against warm stage lights.');
        }
        if (/confetti|petal|sparkle|firework/.test(lower)) {
            sceneHints.push('Heavy red rose-petal confetti rains from above in slow motion. Sparkler fountains burst on both sides of the stage. Crowd cheers. Camera: low-angle wide capturing the entire celebration, then a tight close-up of confetti landing on bride\'s lehenga.');
        }
        if (/sit|sofa|chair|throne/.test(lower)) {
            sceneHints.push('Bride seated on a luxury cream-and-gold chaise lounge, lehenga fanned out beautifully around her. Groom seated beside her, holding her hand. Camera: medium romantic shot, then slow push-in over the shoulder.');
        }
        if (/dance|sangeet|music/.test(lower)) {
            sceneHints.push('Bride performs a slow elegant Bollywood-classical move under coloured LED stage lights. Disco haze. Confetti and golden glitter rain. Camera: low orbit shot, slow-motion arm extension, then tight twirl close-up.');
        }
        if (/dupatta|veil|reveal/.test(lower)) {
            sceneHints.push('Groom slowly lifts the front veil of the bride\'s dupatta with both hands. Bride\'s emotional smile is revealed. Camera: tight close-up on the veil lifting, soft rim light catching her face.');
        }
        if (/portrait|closeup|close.?up|face/.test(lower)) {
            sceneHints.push('Tight 85mm beauty portrait of the bride looking softly into the camera. Dupatta framing her face. Mehndi-covered hand near her cheek. Catchlights in her eyes. Visible skin pores, glossy lips, intricate jewelry detail.');
        }

        // If no specific keyword matched, use a generic graceful-bride scene.
        if (sceneHints.length === 0) {
            sceneHints.push(`Bride embodies the scene "${userText}" with graceful movement, gentle smile, dupatta beautifully draped over her head. Camera: cinematic medium shot, slow steadycam, shallow depth of field. Audience reactions in soft bokeh.`);
        }
        const sceneBlock = sceneHints.map((s, i) => `SCENE ${i + 1} — ${s}`).join('\n\n');

        if (kind === 'image') {
            return `Luxury Pakistani/Indian bridal magazine cover capturing: ${userText}.

POSE & ACTION: ${cap}. The bride holds the dupatta edge softly, body angled 3/4 toward camera with elegant posture. Subtle confident smile, calm romantic gaze.

LIGHTING: Warm Rembrandt key light from camera-left, soft fill on the opposite side, golden rim light on hair and embroidered details. Honey-tone color grade. Dreamy bokeh background.

BACKGROUND: Cream and gold luxury studio backdrop with hanging white flowers softly blurred into creamy bokeh. Soft fairy-light particles. Marble floor reflection.

QUALITY: Shot on Sony A7R V with 85mm portrait lens at f/1.8. Premium Vogue-grade lighting. Photorealistic skin texture, crisp embroidery threads, realistic jewelry reflections, ultra-detailed mehndi. 4K detail.`;
        }
        return `Ultra-realistic luxury Pakistani/Indian wedding cinematic film capturing: ${userText}.

SETTING: Crowded indoor wedding hall with warm cream and gold luxury stage, hanging white flowers, fairy-lit arches, marble floor. Family and guests blurred in background recording on phones, smiling and clapping emotionally. Cinematic smoke haze, dreamy bokeh.

BRIDE STYLING: ${cap}. Bride wears luxury bridal makeup, glowing soft skin, glossy lips, elegant eye makeup, heavy gold jewelry (matha patti, jhumka earrings, layered rani-haar, nath, kangan bangles), intricate mehndi on hands, dupatta beautifully draped over her head and falling gracefully over both shoulders.

${sceneBlock}

CAMERA: Sony FX3 / RED Komodo cinema look, 85mm portrait lens at f/1.8, shallow depth of field, anamorphic flares, subtle handheld realism, smooth gimbal movement, slow cinematic dolly transitions between scenes.

LIGHTING: Warm golden-hour glow, soft Rembrandt key light, gentle rim light on jewelry and embroidery, dreamy bokeh of stage fairy lights, cinematic warm tones.

ATMOSPHERE: Heavy red confetti rain, sparkler fountains on both sides of the stage, cinematic smoke haze, floating bokeh particles, emotional crowd reactions, premium Pakistani luxury wedding ambience.

AUDIO STYLE: Emotional cinematic wedding soundtrack, romantic orchestral piano and strings, soft crowd cheering, confetti burst sounds, luxury wedding hall ambience.

QUALITY: Photorealistic skin texture with visible pores, natural blinking, realistic cloth and dupatta movement, accurate jewelry reflections, premium 4K Instagram wedding-reel videography.`;
    }
}

module.exports = new GeminiOrchestratorService();
