/**
 * bridalImagePrompts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * FASHION POSE PROMPT LIBRARY for Higgsfield image generation.
 *
 * Each pose emits:
 *   { id, label, emoji, description, prompt, negativePrompt,
 *     aspectRatio, resolution }
 *
 * Used by the Image Studio to produce poster-style bridal stills with the
 * uploaded bride + dress as references. The Ladies Planet logo is overlaid
 * client-side after the image is generated.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Shared identity-lock block — keeps bride face + dress identical across poses
const IDENTITY_LOCK = `
IDENTITY LOCK:
The bride is the EXACT woman shown in the uploaded reference image.
Preserve her face, eyes, lips, smile, jawline, skin tone, hair, and body proportions PERFECTLY.
Do NOT generate a random bride. Do NOT alter her facial structure.

DRESS LOCK:
She is wearing the EXACT bridal outfit shown in the uploaded reference image.
Preserve every embroidery thread, color, pattern, dupatta design, blouse stitching, and fabric texture.
Do NOT redesign or simplify the outfit in any way.

JEWELRY: Heavy luxurious bridal jewelry — matha patti, jhumka earrings, layered rani-haar necklace, nath nose ring, kangan bangles, mehndi on hands.
`.trim();

const FASHION_QUALITY = `
QUALITY: Ultra-realistic luxury bridal fashion photography. Shot on Sony A7R V with 85mm portrait lens at f/1.8. Premium magazine cover quality. Photorealistic skin texture with visible pores. Sharp focus on bride, soft creamy bokeh background. Vogue-grade lighting. 4K detail. Crisp embroidery threads. Realistic jewelry reflections. Hyperdetail.
`.trim();

const NEG = [
    'face change', 'face morph', 'random bride', 'wrong face',
    'multiple brides', 'duplicate bride', 'identity drift',
    'distorted face', 'plastic skin', 'wax skin', 'cartoon look',
    'CGI look', 'illustration', 'painting', 'sketch', '3D render',
    'dress change', 'altered embroidery', 'recolored lehenga',
    'redesigned dress', 'fabric morph', 'wrong outfit',
    'mannequin', 'dress stand', 'dummy body', 'floating outfit',
    'warped hands', 'extra fingers', 'six fingers', 'distorted hands',
    'fused fingers', 'extra limbs', 'bad anatomy', 'long neck',
    'low quality', 'blurry', 'pixelated', 'watermark', 'text overlay',
    'compressed artifacts', 'logo', 'caption',
].join(', ');

// ─────────────────────────────────────────────────────────────────────────────
//  POSE DEFINITIONS — luxury bridal fashion stills
// ─────────────────────────────────────────────────────────────────────────────
const POSES = {

    royal_seated: {
        id          : 'royal_seated',
        label       : 'Royal Seated Bride',
        emoji       : '👑',
        description : 'Moody luxury hotel room portrait, lehenga fanned in circular flow',
        prompt: `Create an ultra-realistic cinematic luxury bridal portrait using ONLY:
1. uploaded bride face image as the ONLY bride identity
2. uploaded bridal dress image as the ONLY bridal outfit reference

The uploaded bride must remain EXACTLY the same woman.
The uploaded bridal lehenga must remain EXACTLY identical.

==================================================
MANDATORY IDENTITY LOCK
==================================================

Bride identity consistency is extremely important:
- same face
- same eyes
- same lips
- same nose
- same jawline
- same smile
- same skin tone
- same hairstyle structure
- same body proportions

NO random bride generation.
NO face morphing.
NO identity drift.
NO duplicate bride.
NO beauty transformation that changes recognition.

Bride must look:
- premium Pakistani bride
- ultra luxurious bridal makeup
- glowing soft skin
- cinematic bridal beauty
- elegant bridal expression
- soft emotional romantic mood

==================================================
MANDATORY DRESS LOCK
==================================================

Use uploaded bridal outfit EXACTLY:
- same lehenga
- same blouse
- same embroidery
- same dupatta
- same jewelry styling
- same color palette
- same luxury texture

DO NOT redesign outfit.
DO NOT simplify embroidery.
DO NOT generate random dress.

==================================================
SCENE DESCRIPTION
==================================================

Create a cinematic indoor bridal portrait scene.

Bride sitting gracefully on wooden floor in a luxury hotel room or bridal preparation room.

Bride sitting in elegant royal posture with lehenga naturally spread around her in a huge circular flow.

Bride slightly turned sideways with soft emotional expression.

One hand gently resting on lap/stomach area.
Other hand softly touching dupatta near chest.

Bride looking slightly downward with calm emotional bridal expression.

Bride dupatta fully covering head beautifully like a premium Pakistani bridal style.

Heavy detailed bridal jewelry:
- maang tikka
- necklace
- earrings
- bangles
- mehendi hands

==================================================
LIGHTING & ATMOSPHERE
==================================================

Moody cinematic warm indoor lighting.

A tall luxury floor lamp glowing warmly beside bride exactly like a luxury bridal photoshoot.

Deep red and warm orange lighting atmosphere.

Large dark maroon curtains in background.

Soft shadows and dramatic cinematic contrast.

Wooden flooring visible.

Luxury romantic bridal room ambience.

Dreamy cinematic mood.

==================================================
CAMERA & COMPOSITION
==================================================

Full body bridal portrait shot.

Camera slightly low angle for royal bridal presence.

Bride centered elegantly in frame.

Lehenga spread occupying most of lower frame beautifully.

Shallow depth of field.

Sony A7R IV luxury bridal photography look.

85mm lens cinematic portrait style.

High-end wedding photography aesthetic.

Ultra realistic luxury Pakistani wedding photoshoot look.

==================================================
VISUAL QUALITY
==================================================

Ultra realistic.
Extremely detailed embroidery.
Realistic skin texture.
Realistic jewelry reflections.
Realistic cloth folds.
Realistic lighting interaction.
Luxury bridal cinematic grading.
Soft glowing highlights.
Natural shadows.
Rich warm tones.
Professional wedding photoshoot quality.

==================================================
BRIDAL EXPRESSION
==================================================

Bride expression must feel:
- shy
- emotional
- elegant
- luxurious
- calm
- royal
- romantic

NO exaggerated smile.
NO awkward pose.
NO fashion-model expression.

==================================================
REALISM DETAILS
==================================================

Natural human anatomy.
Natural fingers.
Natural hands.
Natural sitting posture.
Realistic dupatta transparency.
Realistic lehenga physics.
Realistic bridal makeup texture.
Realistic eyelashes and eyes.`,
        negativePrompt : [
            'no mannequin', 'no mannequin torso', 'no dummy body',
            'no plastic skin', 'no random bride', 'no duplicate bride',
            'no face morphing', 'no identity drift',
            'no extra fingers', 'no broken hands', 'no deformed anatomy',
            'no bad sitting posture', 'no unrealistic lehenga',
            'no low detail embroidery',
            'no cartoon style', 'no anime style',
            'no bad lighting', 'no ugly shadows', 'no blurry face',
            'no distorted jewelry', 'no cheap background',
            'no outdoor scene', 'no extra people',
            'no AI artifacts', 'no unrealistic skin', 'no stretched body',
            'no overexposed lighting', 'no weird facial expression',
            'no low quality textures', 'no modern western fashion pose',
        ].join(', '),
        aspectRatio  : '3:4',
        resolution   : '2k',
    },

    floral_stage: {
        id          : 'floral_stage',
        label       : 'Floral Stage Bride',
        emoji       : '🌸',
        description : 'Royal stage portrait, floral arch backdrop, warm spotlight',
        prompt: `Create an ultra-realistic cinematic luxury bridal portrait using ONLY:
1. uploaded bride face image as the ONLY bride identity
2. uploaded bridal dress image as the ONLY bridal outfit reference

The uploaded bride must remain EXACTLY the same woman throughout the image.
The uploaded lehenga/dress must remain EXACTLY identical.

==================================================
MANDATORY IDENTITY LOCK
==================================================

Bride identity consistency is extremely important:
- same face
- same eyes
- same lips
- same nose
- same jawline
- same skin tone
- same body proportions
- same hairstyle structure

NO random bride generation.
NO identity switching.
NO face morphing.
NO beauty transformation changing facial identity.
NO duplicate bride.

Bride must look:
- premium Pakistani bride
- luxury bridal makeup
- cinematic bridal beauty
- glowing soft skin
- elegant bridal expression
- royal wedding queen aesthetic

==================================================
MANDATORY DRESS LOCK
==================================================

Use uploaded bridal outfit EXACTLY:
- same lehenga
- same embroidery
- same dupatta
- same blouse
- same jewelry styling
- same colors
- same luxury texture

DO NOT redesign outfit.
DO NOT simplify embroidery.
DO NOT generate random bridal dress.

==================================================
SCENE DESCRIPTION
==================================================

Create a cinematic luxury wedding stage portrait.

Bride standing gracefully alone on a premium decorated wedding stage.

Bride standing in elegant royal posture with hands softly folded together near waist exactly like a luxury bridal photoshoot.

Bride looking slightly sideways and upward with calm royal expression.

Bride dupatta fully covering head beautifully in premium Pakistani bridal style.

Bride expression:
- elegant
- royal
- calm
- luxurious
- emotionally graceful

Heavy bridal jewelry:
- maang tikka
- layered necklace
- earrings
- bangles
- nose ring if suitable
- detailed mehendi

==================================================
STAGE & BACKGROUND
==================================================

Luxury wedding stage exactly like a premium Pakistani wedding setup.

Large elegant floral arch behind bride.

Soft cream floral decorations:
- roses
- pastel flowers
- hanging flowers
- floral side arrangements

Elegant white arch/window-style backdrop structure behind bride.

Luxury wedding stage atmosphere.

Dark surrounding environment with focused warm spotlight on bride.

Soft cinematic shadows behind bride.

==================================================
LIGHTING STYLE
==================================================

Warm cinematic spotlight lighting.

Luxury wedding photography lighting.

Bride illuminated beautifully from upper front side.

Background slightly darker for dramatic contrast.

Soft golden glow on face and jewelry.

Deep cinematic shadows.

Dreamy wedding mood.

==================================================
CAMERA & COMPOSITION
==================================================

Full-body bridal portrait shot.

Bride centered elegantly in frame.

Vertical composition for wedding poster/reel aesthetic.

Camera slightly low angle for royal appearance.

Shallow depth of field.

Sony A7R IV luxury wedding photography look.

85mm lens cinematic bridal portrait style.

Professional wedding photography aesthetic.

==================================================
VISUAL QUALITY
==================================================

Ultra realistic.
Hyper detailed embroidery.
Realistic jewelry reflections.
Realistic skin texture.
Luxury cinematic color grading.
Soft glowing highlights.
Natural shadows.
Rich warm wedding tones.
Professional luxury wedding photoshoot quality.

==================================================
MOOD & ATMOSPHERE
==================================================

Mood should feel:
- royal
- luxurious
- elegant
- cinematic
- premium Pakistani wedding
- dreamy bridal portrait
- emotional bridal calmness

==================================================
REALISM DETAILS
==================================================

Natural human anatomy.
Natural fingers and hands.
Realistic bridal posture.
Realistic lehenga folds.
Realistic dupatta transparency.
Realistic lighting interaction.
Realistic facial details.
Realistic jewelry shine.
Natural eye reflections.`,
        negativePrompt : [
            'no mannequin', 'no mannequin torso', 'no plastic skin',
            'no random bride', 'no duplicate bride', 'no face morphing',
            'no identity drift', 'no extra fingers', 'no broken anatomy',
            'no deformed hands', 'no awkward posture',
            'no ugly background', 'no bad stage design',
            'no cartoon style', 'no anime style', 'no low detail embroidery',
            'no blurry face', 'no distorted jewelry',
            'no overexposed lighting', 'no flat lighting', 'no unrealistic shadows',
            'no AI artifacts', 'no outdoor scene', 'no extra people',
            'no fashion runway pose', 'no cheap wedding setup',
            'no western bridal styling', 'no unrealistic skin texture',
            'no badly generated flowers', 'no stretched body proportions',
        ].join(', '),
        aspectRatio  : '3:4',
        resolution   : '2k',
    },

    custom: {
        id          : 'custom',
        label       : 'Custom Pose',
        emoji       : '✏️',
        description : 'Write your own pose direction — AI auto-enhances',
        prompt      : '',  // user-provided
        negativePrompt: NEG,
        aspectRatio : '3:4',
        resolution  : '2k',
    },
};

// ─────────────────────────────────────────────────────────────────────────────
//  KEYWORD-AWARE POSE EXPANDER
//  Detects common bridal-pose keywords and injects matching body posture +
//  framing direction. No external API call needed.
// ─────────────────────────────────────────────────────────────────────────────
function expandPoseFromKeywords(userText) {
    const text = (userText || '').trim();
    const lower = text.toLowerCase();
    const blocks = [];

    if (/sit|seat|sofa|chair|throne|chaise|lounge/.test(lower)) {
        blocks.push('POSE: Bride seated gracefully on a luxury cream-and-gold chaise lounge, body angled 3/4 toward camera, legs crossed delicately, lehenga spreading beautifully in a full circle around her. One hand resting softly on lap, other lifting dupatta edge.');
    }
    if (/walk|stride|step/.test(lower)) {
        blocks.push('POSE: Bride captured mid-stride in a graceful walking pose, body angled slightly toward camera, one leg stepping forward. Lehenga flowing naturally with motion. Confident graceful expression looking toward camera.');
    }
    if (/side|profile/.test(lower)) {
        blocks.push('POSE: Full side profile of the bride, body turned 90°, head looking forward with a graceful downward gaze, eyelashes catching the light. Dupatta dramatically draped from head and falling backwards in a graceful arc.');
    }
    if (/closeup|close.?up|portrait|beauty/.test(lower)) {
        blocks.push('POSE: Tight beauty portrait from collarbone up, head tilted slightly to camera-right revealing one earring. Dupatta covering hair, draped behind shoulders. Hand near face holding the dupatta edge so the mehndi is visible.');
    }
    if (/spin|twirl|rotat|turn/.test(lower)) {
        blocks.push('POSE: Bride captured mid-twirl with lehenga flaring out in a glowing arc around her. Dupatta lifted by motion. Body angled with one foot stepping forward, joyful smile. Camera: 3/4 angle, slow shutter just enough to soften motion edges.');
    }
    if (/full.?body|standing|head.?to.?toe|glam/.test(lower)) {
        blocks.push('POSE: Full-body standing shot showcasing the bridal lehenga from head to toe. Confident regal posture. Body angled 3/4 toward camera. One leg slightly forward to reveal lehenga flare. Hands holding dupatta edges out so it spreads wide.');
    }

    if (blocks.length === 0) {
        blocks.push(`POSE: Bride embodies "${text}" with elegant regal posture, dupatta beautifully draped over her head, hands gracefully positioned. Soft confident smile, calm romantic gaze toward camera.`);
    }
    return blocks.join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
//  CUSTOM-POSE ENHANCER — wraps user input with identity + fashion + negatives
//  Now also injects keyword-aware pose blocks so simple keywords expand into
//  rich poster-direction WITHOUT any external API call.
// ─────────────────────────────────────────────────────────────────────────────
function enhanceCustomPose(userText) {
    const cleaned = (userText || '').trim();
    return `Luxury Pakistani/Indian bridal fashion editorial photograph.

${IDENTITY_LOCK}

USER DIRECTION: ${cleaned}

${expandPoseFromKeywords(cleaned)}

LIGHTING: Soft Rembrandt key light from camera-left, warm golden glow. Gentle fill on the opposite side. Glowing rim light on hair and jewelry. Honey-tone color grade.

BACKGROUND: Cream and gold luxury studio backdrop with hanging white flowers blurred into creamy bokeh. Soft fairy-light particles. Marble floor with subtle reflection.

${FASHION_QUALITY}

One bride only. No duplicate people. Preserve bride identity and outfit EXACTLY as in the reference images. Premium magazine cover quality. No text, no watermarks, no captions in the image.`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function listPoses() {
    return Object.values(POSES).map(p => ({
        id          : p.id,
        label       : p.label,
        emoji       : p.emoji,
        description : p.description,
        aspectRatio : p.aspectRatio,
    }));
}

function getPose(poseId, customPrompt = '') {
    const pose = POSES[poseId] || POSES.front_portrait;

    if (pose.id === 'custom') {
        return {
            poseLabel     : 'Custom Pose',
            prompt        : enhanceCustomPose(customPrompt),
            negativePrompt: pose.negativePrompt,
            aspectRatio   : pose.aspectRatio,
            resolution    : pose.resolution,
        };
    }
    return {
        poseLabel     : pose.label,
        prompt        : pose.prompt,
        negativePrompt: pose.negativePrompt,
        aspectRatio   : pose.aspectRatio,
        resolution    : pose.resolution,
    };
}

function previewEnhancement(userText) {
    return {
        original    : userText || '',
        enhanced    : enhanceCustomPose(userText),
        negativePrompt: NEG,
    };
}

module.exports = { listPoses, getPose, previewEnhancement, enhanceCustomPose };
