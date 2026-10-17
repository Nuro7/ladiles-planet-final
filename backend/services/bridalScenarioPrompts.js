/**
 * bridalScenarioPrompts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CINEMATIC PROMPT LIBRARY for Higgsfield video generation (Seedance / Kling).
 *
 * Two prompt sources:
 *   1. PRESET SCENARIOS — 5 expertly-tuned prompts (Stage Entry, Mandap, etc.)
 *   2. CUSTOM PROMPT  — user types whatever, we auto-enhance with:
 *        a) Identity-lock language (bride + dress reference preservation)
 *        b) Cinematic style (lens, lighting, camera movement)
 *        c) Negative prompt bundle (anti-plastic, anti-cartoon, anti-artifacts)
 *
 * Each scenario emits:
 *   { prompt, negativePrompt, duration, aspect_ratio, resolution, scenarioLabel }
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
//  IDENTITY LOCK — shared block describing what to preserve from references
// ─────────────────────────────────────────────────────────────────────────────
const IDENTITY_LOCK = `
IDENTITY: The bride is the EXACT woman in the reference image — preserve her face, skin tone, eyes, lips, jawline, hair, and body proportions perfectly. Do NOT use any other face. She is the ONLY bride in this scene.

OUTFIT: She wears the EXACT bridal lehenga/dress shown in the reference image — preserve every embroidery thread, scalloped fan pattern, multicolor work, fabric texture, neckline, and dupatta design. Do NOT modify, recolor, or redesign the outfit in any way.

JEWELRY: Heavy luxurious bridal jewelry visible — gold matha patti on forehead, jhumka earrings, layered gold rani-haar necklaces, gold nath nose ring, gold kangan bangles, mehndi-covered hands with intricate henna.

DUPATTA: Red bridal dupatta draped in traditional Pakistani style — covering hair, falling gracefully down both shoulders, slight breeze movement.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
//  CINEMA STYLE — shared block for camera & visual quality
// ─────────────────────────────────────────────────────────────────────────────
const CINEMA_STYLE = `
CAMERA: Shot on Sony FX3 / RED Komodo cinema camera, 85mm portrait lens, T1.4 aperture, shallow depth of field, beautiful bokeh, anamorphic flares. Slow cinematic dolly-in. Subtle handheld realism. 4K cinematic quality.

LIGHTING: Warm golden hour glow, soft key light from camera-left, gentle rim lighting on jewelry and embroidery, soft fill bouncing off floral decor.

REALISM: Photorealistic skin texture with visible pores, natural micro-expressions, realistic fabric physics (silk flow, dupatta motion), accurate jewelry reflections, natural blinking, subtle breathing motion.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
//  NEGATIVE PROMPT — bundle that blocks common bad outputs
// ─────────────────────────────────────────────────────────────────────────────
const NEGATIVE_PROMPT = [
    // Identity / character drift
    'face change', 'face morph', 'face swap', 'wrong face', 'different bride',
    'multiple brides', 'duplicate bride', 'identity drift', 'character drift',
    'distorted face', 'asymmetric face',
    // Outfit drift
    'dress change', 'altered embroidery', 'recolored lehenga', 'different lehenga',
    'wrong outfit', 'fabric morph', 'redesigned dress',
    // Quality / artifact
    'plastic skin', 'wax skin', 'doll skin', 'overexposed skin', 'orange skin',
    'cartoon look', 'illustration', 'painting', 'sketch', 'CGI look', '3D render',
    'low quality', 'blurry', 'pixelated', 'noise', 'watermark', 'text overlay',
    'compressed artifacts',
    // Anatomy
    'warped hands', 'extra fingers', 'missing fingers', 'six fingers',
    'distorted hands', 'fused fingers', 'extra limbs', 'extra arms',
    'bad anatomy', 'malformed body', 'long neck',
    // Scene
    'random people', 'extra people', 'duplicate people', 'crowd in foreground',
    'cluttered background', 'floating objects', 'broken jewellery',
    'missing jewellery', 'changed jewellery placement',
    // Motion
    'jump cut', 'fast cuts', 'flicker', 'jitter', 'shaky camera', 'glitch',
    'frozen pose', 'unnatural movement', 'robotic motion'
].join(', ');

// ─────────────────────────────────────────────────────────────────────────────
//  KEYWORD-AWARE SCENE EXPANDER
//  Detects common wedding-action keywords in user input and injects matching
//  scene direction blocks with camera angles, lighting, and motion. Falls
//  back to a graceful generic scene when nothing matches.
//  This is the "secret sauce" that makes "bride rotating scene" → rich 360°
//  orbit direction without any external API call.
// ─────────────────────────────────────────────────────────────────────────────
function expandSceneFromKeywords(userText) {
    const text = (userText || '').trim();
    const lower = text.toLowerCase();
    const hints = [];

    if (/rotat|spin|twirl|circle/.test(lower)) {
        hints.push('Bride spins gracefully under hanging chandeliers as her lehenga flares wide in a glowing arc. Dupatta lifts in slow motion. Camera: 360° orbit around her, ground-level then rising. Shutter held just slow enough to soften the spin into a dreamy blur.');
    }
    if (/walk|enter|aisle|pathway/.test(lower)) {
        hints.push("Bride steps forward gracefully along a flower-petal pathway. Long dupatta trails behind. Each step is a beat in the music. Camera: slow front dolly with subtle handheld realism, then 3/4 side tracking shot at 85mm.");
    }
    if (/hug|embrace/.test(lower)) {
        hints.push('Bride and groom share an emotional embrace. Bride closes her eyes peacefully against his shoulder. Camera: slow cinematic push-in, shallow depth of field, dreamy bokeh of fairy lights behind them.');
    }
    if (/kiss/.test(lower)) {
        hints.push("Groom gently lifts bride's chin and kisses her forehead. Bride's eyelashes lower softly. Camera: tight 85mm close-up on the kiss; cuts to a side silhouette against warm stage lights.");
    }
    if (/confetti|petal|sparkle|firework/.test(lower)) {
        hints.push("Heavy red rose-petal confetti rains from above in slow motion. Sparkler fountains burst on both sides of the stage. Crowd cheers. Camera: low-angle wide capturing the entire celebration, then a tight close-up of confetti landing on bride's lehenga.");
    }
    if (/sit|seat|sofa|chair|throne/.test(lower)) {
        hints.push('Bride seated on a luxury cream-and-gold chaise lounge, lehenga fanned out beautifully around her. Groom seated beside her, holding her hand. Camera: medium romantic shot, then slow push-in over the shoulder.');
    }
    if (/dance|sangeet|music/.test(lower)) {
        hints.push('Bride performs a slow elegant Bollywood-classical move under coloured LED stage lights. Disco haze. Confetti and golden glitter rain. Camera: low orbit shot, slow-motion arm extension, then tight twirl close-up.');
    }
    if (/dupatta|veil|reveal/.test(lower)) {
        hints.push("Groom slowly lifts the front veil of the bride's dupatta with both hands. Bride's emotional smile is revealed. Camera: tight close-up on the veil lifting, soft rim light catching her face.");
    }
    if (/portrait|closeup|close.?up|face/.test(lower)) {
        hints.push('Tight 85mm beauty portrait of the bride looking softly into the camera. Dupatta framing her face. Mehndi-covered hand near her cheek. Catchlights in her eyes. Visible skin pores, glossy lips, intricate jewelry detail.');
    }

    if (hints.length === 0) {
        hints.push(`Bride embodies the scene "${text}" with graceful regal movement, gentle smile, dupatta beautifully draped over her head. Audience reactions in soft bokeh. Camera: cinematic medium shot, slow steadycam dolly, shallow depth of field, warm rim light catching jewelry detail.`);
    }
    return hints.map((h, i) => `SCENE ${i + 1} — ${h}`).join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
//  CUSTOM-PROMPT ENHANCER — wraps user input with identity + cinema + negatives
//  Now also injects keyword-aware scene blocks so the client can type 2-3
//  keywords ("bride rotating scene") and get production-grade direction
//  WITHOUT any external API call.
// ─────────────────────────────────────────────────────────────────────────────
function enhanceCustomPrompt(userText) {
    const cleaned = (userText || '').trim();
    return `Luxury Pakistani/Indian wedding cinematic film.

${IDENTITY_LOCK}

USER SCENE: ${cleaned}

${expandSceneFromKeywords(cleaned)}

${CINEMA_STYLE}

ATMOSPHERE: Premium Pakistani luxury wedding ambience — crowded emotional audience in soft bokeh, hanging white flowers, fairy-lit arches, warm cream-and-gold stage lighting, cinematic smoke haze, dreamy floating particles.

One bride only. No duplicate people. Preserve bride identity and outfit EXACTLY as in the reference images. Photorealistic, premium bridal videography. 4K cinematic quality.`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SCENARIO DEFINITIONS — cinematic, detailed, production-ready
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIOS = {

    stage_entry: {
        id          : 'stage_entry',
        label       : 'Bride Entry',
        emoji       : '🌹',
        description : 'Grand wedding hall bride entry with audience',
        referenceImages: [],
        prompt: `Create an ultra-realistic cinematic luxury Pakistani/Muslim wedding stage video using ONLY:

1. uploaded bride face image as the ONLY bride identity
2. uploaded bridal dress image as the ONLY bridal outfit reference

The uploaded bride must remain EXACTLY the same woman throughout the entire video.
The uploaded lehenga/dress must remain EXACTLY identical in all scenes.

==================================================
MANDATORY IDENTITY LOCK
==================================================

Bride identity consistency is extremely important:
- same face
- same eyes
- same lips
- same smile
- same skin tone
- same body proportions
- same hairstyle structure

NO random bride generation.
NO identity switching.
NO face morphing.
NO face drift.
NO duplicate bride.

Bride must look like:
- premium Pakistani bride
- luxury bridal makeup
- soft glowing skin
- detailed eye makeup
- elegant glossy lips
- cinematic bridal glow
- luxury jewelry styling
- dupatta beautifully covering head throughout scenes

==================================================
MANDATORY DRESS LOCK
==================================================

Use uploaded bridal outfit EXACTLY:
- same embroidery
- same blouse design
- same dupatta
- same lehenga pattern
- same jewelry styling
- same colors
- same luxury texture

DO NOT redesign dress.
DO NOT simplify embroidery.
DO NOT create random bridal outfit.

==================================================
MANDATORY STAGE & ATMOSPHERE
==================================================

Entire video happens ON STAGE ONLY.

NO bride walking long distances.
NO aisle walking.
NO outdoor scenes.

Luxury wedding stage atmosphere exactly like premium Pakistani wedding reels:
- crowded emotional audience
- family members cheering
- people recording on phones
- emotional crowd reactions
- luxury floral decor
- elegant stage sofa
- glowing cream and gold stage lights
- hanging flowers
- cinematic warm lighting
- dreamy wedding ambience
- heavy red confetti rain
- sparkler fountains
- cinematic smoke haze
- soft bokeh particles

Groom mostly standing on stage waiting romantically.

==================================================
VIDEO STYLE
==================================================

Ultra realistic cinematic wedding reel.

Luxury Instagram wedding film aesthetic.

Visual quality:
- Sony FX3 cinematic wedding look
- RED Komodo color science
- shallow depth of field
- dreamy bokeh
- luxury cinematic lighting
- realistic skin texture
- smooth cinematic motion
- elegant camera movement
- premium Pakistani wedding reel look

==================================================
SCENE 1 — BRIDE ROMANTIC LOOK TO GROOM
==================================================

Bride already standing near stage crowd area.

Bride holding a small bouquet softly.

Bride looks emotionally and romantically toward groom exactly like a shy emotional wedding reveal moment.

Bride smiling softly with emotional eyes.

Crowd seated behind bride clapping and smiling emotionally.

Bride dupatta fully covering head elegantly.

Warm luxury stage lighting falling on bride face.

Bride expression:
shy,
emotional,
deeply in love,
soft smile.

Camera shots:
1. cinematic close-up of bride face while looking at groom
2. slow push-in toward emotional bride eyes
3. side-angle with blurred crowd behind
4. bouquet detail shot with mehendi close-up
5. slow-motion smile reaction shot

Mood:
romantic anticipation,
emotional wedding reveal,
luxury Pakistani bridal elegance.

==================================================
SCENE 2 — GROOM WELCOMES BRIDE ON STAGE
==================================================

NOW IMPORTANT:
Groom is NOT walking.
Groom is already standing on luxury wedding stage.

Heavy red confetti explosion from ceiling.

Bride stands slightly below stage edge.

Groom extends hand downward romantically exactly like a welcoming gesture.

Bride gently places her hand into groom hand.

Groom carefully helps bride step onto stage.

Crowd cheering emotionally around them.

Sparkler fountains active on both sides.

Heavy cinematic confetti rain.

Bride lehenga moving realistically.

Warm golden stage lights glowing beautifully.

Camera shots:
1. dramatic wide-angle confetti shot
2. cinematic hand connection close-up
3. slow-motion groom helping bride onto stage
4. emotional crowd reaction shots
5. cinematic side profile shot with confetti explosion
6. overhead confetti cinematic shot

Mood:
grand celebration,
romantic welcome,
luxury wedding moment.

==================================================
SCENE 3 — GROOM REVEALS BRIDE FACE
==================================================

Bride standing softly in front of groom under luxury glowing stage lights.

Bride face partially covered with elegant dupatta.

Groom slowly lifts front veil/dupatta softly and romantically.

Bride smiles shyly after reveal.

Heavy red confetti floating slowly around them.

Luxury glowing arches behind couple.

Camera shots:
1. cinematic veil lifting close-up
2. emotional bride smile reveal
3. side romantic silhouette shot
4. dreamy shallow-focus cinematic angle

Mood:
intimate,
luxury,
emotional romance.

==================================================
SCENE 4 — ROMANTIC FACE-TO-FACE MOMENT
==================================================

Bride and groom standing close together on stage.

Both smiling emotionally while looking into each other's eyes.

Soft romantic expressions.

Heavy red confetti slowly falling around them.

Luxury glowing arches and flowers behind them.

Camera shots:
1. emotional eye-contact close-up
2. cinematic slow circular camera movement
3. romantic medium framing
4. dreamy cinematic side-angle

==================================================
SCENE 5 — FOREHEAD KISS SCENE
==================================================

Groom gently places hand around bride waist.

Bride closes eyes emotionally.

Groom softly kisses bride forehead.

Bride smiles emotionally while lightly holding groom chest.

Soft cinematic confetti falling around them.

Luxury wedding stage glowing warmly.

Camera shots:
1. forehead kiss close-up
2. emotional side-angle shot
3. dreamy slow-motion romantic framing
4. cinematic shallow-focus intimate shot

Mood:
pure emotional romance,
luxury wedding intimacy.

==================================================
SCENE 6 — BRIDE ROTATION SCENE
==================================================

Bride and groom standing center stage.

Groom gently spins bride while holding her hand.

Bride lehenga rotates beautifully with realistic cloth simulation.

Heavy confetti rain from above.

Bride smiling joyfully during spin.

Luxury glowing stage behind them.

Camera shots:
1. full-body rotation shot
2. slow-motion lehenga flare close-up
3. orbit camera movement around couple
4. confetti-heavy cinematic angle
5. romantic wide stage shot

==================================================
SCENE 7 — FINAL SOFA ROMANTIC SCENE
==================================================

Bride and groom sitting together on luxury wedding sofa.

Both wearing elegant flower garlands.

Bride holding wedding certificate frame together with groom.

Both smiling romantically while looking into each other's eyes.

Luxury glowing cream stage behind them.

White flower decorations surrounding sofa.

Soft romantic confetti particles still floating lightly.

Camera shots:
1. romantic sofa medium shot
2. cinematic over-shoulder interaction shot
3. close-up emotional smiling shot
4. final cinematic slow zoom-out ending

Mood:
calm,
luxury,
married couple happiness,
emotional ending.

==================================================
TRANSITIONS
==================================================

Between every scene:
- dreamy cinematic fade transitions
- romantic slow-motion cuts
- luxury wedding reel transitions
- soft motion blur transitions
- emotional cinematic pacing

==================================================
AUDIO STYLE
==================================================

Luxury romantic wedding background music.

Music style:
- emotional piano intro
- romantic violin layers
- cinematic orchestral wedding music
- emotional beats during confetti scenes
- soft romantic ambience during intimate moments

Background ambience:
- crowd cheering
- emotional clapping
- confetti burst sounds
- sparkler sounds
- soft luxury wedding hall ambience

==================================================
REALISM REQUIREMENTS
==================================================

Ultra realistic:
- realistic skin texture
- realistic blinking
- realistic cloth movement
- realistic jewelry reflections
- realistic confetti physics
- realistic hand interactions
- realistic facial emotions
- realistic crowd movement
- realistic lighting interaction
- realistic body proportions`,
        negativePrompt : [
            // Anti-mannequin / anatomy bundle
            'no mannequin', 'no mannequin torso', 'no dummy body',
            'no plastic skin', 'no deformed anatomy', 'no extra hands',
            'no broken fingers', 'no floating clothes',
            'no unrealistic cloth physics',
            // Identity / dress
            'no random bride', 'no identity drift', 'no face morphing',
            'no duplicate bride', 'no flickering identity',
            'no incorrect bridal dress', 'no weird facial expressions',
            // Atmosphere / location
            'no ugly stage', 'no empty crowd', 'no low-quality audience',
            'no badly lit wedding hall', 'no outdoor scenes',
            'no aisle walking', 'no awkward stage movement',
            'no distorted confetti',
            // Motion / expression
            'no robotic movement', 'no awkward walking', 'no stiff movement',
            // Style / quality
            'no cartoon style', 'no AI artifacts', 'no low realism',
            // Plus shared safety bundle
            ...NEGATIVE_PROMPT.split(', ')
        ].join(', '),
        duration       : 8,
        aspect_ratio   : '16:9',
        resolution     : '720p'
    },

    outdoor_romantic: {
        id          : 'outdoor_romantic',
        label       : 'Outdoor',
        emoji       : '🌿',
        description : 'Romantic garden pre-wedding shoot',
        // No hidden reference images — they were confusing the AI's identity lock
        // (it was using the BRIDES from the reference photos instead of the
        // client-uploaded bride). Scene direction is now ENTIRELY in the prompt text.
        referenceImages: [],
        prompt: `Create an ultra realistic luxury outdoor pre-wedding cinematic video using ONLY:
1. uploaded bride image as the ONLY bride identity source
2. uploaded bridal dress image as the ONLY outfit source

IMPORTANT:
Do NOT generate a random bride.
Do NOT redesign the bridal outfit.
The uploaded bride must remain the exact same woman throughout the entire video.
The uploaded bridal outfit must remain perfectly identical throughout every scene.

BRIDE IDENTITY LOCK:
Preserve:
- exact uploaded bride face
- identical eyes
- identical lips
- identical nose
- identical skin tone
- identical smile
- identical facial proportions
- identical hairline
- identical hairstyle base
- identical jawline
- identical body structure

No identity drift.
No face morphing.
No random female face generation.
No beauty alteration that changes identity.

DRESS LOCK:
Use the uploaded bridal lehenga EXACTLY:
- identical embroidery
- identical blouse stitching
- identical lehenga pattern
- identical dupatta
- identical colors
- identical jewelry styling
- identical fabric texture
- identical sleeve design
- identical lehenga flare

Do NOT reinterpret or redesign the outfit.

IMPORTANT OUTFIT RULE:
The uploaded lehenga image is ONLY a dress reference.
It is NOT a mannequin character.
Extract ONLY:
- outfit embroidery
- stitching
- lehenga shape
- dupatta design
- color palette
- blouse structure
- jewelry styling

Then apply them onto a fully realistic human female body.

NEVER generate:
- mannequin body
- dress stand
- dummy torso
- plastic waist
- floating outfit
- disconnected dress body

BRIDAL STYLING:
Transform the uploaded bride into a luxury Pakistani/Indian bridal photoshoot look:
- premium bridal makeup
- glossy lips
- soft glowing skin
- elegant eyelashes
- rich bridal jewelry
- layered necklace
- maang tikka
- bridal earrings
- elegant bangles
- dupatta beautifully draped over head and shoulders

GROOM:
Generate a random handsome groom:
- masculine face
- premium hairstyle
- elegant ivory sherwani
- luxury groom styling
- romantic expressions
- realistic male anatomy
- natural behavior

The groom must NEVER resemble the bride.
Never apply bride identity to groom.

ENVIRONMENT:
Luxury tropical outdoor garden photoshoot:
- lush greenery
- cinematic tropical plants
- soft natural daylight
- dreamy romantic atmosphere
- elegant garden pathways
- luxury wedding photoshoot ambience
- soft cloudy daylight
- cinematic greenery background

VIDEO STYLE:
Ultra realistic luxury wedding cinematic reel,
high-end Indian/Pakistani wedding film,
Seedance 2.0 realism,
Kling 3.0 cinematic consistency,
Sony FX3 + RED cinema camera look,
warm romantic tones,
premium Instagram wedding reel aesthetic,
natural human movement,
luxury wedding storytelling.

VIDEO FLOW:
Create smooth cinematic transitions and soft slow-motion cuts between every scene.
The video should feel like one connected premium cinematic wedding film.

SCENE 1 — HAND HOLDING WALK
Bride and groom slowly walking together through luxury tropical garden while holding hands.
Bride lehenga flows naturally while walking.
Bride and groom look emotionally at each other while smiling softly.

Camera:
cinematic side tracking shot,
slow-motion movement,
steadycam wedding film style,
wide romantic composition.

SCENE 2 — ROMANTIC CLOSE WALK
Bride walking slightly behind groom while holding his hand gently.
Groom looks back emotionally toward bride.
Bride smiles softly.
Dupatta moves naturally in wind.

Camera:
medium cinematic tracking shot,
slight handheld movement,
shallow depth of field.

SCENE 3 — HEAD ON SHOULDER HUG
Bride softly rests her head emotionally on groom shoulder while both hug each other lovingly.
Bride closes eyes peacefully.
Luxury tropical greenery softly blurred behind them.

Camera:
slow cinematic push-in shot,
medium closeup framing,
dreamy romantic focus.

SCENE 4 — FULL BODY HUG SHOT
Wide cinematic shot of bride and groom hugging in middle of lush green garden.
Bride lehenga spread beautifully.
Luxury cinematic outdoor atmosphere.

Camera:
slow cinematic pullback shot,
drone-like smooth movement,
epic romantic wedding feel.

SCENE 5 — MAANG TIKKA MOMENT
Groom gently adjusts bride maang tikka while bride smiles emotionally.
Bride eyes sparkle naturally.
Jewelry reflections visible.

Camera:
85mm portrait closeup,
soft romantic focus,
luxury bridal photoshoot framing.

SCENE 6 — BRIDAL PORTRAIT CLOSEUP
Close cinematic portrait of bride smiling softly toward groom.
Bride face remains perfectly identical to uploaded image.
Luxury makeup visible.
Natural blinking and breathing.

Camera:
slow cinematic push-in portrait shot,
shallow depth of field,
dreamy bokeh background.

SCENE 7 — LEHENGA FLOW SHOT
Bride slowly turning while lehenga flows naturally around her.
Dupatta moves elegantly in soft wind.
Bride smiling softly.

Camera:
slow cinematic orbit movement,
luxury bridal fashion film style.

SCENE 8 — FINAL ROMANTIC WALK
Bride and groom walking away together through tropical garden pathway while holding hands.
Soft sunlight through greenery.
Luxury cinematic ending shot.

Camera:
slow pullback cinematic shot,
emotional romantic ending,
premium wedding film atmosphere.

MANDATORY REALISM:
- ultra realistic skin texture
- realistic human anatomy
- realistic hand interaction
- realistic cloth movement
- realistic lehenga physics
- realistic dupatta movement
- realistic jewelry reflections
- realistic hair movement
- realistic eye movement
- natural blinking
- subtle breathing motion
- realistic camera shake
- authentic wedding videography feel
- cinematic emotional chemistry
- realistic outdoor lighting
- realistic walking motion

CAMERA STYLE:
- cinematic handheld movement
- soft slow motion
- shallow depth of field
- luxury wedding framing
- dreamy bokeh background
- smooth wedding reel transitions
- premium cinematic pacing

CRITICAL CHARACTER & BODY CONSISTENCY RULES:
- bride body must be fully human female anatomy
- replace mannequin completely with realistic human torso
- no mannequin body parts
- no mannequin waist
- no mannequin stomach
- no mannequin chest structure
- no dress stand
- no dummy body
- no plastic mannequin texture
- no hollow stomach
- no disconnected torso
- no floating lehenga
- lehenga must be worn naturally by bride body
- realistic female waist under outfit
- realistic female chest proportions
- realistic body movement inside lehenga
- natural body physics under dress
- realistic shoulder structure
- realistic neck connection
- realistic human posture

IDENTITY APPLICATION RULE:
Apply uploaded bride face ONLY to the female bride character wearing the lehenga.
Never apply bride identity to groom.
Never separate face and body.
Bride must be generated as one complete realistic human woman.`,
        negativePrompt : [
            // Anti-mannequin / body-disconnection bundle (new)
            'no mannequin', 'no mannequin torso', 'no mannequin stomach',
            'no mannequin chest', 'no mannequin body', 'no dummy body',
            'no dress stand', 'no fashion mannequin', 'no floating outfit',
            'no disconnected body', 'no plastic torso', 'no hollow abdomen',
            'no artificial waist', 'no showroom dummy', 'no clothing display stand',
            'no faceless body', 'no detached dress', 'no half body',
            'no broken torso', 'no unrealistic female anatomy',
            'no dress without human body',
            // Identity / dress / anatomy
            'no split identity', 'no merged characters',
            'no bride face on groom', 'no face swapping', 'no identity confusion',
            'no duplicate bride', 'no mixed identities', 'no identity blending',
            'no random bride face', 'no dress redesign', 'no warped anatomy',
            'no extra limbs', 'no distorted hands', 'no broken fingers',
            'no unrealistic movement', 'no cloned people', 'no CGI look',
            'no cartoon look', 'no plastic skin', 'no AI artifacts',
            'no flickering identity', 'no inconsistent lehenga',
            'no unnatural expressions', 'no low quality facial details',
            // Plus the shared bundle for extra safety
            ...NEGATIVE_PROMPT.split(', ')
        ].join(', '),
        duration       : 8,
        aspect_ratio   : '16:9',
        resolution     : '720p'
    },

};

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the full prompt config for a scenario, OR build an enhanced custom prompt.
 *
 * @param {string} scenarioKey - 'stage_entry' | 'mandap_moment' | ... | 'custom'
 * @param {string} [customText] - User-typed text when scenarioKey === 'custom'
 * @returns {{
 *   prompt: string,
 *   negativePrompt: string,
 *   duration: number,
 *   aspect_ratio: string,
 *   resolution: string,
 *   scenarioLabel: string
 * }}
 */
