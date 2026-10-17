/**
 * Video generation service — Kling O1 Reference-to-Video on fal.ai
 *
 * The file name is historical (started with Seedance). Internally now uses
 * Kling O1 Reference, which:
 *   • takes bride + dress as separate "elements" (not flat image list)
 *   • generates in ~30-90 seconds typically
 *   • is the same Kling family the previous codebase used (kling-v3),
 *     just delivered through a single fal.ai endpoint instead of a 5-step pipeline
 *
 * Single source of truth for the 2 preset wedding prompts and the API call.
 * Used by both the CLI smoke test (test-seedance.js) and the HTTP route
 * (routes/seedanceTestRoute.js).
 */

require('dotenv').config();

let _falPromise = null;
async function getFal() {
    // @fal-ai/client is ESM-first — load it dynamically so this CJS module works
    if (!_falPromise) _falPromise = import('@fal-ai/client').then(m => m.fal);
    const fal = await _falPromise;
    if (process.env.FAL_KEY) fal.config({ credentials: process.env.FAL_KEY });
    return fal;
}

/* ─── PRESETS ────────────────────────────────────────────────────────────── */
/* Prompts use Kling's @Element1 (bride) and @Element2 (dress) reference syntax */

const PRESETS = {
    1: {
        id: 1,
        label: 'Stage Romance — Pakistani Bride & Groom',
        aspect_ratio: '16:9',
        text: `Ultra-realistic luxury South Asian wedding stage scene with the exact same woman from the reference images, in elite Pakistani bridal style.

Identity preserved exactly: same face, skin, eyes, lips, nose, jawline, body, natural beauty. No facial change. Bride wears the exact same lehenga from the reference — preserve all colors, embroidery, blouse, fabric, patterns, and dupatta exactly. Do NOT modify the outfit.

Bride: premium Pakistani celebrity — soft elegant beauty, naturally attractive, classy, sophisticated yet modest, emotionally romantic. Avoid plastic AI skin, heavy Bollywood makeup, fake glamour.

Makeup: soft matte glowing skin with natural texture, defined kohl eyes, warm brown-gold tones, long lashes, soft rosy nude lips, gentle blush, refined luxury finish.

Dupatta (critical, couture-level): heavy luxurious dupatta with rich zari and handwork, elegant border embroidery, soft translucent premium fabric, royal layered draping over head and shoulders, realistic fabric weight and folds, golden reflections.

Jewelry: heavy layered kundan/polki necklace, jhumka/chandbali earrings, delicate maang tikka, subtle nose ring, rich detailed bangles, optional passa. Luxurious, realistic, not over-shiny.

Hair: sleek low bridal bun, center parting, fresh jasmine gajra, soft loose strands.

Scene: bride sits on a grand luxury wedding stage sofa beside the groom — elegant South Asian groom in cream/gold sherwani, sophisticated and supportive, not overpowering bride. Bride softly smiles, slight head tilt, romantic eye contact; groom gently holds her hand.

Stage: grand Pakistani decor — white, ivory, red and gold florals, chandeliers, warm fairy lights, premium backdrop, soft glowing bokeh.

Camera: cinematic slow dolly-in mid shot, close-up beauty, over-the-shoulder romantic framing, slow-motion hand-holding.

Lighting: warm soft luxury wedding lighting, golden highlights on jewelry and embroidery, ambient glow, natural skin tones, soft shadows.

Motion: natural blinking, subtle breathing, slight jewelry sway, realistic dupatta movement, minimal handheld shake.

Lens: 50mm cinematic, shallow depth of field, creamy bokeh. Quality: ultra photorealistic, premium cinematic realism, 4K wedding film, no AI artifacts.

IMPORTANT: Do NOT change the lehenga or bride's identity. Maintain exact embroidery and colors. Dupatta must feel couture-level. Output: high-budget Pakistani celebrity wedding film.`
    },
    2: {
        id: 2,
        label: 'Bridal Entry — Pakistani Floral Canopy',
        aspect_ratio: '16:9',
        text: `Ultra-realistic luxury South Asian indoor wedding bridal entry with elite Pakistani bridal aesthetics, premium cinematic atmosphere.

Use the exact same woman from the reference images. Identity preserved: same face, skin, structure, eyes, lips, nose, body, expressions. NO AI beautification.

Bride wears the exact same lehenga from the reference — keep exact embroidery, colors, blouse, fabric, dupatta, borders, patterns. Do NOT modify lehenga.

Bride: luxury Pakistani celebrity bride from elite couture campaign — naturally beautiful, classy, softly glamorous, graceful, emotionally captivating, sophisticated. Avoid plastic AI skin, fake features, cartoonish styling.

Dupatta (critical, couture-level): heavy luxurious dupatta with rich zari, dabka, sequins, fine embroidery; soft translucent premium fabric; royal layered draping over head and shoulders; flowing folds; realistic fabric weight; cinematic cloth physics while walking; rich embroidered borders; warm golden reflections.

Jewelry: heavy layered kundan/polki necklace, jhumka/chandbali earrings, delicate maang tikka, optional passa, subtle nose ring, rich stacked bangles. Handcrafted, realistic.

Hair: sleek low bridal bun, center parting, jasmine gajra, soft loose strands.

Makeup: soft matte radiant skin with natural texture, defined kohl eyes, nude-gold tones, long lashes, glossy soft nude lips, gentle blush, bridal glow.

Expression: graceful smile, emotionally happy, romantic, calm luxury vibe.

Scene: bride walks forward under floral canopy (phoolon ki chadar) — dense white and ivory flowers with green foliage, pearl hangings, four men holding canopy, guests softly blurred with joyful expressions.

Camera: front-facing eye-level, smooth backward tracking as bride walks forward, cinematic close-ups of face, eyes, jewelry, flowing dupatta.

Motion: slow graceful walk, natural body movement, realistic breathing, blinking, elegant dupatta movement, slight jewelry sway, cinematic slow-motion feel.

Lighting: warm luxury indoor lighting, golden highlights on jewelry and embroidery, soft ambient shadows, rich premium glow.

Lens: 50mm cinematic, shallow depth of field, creamy bokeh. Quality: ultra photorealistic, premium realism, no AI artifacts, no identity distortion, 4K Pakistani wedding film look.

IMPORTANT: Do NOT change bride's identity or lehenga. Do NOT simplify dupatta. Bride must look premium, elegant, naturally attractive, realistic. Output: high-budget Pakistani celebrity wedding film.`
    }
};

