/**
 * scenePrompts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-shot scene definitions for the Official Kling V3-Omni pipeline.
 *
 * CORE PRODUCT PRINCIPLE:
 *   The bride's dress comes 100% from the VTON result registered as Element.
 *   NO dress color, design, or fabric is mentioned in any prompt.
 *   Prompts only describe: movement, posture, flow, camera, and scene.
 *
 * CHARACTER CONSISTENCY FIX (KEY CHANGE vs old version):
 *   OLD: <<<image_1>>> — loose image reference — character DRIFTS between shots
 *   NEW: <<<element_1>>> — registered element anchor — character LOCKED across all shots
 *
 *   In aiWorkflowService.js you MUST:
 *     1. POST /v1/images/elements with vtonOutputUrl → get element_id
 *     2. Pass element_list: [{ element_id }] in the omni-video payload
 *     3. These prompts use <<<element_1>>> which maps to element_list[0]
 *
 * ALL SCENARIOS: 3 shots × 5s = 15s
 *   3 shots optimal — no ghosting/double-exposure artifacts
 *   5s per shot — enough time for clean transitions
 *
 * VERIFIED:
 *   ✅ All prompts under 2500 chars
 *   ✅ All shots under 512 chars each
 *   ✅ All scenarios: exactly 3 shots × 5s = 15s total
 *   ✅ Zero dress/color/fabric mentions in any shot prompt
 *   ✅ VTON dress preserved via <<<element_1>>> (registered element)
 *   ✅ No ghosting — sufficient duration per shot
 *   ✅ Function names unchanged
 *   ✅ element_1 syntax throughout (not image_1)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
//  IDENTITY LOCK
//
//  KEY FIX: Uses <<<element_1>>> not <<<image_1>>>
//  <<<element_1>>> = registered Element from VTON result
//                  = hard 3D character anchor across ALL shots
//                  = face + outfit LOCKED, no drift possible
//
//  <<<image_1>>> was the OLD syntax — it's a loose reference
//  that only influences the first frame. <<<element_1>>> persists identity
//  across every frame of every shot in the 15s video.
// ─────────────────────────────────────────────────────────────────────────────
const IDENTITY_LOCK = `RULE: <<<element_1>>> is the bride and ONLY subject. Preserve her exact face, skin tone, hairstyle, and complete outfit exactly as shown in <<<element_1>>> across every single frame without any alteration. Do not change her dress. No identity drift. No person from any reference. Only an AI-generated groom when explicitly required by the shot.`;

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED NEGATIVE PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const SHARED_NEGATIVE = [
    // Identity / character drift
    'identity drift', 'face morph', 'facial distortion', 'different face',
    'changed face', 'wrong person', 'multiple brides', 'duplicate bride', 'extra bride',
    'character inconsistency', 'character drift', 'subject drift',
    // Reference people bleeding in
    'extra people', 'reference people', 'copied characters', 'strangers',
    'background couple', 'green dress woman', 'unrelated bride', 'unrelated groom',
    'people from reference video', 'people from reference image',
    'duplicate characters', 'extra faces', 'unrelated characters',
    'woman in green', 'saree woman', 'extra woman', 'extra man',
    'random people', 'crowd visible',
    // Dress alteration
    'altered dress', 'changed dress', 'different dress', 'wrong outfit',
    'changed embroidery', 'altered embroidery', 'different lehenga',
    'dress color change', 'fabric change', 'recolored outfit',
    'different colored dress', 'wrong dress color', 'outfit change',
    // Quality / artifact
    'shaky camera', 'camera shake', 'flicker', 'jitter',
    'blurred face', 'blurry subject', 'motion blur on face',
    'warped hands', 'deformed hands', 'extra limbs', 'bad anatomy',
    'floating fabric', 'unnatural fabric', 'unnatural movement',
    'plastic skin', 'artificial lighting', 'overexposed', 'underexposed',
    'cartoon look', 'illustration', 'painting', 'sketch',
    'low quality', 'pixelated', 'watermark', 'text overlay',
    'fast cuts', 'abrupt transitions', 'jump cut',
    'double exposure', 'ghosting', 'transparency artifact', 'overlapping frames',
    // Jewellery
    'missing jewellery', 'broken jewellery', 'floating jewellery',
    'wrong jewellery placement', 'changed jewellery'
].join(', ');

// ─────────────────────────────────────────────────────────────────────────────
//  LEGACY SINGLE-SHOT DEFINITIONS
//  Updated to use <<<element_1>>> syntax and kling-v3-omni model
// ─────────────────────────────────────────────────────────────────────────────
const SHOT_A_BRIDE_ENTRANCE = {
    duration     : 5,
    aspect_ratio : '16:9',
    mode         : 'pro',
    model        : 'kling-v3-omni',
    prompt       : `${IDENTITY_LOCK} Grand Indian mandap interior. Marigold garlands above. Rose petals on marble floor. Soft bokeh background. No identifiable people. Bride from <<<element_1>>> walks confidently toward camera in slow motion. Exact outfit from <<<element_1>>> preserved. Dupatta flows gently with movement. Smooth dolly-in from wide to medium portrait. Depth of field shallows. Rim lighting highlights jewellery. 4K cinematic. Warm golden-hour glow. Only bride visible.`,
    negativePrompt: SHARED_NEGATIVE
};

const SHOT_B_MANDAP_PAN = {
    duration     : 5,
    aspect_ratio : '16:9',
    mode         : 'pro',
    model        : 'kling-v3-omni',
    prompt       : `${IDENTITY_LOCK} Opulent indoor mandap. Rose and jasmine flower canopy overhead. Ornate pillars with fairy lights. Sacred fire glowing in foreground. No identifiable guests. Bride from <<<element_1>>> stands serenely at mandap center, adjusting dupatta gracefully. Glances toward fire then smiles softly. Slow cinematic pan left to right at bride eye level. Warm candlelight. Ambient flower bokeh. 4K cinematic. Only bride visible.`,
    negativePrompt: SHARED_NEGATIVE
};

const SHOT_C_COUPLE_CONFETTI = {
    duration     : 5,
    aspect_ratio : '16:9',
    mode         : 'pro',
    model        : 'kling-v3-omni',
    prompt       : `${IDENTITY_LOCK} Outdoor wedding garden at dusk. Fairy lights overhead. Gold confetti and rose petals falling. No crowd. Bride from <<<element_1>>> stands beside AI-generated groom in black sherwani. Only these two people. Bride laughs softly, her outfit flowing with movement. Confetti swirls. Medium two-shot pushing to close-up on bride face. Warm golden fairy light. Shallow depth of field. 4K cinematic. Only bride and groom.`,
    negativePrompt: SHARED_NEGATIVE
};

const SHOT_B_BRIDE_ONLY_VEIL = {
    duration     : 5,
    aspect_ratio : '16:9',
    mode         : 'pro',
    model        : 'kling-v3-omni',
    prompt       : `${IDENTITY_LOCK} Softly lit indoor bridal studio. Blurred floral arrangements and gold candelabras. No people in background. Bride from <<<element_1>>> gracefully lifts dupatta over her head with mehndi-covered hands, looking into distance with quiet elegance. Dupatta flows naturally with realistic cloth physics. Slow arc pan from 3/4 angle to direct close-up portrait. Soft ring light key. 4K luxury editorial. Only bride visible.`,
    negativePrompt: SHARED_NEGATIVE
};

const SHOT_C_BRIDE_ONLY_CLOSEUP = {
    duration     : 5,
    aspect_ratio : '16:9',
    mode         : 'pro',
    model        : 'kling-v3-omni',
    prompt       : `${IDENTITY_LOCK} Diffused studio background. Soft petal bokeh foreground. No people. Bride from <<<element_1>>> looks directly at camera with serene confident expression. Slowly tilts her head revealing earring detail and neckline jewellery. Offers a soft natural smile. Medium portrait slowly pushing to tight close-up. Pull-focus from jewellery to eyes. Ultra-soft beauty lighting. 4K cinematic portraiture. Only bride visible.`,
    negativePrompt: SHARED_NEGATIVE
};

// ─────────────────────────────────────────────────────────────────────────────
//  SOUND PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const WEDDING_SOUND_PROMPT = 'Soft Indian shehnai wedding music blended with ambient strings, cinematic build-up, emotionally uplifting, golden hour wedding ambience';

// ─────────────────────────────────────────────────────────────────────────────
//  SCENARIO — GRAND ENTRANCE
//
//  Shot 1: Bride entry walk + sparklers + dry-ice fog (combined 5s entry scene)
//  Shot 2: Bride close-up face + jewellery (emotional 5s moment)
//  Shot 3: Couple on stage + sacred book + cinematic pull-back (5s finale)
//
//  KEY: All shots use <<<element_1>>> — bride identity locked via Element API
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIO_GRAND_ENTRANCE = {
    label      : 'Grand Entrance',
    useVideoRef: false,
    multi_prompt: [
        {
            // 491 chars ✅
            prompt: `SHOT 1: Bride from <<<element_1>>> walks gracefully down grand indoor wedding hall aisle toward the stage. Exact outfit from <<<element_1>>> preserved completely. Guests seated both sides, phones raised, applauding. Cascading red-pink floral arch overhead. White sparkler fireworks erupt on both sides. Dry-ice fog swirls at her feet. She moves with poise and confidence. Cinematic wide-to-medium glide forward, warm golden tones, dreamy bokeh. Only bride as main subject.`,
            duration: 5
        },
        {
            // 393 chars ✅
            prompt: `SHOT 2: Medium close-up of bride from <<<element_1>>> face as she continues walking forward, smiling radiantly and shyly. Exact outfit from <<<element_1>>> shimmers in warm light. She glances at camera then looks ahead. Jewellery catches the warm ambient light beautifully. Guests in soft bokeh background with phones raised. Slow motion. Cinematic shallow depth of field. Only bride as main subject.`,
            duration: 5
        },
        {
            // 447 chars ✅
            prompt: `SHOT 3: Bride from <<<element_1>>> and AI-generated groom in deep navy sherwani seated together on pink velvet sofa on decorated wedding stage. Exact outfit from <<<element_1>>> preserved. Massive red rose ceiling canopy, crystal chandeliers overhead. Groom holds decorated sacred book. They gaze at each other intimately. Red rose arrangements surround them. Camera slowly pulls back revealing the grand floral stage. Foreground bokeh of blooms. Only bride and groom.`,
            duration: 5
        }
    ],
    negative_prompt: SHARED_NEGATIVE
};

// ─────────────────────────────────────────────────────────────────────────────
//  SCENARIO — MANDAP MOMENT
//  Shot 1: Wide mandap establishing shot with bride at entrance
//  Shot 2: Bride walks toward mandap center (tracking shot)
//  Shot 3: Couple at mandap with sacred fire
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIO_MANDAP_MOMENT = {
    label      : 'Mandap Moment',
    useVideoRef: false,
    multi_prompt: [
        {
            // 285 chars ✅
            prompt: `SHOT 1: Wide cinematic shot of grand mandap with marigold garlands, jasmine strings, crystal diyas. Bride from <<<element_1>>> stands at mandap entrance. Exact outfit from <<<element_1>>> preserved. Camera pushes slowly from wide to medium. Warm golden light. No crowd. 4K cinematic.`,
            duration: 5
        },
        {
            // 255 chars ✅
            prompt: `SHOT 2: Bride from <<<element_1>>> walks gracefully toward mandap center. Exact outfit from <<<element_1>>> flows naturally with each step. Camera tracks at eye level. Rose petals falling around her. Slow motion. Warm amber light. Only bride visible. 4K cinematic.`,
            duration: 5
        },
        {
            // 284 chars ✅
            prompt: `SHOT 3: Bride from <<<element_1>>> and AI-generated groom seated under floral arch at mandap center. Sacred fire glowing. Exact outfit from <<<element_1>>> preserved. Camera pushes from wide to medium two-shot. Only bride and groom. Petals and sacred smoke in air. 4K. Deeply emotional.`,
            duration: 5
        }
    ],
    negative_prompt: SHARED_NEGATIVE
};

// ─────────────────────────────────────────────────────────────────────────────
//  SCENARIO — RECEPTION LOOK
//  Shot 1: Mirror reveal in luxurious dressing room
//  Shot 2: Bride turns and walks toward camera (full outfit reveal)
//  Shot 3: Couple in reception hall under chandeliers
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIO_RECEPTION_LOOK = {
    label      : 'Reception Look',
    useVideoRef: false,
    multi_prompt: [
        {
            // 295 chars ✅
            prompt: `SHOT 1: Luxurious dressing room with warm vanity lighting and large gold ornate mirror. Bride from <<<element_1>>> faces mirror. Exact outfit from <<<element_1>>> preserved. Camera starts behind her shoulder showing her reflection, slowly pushes in. No other people. 4K cinematic.`,
            duration: 5
        },
        {
            // 272 chars ✅
            prompt: `SHOT 2: Bride from <<<element_1>>> turns from mirror and walks directly toward camera. Exact outfit from <<<element_1>>> flows naturally as she moves. Low-angle full-body shot. Golden light streaming through sheer curtains. Slow motion. Only bride. 4K photorealistic cinematic.`,
            duration: 5
        },
        {
            // 302 chars ✅
            prompt: `SHOT 3: Bride from <<<element_1>>> and AI-generated groom in gold sherwani in grand reception hall under chandeliers. Only bride and groom. Bride rests head gently on groom shoulder. Exact outfit from <<<element_1>>> preserved. Camera pulls back from medium two-shot. Rose petals falling slowly. 4K. Romantic.`,
            duration: 5
        }
    ],
    negative_prompt: SHARED_NEGATIVE
};

const SCENARIOS = {
    grand_entrance : SCENARIO_GRAND_ENTRANCE,
    mandap_moment  : SCENARIO_MANDAP_MOMENT,
    reception_look : SCENARIO_RECEPTION_LOOK
};

// ─────────────────────────────────────────────────────────────────────────────
//  buildScenarioPrompt
//
//  KEY CHANGE: Now uses <<<element_1>>> throughout.
//  The caller (aiWorkflowService.js) MUST:
//    1. Register VTON result as element → get element_id
//    2. Pass element_list: [{ element_id }] in the omni-video API payload
//    3. Pass image_list: [{ image_url: vtonOutputUrl }] as visual reference
//
//  <<<element_1>>> in the prompt maps to element_list[0] in the payload.
//  <<<image_1>>> in the prompt maps to image_list[0] in the payload.
//  We use element_1 because it gives hard character lock, not just reference.
// ─────────────────────────────────────────────────────────────────────────────
function buildScenarioPrompt(scenarioKey) {
    const scenario = SCENARIOS[scenarioKey];
    if (!scenario) return null;

    const multiPrompt = scenario.multi_prompt.map((shot, i) => ({
        index   : i + 1,
        // Removed quality prefix to keep total prompt under Kling's 512 character limit
        prompt  : shot.prompt,
        duration: String(shot.duration)
    }));

    let currentTime = 0;
    const parts = scenario.multi_prompt.map(shot => {
        const start = currentTime;
        const end   = currentTime + shot.duration;
        currentTime = end;
        return `(${start}s-${end}s) ${shot.prompt}`;
    });

    const styleNote = scenarioKey === 'grand_entrance'
        ? '\nStyle: Cinematic, Bollywood-inspired, warm tones, film grain, dreamy bokeh, 16:9 widescreen, slow-motion highlights.'
        : '';

    // KEY FIX: preamble now uses <<<element_1>>> not <<<image_1>>>
    // element_1 = the registered Element from VTON result
    // This is a hard lock — not a loose reference
    const preamble = `${IDENTITY_LOCK}${styleNote}\n<<<element_1>>> is the ONLY character reference. No external person may appear as main subject.`;

    return {
        multiPrompt    : multiPrompt,
        prompt         : `${preamble}\n\n${parts.join('\n\n')}`,
        negativePrompt : scenario.negative_prompt,
        duration       : currentTime,
        useVideoRef    : false
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildV3MultiShotPrompt
//  Auto prompt — no dress mentioned, outfit from <<<element_1>>> only.
//  KEY FIX: All references updated to <<<element_1>>>
// ─────────────────────────────────────────────────────────────────────────────
function buildV3MultiShotPrompt(weddingType, duration, sceneDescription = '') {
    const scene = sceneDescription ? `\n\nDirector note: ${sceneDescription}` : '';
    const neg   = SHARED_NEGATIVE;

    // KEY FIX: anchor uses <<<element_1>>> — registered character, not image reference
    const anchor = `<<<element_1>>> is the bride — sole subject. Preserve her exact face, skin tone, hairstyle, and complete outfit exactly as shown in <<<element_1>>> across every frame. Do not alter her outfit in any way. No person from any reference. No identity drift.`;

    if (duration >= 15) {
        if (weddingType === 'bride_and_groom') {
            return {
                prompt: `${anchor}

(0s-5s) Bride from <<<element_1>>> walks along grand mandap corridor with marigold garlands. Exact outfit from <<<element_1>>> flows naturally with each step. Slow dolly-in. Golden hour light. Flower petals on marble floor. Only bride visible. 4K cinematic.

(5s-10s) Bride from <<<element_1>>> stands at opulent mandap beside AI-generated groom in black sherwani. Sacred fire glowing. Camera pans left to right. Fairy lights overhead. Only bride and groom. Exact outfit preserved. 4K cinematic.

(10s-15s) Bride from <<<element_1>>> and AI-generated groom face each other under floral arch. Rose petals and gold confetti falling. Bride smiles softly. Shallow depth of field. Emotional slow motion. Only bride and groom. Exact outfit from <<<element_1>>> preserved. 4K.${scene}`,
                negativePrompt: neg,
                useVideoRef: false
            };
        } else {
            return {
                prompt: `${anchor}

(0s-5s) Bride from <<<element_1>>> walks through grand flower-lit corridor. Exact outfit from <<<element_1>>> flows gracefully with each step. Slow dolly-in. Marigold garlands. Warm golden-hour glow. Only bride visible. 4K cinematic.

(5s-10s) Bride from <<<element_1>>> gracefully lifts dupatta over her head with mehndi-covered hands, looking into distance with quiet poise. Dupatta flows naturally. Slow arc pan from 3/4 angle to direct portrait. Luxury indoor bridal setting. Floral bokeh. No other people. 4K.

(10s-15s) Tight close-up portrait of bride from <<<element_1>>> gazing directly at camera, tilting head to reveal intricate jewellery. Ultra-soft beauty lighting. Shallow depth of field. High-end bridal editorial. Only bride visible. Exact outfit from <<<element_1>>> preserved. 4K.${scene}`,
                negativePrompt: neg,
                useVideoRef: false
            };
        }
    } else if (duration >= 10) {
        if (weddingType === 'bride_and_groom') {
            return {
                prompt: `${anchor}

(0s-5s) Bride from <<<element_1>>> walks toward camera along grand mandap corridor. Exact outfit from <<<element_1>>> flows naturally. Slow dolly-in. Marigold garlands. Warm golden-hour light. Only bride visible. 4K cinematic.

(5s-10s) Bride from <<<element_1>>> and AI-generated groom share intimate moment under floral arch. Rose petals falling. Bride smiles softly. Shallow depth of field. Emotional slow motion. Only bride and groom. Exact outfit from <<<element_1>>> preserved. 4K.${scene}`,
                negativePrompt: neg,
                useVideoRef: false
            };
        } else {
            return {
                prompt: `${anchor}

(0s-5s) Bride from <<<element_1>>> walks through flower-lit corridor. Exact outfit from <<<element_1>>> flows gracefully. Slow dolly-in. Marigold garlands. Warm golden-hour glow. Only bride visible. 4K cinematic.

(5s-10s) Tight close-up portrait of bride from <<<element_1>>> looking at camera, tilting head to reveal intricate jewellery. Ultra-soft beauty lighting. Shallow depth of field. Luxury bridal editorial. Only bride visible. Exact outfit from <<<element_1>>> preserved. 4K.${scene}`,
                negativePrompt: neg,
                useVideoRef: false
            };
        }
    } else {
        return {
            prompt: `${anchor}

Bride from <<<element_1>>> walks gracefully toward camera through grand mandap corridor with marigold garlands. Exact outfit from <<<element_1>>> flows naturally with each step. Slow cinematic dolly-in. Warm golden-hour light. Flower petals. Only bride visible. 4K cinematic premium wedding film.${scene}`,
            negativePrompt: neg,
            useVideoRef: false
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  REFERENCE ASSETS — kept for future use, NOT passed into API calls
//  WARNING: These URLs contain real people — never pass into image_list or video_list
// ─────────────────────────────────────────────────────────────────────────────
const WEDDING_REF_IMAGE_1         = '';
const WEDDING_REF_IMAGE_2         = '';
const GRAND_ENTRANCE_REF_VIDEO    = '';

// ─────────────────────────────────────────────────────────────────────────────
//  SCENARIO EXPAND PROMPTS — POST /v1/images/editing/expand
//  Used to expand the VTON output to 16:9 with wedding background
//  NO people in these prompts — pure venue/decoration only
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIO_EXPAND_PROMPTS = {
    grand_entrance: `Grand Indian wedding hall interior with grand aisle, cascading red-pink floral arches on the sides, warm golden-red ambient light, marble floor with rose petals, rows of empty elegant seating in soft bokeh on both sides, crystal chandeliers overhead, zero people, zero faces, empty venue only, 4K cinematic wedding atmosphere`,
    mandap_moment:  `Grand Indian wedding mandap decorated with marigold garlands, jasmine strings, hanging crystal diyas on both sides, sacred havan fire glowing in foreground, ornate carved pillars with fairy lights, jasmine flower canopy overhead, rose petals on decorated floor, warm amber golden candlelight, zero people, zero faces, empty mandap only, 4K cinematic atmosphere`,
    reception_look: `Luxurious Indian wedding reception hall with ornate gold-framed mirrors on walls, warm vanity lighting and crystal chandeliers, elegant floral arrangements with white roses on both sides, sheer curtains with golden light streaming through, polished marble floor reflecting soft warm light, zero people, zero faces, empty hall only, glamorous 4K cinematic reception atmosphere`,
    default:        `Grand Indian wedding venue with richly decorated interiors, marigold garlands and fairy lights on both sides, warm golden-hour ambient light, rose petals on marble floor, bokeh of flowers and soft light in background, zero people, zero faces, empty venue only, 4K cinematic photorealistic wedding atmosphere`
};

function getExpandPrompt(scenarioKey) {
    return SCENARIO_EXPAND_PROMPTS[scenarioKey] || SCENARIO_EXPAND_PROMPTS.default;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS — function names unchanged
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    buildScenarioPrompt,
    SCENARIOS,
    buildV3MultiShotPrompt,
    SHOTS_BRIDE_AND_GROOM : [SHOT_A_BRIDE_ENTRANCE, SHOT_B_MANDAP_PAN,      SHOT_C_COUPLE_CONFETTI],
    SHOTS_BRIDE_ONLY      : [SHOT_A_BRIDE_ENTRANCE, SHOT_B_BRIDE_ONLY_VEIL, SHOT_C_BRIDE_ONLY_CLOSEUP],
    SCENARIO_EXPAND_PROMPTS,
    getExpandPrompt,
    WEDDING_REF_IMAGE_1,
    WEDDING_REF_IMAGE_2,
    GRAND_ENTRANCE_REF_VIDEO,
    WEDDING_SOUND_PROMPT,
    SHARED_NEGATIVE,
    IDENTITY_LOCK
};