function getPrompt(scenarioKey, customText = '') {
    // Custom prompt — enhance with identity-lock + cinema style + negatives
    if (scenarioKey === 'custom') {
        if (!customText || customText.trim().length < 3) {
            throw new Error('Custom prompt requires at least 3 characters');
        }
        return {
            prompt         : enhanceCustomPrompt(customText),
            negativePrompt : NEGATIVE_PROMPT,
            duration       : 5,
            aspect_ratio   : '16:9',
            resolution     : '720p',
            scenarioLabel  : 'Custom (AI-enhanced)'
        };
    }

    // Preset scenario
    const scenario = SCENARIOS[scenarioKey];
    if (!scenario) {
        throw new Error(`Unknown scenario: ${scenarioKey}. Available: ${Object.keys(SCENARIOS).join(', ')} or 'custom'`);
    }

    return {
        prompt         : scenario.prompt,
        negativePrompt : scenario.negativePrompt,
        duration       : scenario.duration,
        aspect_ratio   : scenario.aspect_ratio,
        resolution     : scenario.resolution,
        scenarioLabel  : scenario.label,
        // Hidden style-anchor references — invisible to the client UI but
        // sent to the AI engine as additional medias for style consistency
        referenceImages: scenario.referenceImages || []
    };
}

/**
 * List all available scenarios for the frontend.
 * @returns {Array<{ id, label, emoji, description }>}
 */
function listScenarios() {
    return Object.values(SCENARIOS).map(s => ({
        id          : s.id,
        label       : s.label,
        emoji       : s.emoji,
        description : s.description
    }));
}

/**
 * Preview the enhanced version of a custom prompt without generating a video.
 * Useful for showing the user what their typed prompt becomes after enhancement.
 */
function previewEnhancement(userText) {
    return {
        original       : userText,
        enhanced       : enhanceCustomPrompt(userText),
        negativePrompt : NEGATIVE_PROMPT
    };
}

module.exports = {
    getPrompt,
    listScenarios,
    previewEnhancement,
    enhanceCustomPrompt,
    SCENARIOS,
    NEGATIVE_PROMPT
};