const MODEL_ID = 'fal-ai/kling-video/o3/standard/reference-to-video';

/* Kling O1 Reference supports only these ratios */
const SUPPORTED_ASPECT_RATIOS = ['16:9', '9:16', '1:1'];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

async function uploadBufferToFal(buffer, filename = 'image.jpg') {
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
    const blob = new Blob([buffer], { type: MIME[ext] || 'image/jpeg' });
    const fal = await getFal();
    return await fal.storage.upload(blob);
}

/* ─── Main entry: bride + dress buffers → video URL ───────────────────────── */
/**
 * @param {Object} opts
 * @param {Buffer} opts.brideBuffer
 * @param {string} opts.brideFilename
 * @param {Buffer} opts.dressBuffer
 * @param {string} opts.dressFilename
 * @param {1|2|null} opts.presetId      — when provided, uses preset prompt
 * @param {string}   [opts.customPrompt] — used when presetId is null
 * @param {string}   [opts.aspectRatio] — must be one of SUPPORTED_ASPECT_RATIOS (default 16:9)
 * @param {string}   [opts.duration]    — '3'..'10' seconds (default '5')
 * @param {Function} [opts.onProgress]  — callback({status, elapsedSec, message})
 */
async function generateReferenceVideo(opts) {
    const {
        brideBuffer, brideFilename = 'bride.jpg',
        dressBuffer, dressFilename = 'dress.jpg',
        presetId = null, customPrompt = '',
        aspectRatio,
        duration = '5',
        onProgress = () => {}
    } = opts;

    if (!brideBuffer || !dressBuffer) {
        throw new Error('Both bride and dress images are required');
    }

    let prompt, ratio;
    if (presetId && PRESETS[presetId]) {
        const p = PRESETS[presetId];
        prompt = p.text;
        ratio = aspectRatio || p.aspect_ratio;
    } else if (customPrompt && customPrompt.trim()) {
        prompt = customPrompt.trim();
        ratio = aspectRatio || '16:9';
    } else {
        throw new Error('Either presetId (1 or 2) or customPrompt is required');
    }

    if (!SUPPORTED_ASPECT_RATIOS.includes(ratio)) {
        throw new Error(`Unsupported aspect ratio "${ratio}". Use one of: ${SUPPORTED_ASPECT_RATIOS.join(', ')}`);
    }

    // Kling caps prompt at 2500 chars — fail clearly before the API does
    const KLING_PROMPT_MAX = 2500;
    if (prompt.length > KLING_PROMPT_MAX) {
        throw new Error(
            `Prompt is ${prompt.length} characters — Kling allows max ${KLING_PROMPT_MAX}. ` +
            `Please shorten your prompt by ${prompt.length - KLING_PROMPT_MAX} characters.`
        );
    }

    onProgress({ status: 'UPLOADING_BRIDE', elapsedSec: 0, message: 'Uploading bride image…' });
    const tStart = Date.now();
    const brideUrl = await uploadBufferToFal(brideBuffer, brideFilename);

    onProgress({
        status: 'UPLOADING_DRESS',
        elapsedSec: (Date.now() - tStart) / 1000,
        message: 'Uploading dress image…'
    });
    const dressUrl = await uploadBufferToFal(dressBuffer, dressFilename);

    onProgress({
        status: 'GENERATING',
        elapsedSec: (Date.now() - tStart) / 1000,
        message: 'Calling Kling O1 Reference (typically 30-90s)…'
    });

    const fal = await getFal();
    const result = await fal.subscribe(MODEL_ID, {
        input: {
            prompt,
            elements: [
                // Kling validation requires reference_image_urls to have 1-3 entries
                // (docs say optional but server enforces non-empty). Reuse frontal URL
                // when only one photo per element was uploaded.
                { frontal_image_url: brideUrl, reference_image_urls: [brideUrl] },  // @Element1 → bride
                { frontal_image_url: dressUrl, reference_image_urls: [dressUrl] }   // @Element2 → dress
            ],
            duration: String(duration),
            aspect_ratio: ratio,
            generate_audio: true   // O3 native wedding audio
        },
        logs: true,
        onQueueUpdate: (update) => {
            const elapsedSec = (Date.now() - tStart) / 1000;
            if (update.status === 'IN_PROGRESS') {
                update.logs?.forEach((log) => {
                    onProgress({ status: 'GENERATING', elapsedSec, message: log.message });
                });
            } else {
                onProgress({ status: update.status, elapsedSec, message: `Status: ${update.status}` });
            }
        }
    });

    const totalSec = (Date.now() - tStart) / 1000;
    if (!result?.data?.video?.url) {
        throw new Error('No video URL returned from Kling');
    }

    return {
        videoUrl: result.data.video.url,
        seed: result.data.seed,
        totalSec,
        prompt,
        aspectRatio: ratio,
        brideUrl,
        dressUrl,
        model: MODEL_ID
    };
}

module.exports = {
    PRESETS,
    MODEL_ID,
    SUPPORTED_ASPECT_RATIOS,
    generateReferenceVideo,
    uploadBufferToFal
};
