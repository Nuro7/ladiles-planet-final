const path = require('node:path');
const { readFileSync, existsSync } = require('node:fs');
const { withBridalOrnaments } = require('./bridalOrnamentsPrompt');
const tiers = [
  { id:'ultrafast',label:'Ultra Fast',model:'Grok Imagine 1.5',provider:'Higgsfield MCP',resolution:'480p',resolutions:['480p','720p','1080p'],durations:[10],ratios:['16:9','9:16'],duration:10 },
  // Quick is intentionally locked to the low-cost preview tier. Clients do
  // not get a quality switch here; Premium/Flagship are the upgrade paths.
  { id: 'budget', label: 'Quick', model: 'Wan 3.0 Prime', provider: 'Higgsfield MCP', resolution: '480p', resolutions: ['480p'], durations: [4, 6, 8, 10], ratios: ['16:9', '9:16'], duration: 8 },
  { id: 'flagship', label: 'Flagship', model: 'Genjutsu', provider: 'Higgsfield MCP', resolution: '720p', resolutions: ['480p', '720p', '1080p'], durations: [10, 13.349, 14.9, 15.02, 20.386], ratios: ['9:16', '16:9'], duration: 14.9 },
  { id: 'premium', label: 'Premium', model: 'Wan 3.0 Prime', provider: 'Higgsfield MCP', resolution: '720p', resolutions: ['480p', '720p', '1080p'], durations: [4, 5, 8, 10, 15], ratios: ['16:9', '9:16'], duration: 8 },
  { id: 'custom', label: 'Custom', model: 'Wan 3.0 Prime', provider: 'Higgsfield MCP', resolution: '720p', resolutions: ['480p', '720p', '1080p'], durations: Array.from({length:29}, (_,i)=>i+2), ratios: ['16:9', '9:16'], duration: 10 },
];
const scenes = [
  ['indoor', 'Indoor elegance', 'Soft window light, a refined indoor setting.', 'An elegant bride in a softly lit interior, walking slowly past tall windows. Smooth tracking camera, natural daylight, detailed fabric and embroidery.'],
  ['outdoor', 'Outdoor garden', 'Sunlit greenery and a gentle breeze.', 'The bride walks through a lush garden in warm afternoon light. Gentle breeze moves the dupatta, a slow tracking shot reveals the complete bridal outfit.'],
  ['palace', 'Royal palace', 'Grand arches and regal gold details.', 'The bride descends a grand palace staircase beneath ornate arches. Slow cinematic dolly, warm gold lighting, luxurious bridal styling.'],
  ['boutique', 'Boutique lounge', 'A polished fashion showcase.', 'The bride turns gracefully in an elegant boutique lounge. Editorial camera orbit, soft studio lighting, focus on accurate garment details.'],
  ['mandap', 'Mandap moment', 'Flowers, tradition and warm light.', 'The bride stands beneath a floral mandap, smiling softly. Gentle push-in camera, warm ceremonial light, delicate jewellery and embroidered fabric.'],
  ['stage', 'Stage entrance', 'A graceful entrance under spotlights.', 'The bride enters a decorated wedding stage with a confident gentle walk. Tracking shot, warm spotlights, subtle falling petals.'],
  ['sunset', 'Golden-hour portrait', 'Warm sunset tones and soft movement.', 'The bride makes a slow graceful turn at sunset. Golden backlight outlines the dupatta and rich embroidery, natural cinematic camera movement.'],
  ['terrace', 'Palace terrace', 'Open skies and elegant architecture.', 'The bride walks across a palace terrace overlooking distant gardens. Smooth wide-to-medium camera movement, soft daylight, realistic fabric motion.'],
  ['floral', 'Floral courtyard', 'A romantic setting full of flowers.', 'The bride pauses in a courtyard filled with roses and jasmine. A slow camera orbit captures the full dress, warm soft light, photorealistic flowers.'],
  ['reception', 'Reception walk', 'A refined evening celebration.', 'The bride walks through an elegant reception hall with chandeliers. Smooth tracking camera, warm evening light, confident natural expression.'],
  ['studio', 'Editorial studio', 'Clean lighting and couture detail.', 'The bride poses against a tasteful neutral studio backdrop. Slow full-length camera orbit, professional softbox lighting, editorial bridal fashion film.'],
  ['heritage', 'Heritage doorway', 'Classic textures and timeless styling.', 'The bride stands beside an intricately carved heritage doorway and turns toward the camera. Gentle push-in, soft side light, detailed bridal fabric.'],
].map(([id, label, description, action]) => {
  function recipe(subjectMode) {
    const cast = subjectMode === 'couple' ? 'the bride and her groom together' : 'the bride alone';
    const imagePrompt = 'Create one bright, realistic head-to-toe full-body wedding fashion photograph of ' + cast + '. Pull the camera back with generous space above the head and below the feet; show the complete outfit and skirt hem. ' + description +
      ' Show the bridal outfit clearly, accurate embroidery and draping, natural skin texture, anatomically correct hands, no text. No close-up, waist-up or cropped portrait, cut-off head, missing feet, partial body, sheet or collage. ' +
      (subjectMode === 'couple' ? 'Keep the groom beside the bride, with a distinct face and natural proportions. No extra partner.' : 'No groom or extra partner.');
    const prompt = [
      'SUBJECTS: ' + cast + '. ' + action + (subjectMode === 'couple' ? ' The groom accompanies the bride, sharing the same setting and a natural coordinated entrance.' : ' Keep this a solo bridal scene.'),
      'SHOT-BY-SHOT EFFECTS TIMELINE',
      'SHOT 1 (0-2s): full-length establishing view; smooth tracking at natural walking speed. Continue the same movement into the next view.',
      'SHOT 2 (2-4s): medium tracking view; gentle natural motion blur, stable lighting and unchanged identities. Soft matched transition.',
      'SHOT 3 (4-6s): fabric detail and graceful movement; slow focus pull, embroidery stays unchanged. This is the signature outfit detail. Match back to the portrait.',
      'SHOT 4 (6-8s): composed medium portrait; camera settles gently, faces remain clear, no morphing, end on a natural pose.',
      'MASTER EFFECTS INVENTORY: smooth tracking twice (shots 1-2); matched transitions twice (shots 2-3); focus pull once (shot 3); settle once (shot 4).',
      'EFFECTS DENSITY MAP: 0-4s LOW (tracking and matched transition); 4-6s MEDIUM (fabric motion and focus pull); 6-8s LOW (settle).',
      'ENERGY ARC: introduce the subjects; reveal the outfit; resolve into a calm wedding portrait.',
    ].join('\n');
    return { prompt, imagePrompt, referenceImageUrl: null, sourceVideoUrl: null, musicPath: null, useSourceAudio: false, version: 1 };
  }
  const subjects = { solo: recipe('solo'), couple: recipe('couple') };
  return { id, label, description, category: ['mandap', 'stage', 'reception'].includes(id) ? 'wedding' : 'pre-wedding', prompt: subjects.solo.prompt, subjects };
});

const referenceRoot = path.join(__dirname, '..', 'assets', 'budget-template-01');
// Keep the editable prompt and the generation prompt as one source of truth.
const editorialPrompt = readFileSync(path.join(referenceRoot, 'prompt.txt'), 'utf8').trim();
const budgetScenes = scenes.map((scene, index) => index === 0 ? {
  ...scene, label: 'Editorial bridal reveal', description: 'A portrait-led fashion film with the selected dress.',
  subjects: { ...scene.subjects, couple: { ...scene.subjects.couple, label: 'Indoor elegance', description: scene.description }, solo: {
    ...scene.subjects.solo,
    label: 'Editorial bridal reveal', description: 'A portrait-led fashion film with the selected dress.',
    prompt: editorialPrompt,
    imagePrompt: 'Create one photorealistic full-length bridal fashion photograph of the uploaded bride wearing the ACTUAL selected dress. The bride reference alone defines identity: preserve her face shape, forehead, eyebrows, eye shape and spacing, nose, lips, cheekbones, chin, jawline, skin tone, age appearance, natural asymmetry and skin texture. Do not blend in a dress-model face, substitute a generic bride, lighten skin or apply beauty-filter reshaping. Dress references show ONE garment: reproduce its actual base and secondary colours, neckline, sleeve construction, bodice, waist, skirt silhouette, hem, embroidery motif placement and scale, border widths, beadwork, material texture, opacity and matching dupatta when supplied. Use rear, side and detail views as additional evidence of the same garment; never render the contact-sheet layout. Fit it naturally without redesigning it or copying the source outfit. Use a bright white-lit editorial studio between dark sculptural drapes. Frame the complete outfit clearly with a recognizable face, coherent skin and neck lighting, realistic hands and grounded fabric folds. No groom, extra people, captions or invented branding. Unseen garment details should be restrained and consistent rather than invented decorative features.',
    sourceVideoPath: path.join(referenceRoot, 'reference.mp4'),
    musicPath: path.join(referenceRoot, 'music.m4a'),
    duration: 10, aspectRatio: '9:16', version: 6,
  } },
} : scene);

const speedRoot = path.join(__dirname, '..', 'assets', 'budget-speed-01');
// Keep the neutral legacy scene recipes for API compatibility, but do not
// publish the failed BUDGET_SPEED_01 "Wedding entrance" implementation.
// These neutral recipes have no reference asset, so the client does not show
// them as completed template cards.
const budgetSpeedScenes = scenes.map(scene => ({ ...scene, generationModes: ['speed'] }));

const heartPromisePrompt = readFileSync(path.join(speedRoot, 'heart-promise-prompt.txt'), 'utf8').trim();
const heartPromiseScene = {
  id: 'heart-promise', label: 'A Promise in Slow Motion', category: 'wedding',
  description: 'A three-scene, slow-motion wedding story: tender embrace, stage intimacy, then a bouquet proposal.',
  generationModes: ['speed'],
  subjects: {
    solo: { available: false, label: 'A Promise in Slow Motion', description: 'This story requires both bride and groom reference photos.' },
    couple: {
      templateId: 'BUDGET_SPEED_HEART_01', templateNumber: 2, status: 'testing', version: 1,
      label: 'A Promise in Slow Motion',
      description: 'Two non-contact scene stills guide the wedding ambience; your bride, groom and selected dress define the people and outfit.',
      prompt: heartPromisePrompt,
      imagePrompt: 'Create one bright photorealistic landscape head-to-toe full-body wedding photograph of the uploaded bride and groom beneath an elegant floral wedding stage. Pull back enough to show both complete heads, feet, hands and the bride’s full outfit and skirt hem, with generous headroom and visible floor. The uploaded bride photo defines her exact identity; the uploaded groom photo defines his distinct face. The selected dress references define her actual outfit. Use the chronological wedding scene stills only for decor, lighting and composition; never borrow faces or clothes from them. No close-up, waist-up crop, cut-off head, missing feet, partial body, sheet or collage. Natural expressions, realistic anatomy, cinematic violet and warm light, no text.',
      referenceImagePath: path.join(speedRoot, 'scene-02-first-frame.png'),
      imageReferenceImagePath: path.join(speedRoot, 'scene-02-first-frame.png'),
      referenceImagePaths: [
        path.join(speedRoot, 'scene-02-first-frame.png'),
        path.join(speedRoot, 'scene-03-first-frame.png'),
      ],
      extendedReferences: true,
      duration: 10, aspectRatio: '16:9', sound: false,
      sourceVideoUrl: null, sourceVideoPath: null, sourceVideoAsset: null,
      musicPath: path.join(speedRoot, 'music.m4a'), useSourceAudio: false,
    },
  },
};
budgetSpeedScenes.push(heartPromiseScene);

const dreamRoot = path.join(__dirname, '..', 'assets', 'budget-speed-dream-03');
budgetSpeedScenes.push({
  id: 'dreamed-moment', label: 'The Moment We Dreamed', category: 'wedding',
  description: 'A slow-motion kneeling moment and tender non-contact exchange beneath blue stage lights.',
  generationModes: ['speed'],
  subjects: {
    solo: { available: false, label: 'The Moment We Dreamed', description: 'Bride and groom photographs are required for this couple story.' },
    couple: {
      templateId: 'BUDGET_SPEED_DREAM_03', templateNumber: 3, status: 'testing', version: 1,
      label: 'The Moment We Dreamed',
      description: 'Your bride, groom and actual dress on a flower-lined stage with blue overhead beams and a tender embrace.',
      prompt: readFileSync(path.join(dreamRoot, 'prompt.txt'), 'utf8').trim(),
      imagePrompt: 'Create one bright photorealistic 16:9 head-to-toe full-body wedding photograph of the CURRENT uploaded bride and groom on the stage shown in the environment photographs. Pull back to include both complete heads and feet, visible floor and the bride’s entire outfit and skirt hem, with generous headroom. Bride on the right, groom kneeling on the left and looking up affectionately. The bride identity photograph alone defines her recognizable face and natural skin tone; the groom photograph alone defines his distinct identity. The selected dress photographs alone define the bride garment: preserve the actual colours, neckline, sleeve structure, bodice seams, embroidery placement, stitching, skirt and supplied dupatta. Stage references define only the pale raised stage, flower-lined front corners, petal-covered floor, floral backdrop, white overhead fabric swags and blue diagonal spotlights through gentle haze. Warm soft light keeps both faces and garment details clear. No close-up, waist-up crop, cut-off head, missing feet, partial body, sheet or collage. Do not borrow source people or source clothing. Natural anatomy, no captions or invented branding.',
      referenceImagePath: path.join(dreamRoot, 'scene-02.png'),
      imageReferenceImagePath: path.join(dreamRoot, 'scene-02.png'),
      referenceImagePaths: [path.join(dreamRoot, 'scene-01.png'), path.join(dreamRoot, 'scene-02.png')],
      extendedReferences: true, duration: 10, aspectRatio: '16:9', sound: false,
      sourceVideoUrl: null, sourceVideoPath: null, sourceVideoAsset: null,
      musicPath: path.join(dreamRoot, 'music.m4a'), useSourceAudio: false,
    },
  },
});

budgetSpeedScenes.push(...require('./budgetSpeedBatchTemplates'));

const balanceRoot = path.join(__dirname, '..', 'assets', 'budget-balance-01');
const sculptedPrompt = readFileSync(path.join(balanceRoot, 'prompt.txt'), 'utf8').trim();
budgetScenes.unshift({
  id: 'sculpted-romance', label: 'Sculpted Romance', category: 'pre-wedding',
  description: 'A couture fashion film framed by sculptural wood architecture.', generationModes: ['balance'],
  subjects: {
    solo: {
      templateId: 'BUDGET_BALANCE_01', templateNumber: 1, status: 'user-approved', version: 1,
      extendedReferences: true,
      label: 'Sculpted Romance', description: 'Your bride and dress in a sculptural couture film with the original reference music.',
      prompt: sculptedPrompt, duration: 10, aspectRatio: '16:9', sound: false,
      referenceVideoRole: 'inspiration', sourceVideoPath: path.join(balanceRoot, 'reference.mp4'),
      sourceVideoAsset: null, sourceVideoUrl: null, flowProjectUrl: null, musicPath: path.join(balanceRoot, 'music.m4a'), useSourceAudio: false,
      imagePrompt: 'Create one realistic full-length bridal couture photograph of the currently uploaded bride wearing the actual selected dress, within an original installation of monumental curved timber forms and warm directional light. The bride photo alone defines identity; preserve recognizable features and skin tone without blending with a source model. All dress views show one garment; preserve its documented colours, blouse, sleeve construction, skirt, embroidery and dupatta. Do not render a mannequin or reference-sheet layout. One bride only, no text or branding. Use natural skin, real fabric weight and physically constructed wood.',
    },
    couple: { ...scenes[0].subjects.couple, available: false, label: 'Sculpted Romance', description: 'This approved fashion template is for one bride only.' },
  },
});

// One template library, with references adapted to each delivery mode.
// Premium cards can be reviewed while generation remains gated by verified MCP
// capability in studioGenerationRoute and studioVideoService.
const completed = [...budgetSpeedScenes, ...budgetScenes].filter(scene =>
  // The legacy editorial reveal uses the same fashion source concept as the
  // approved Sculpted Romance card. Keep it for saved-history compatibility,
  // but publish only the approved card in every model catalog.
  scene.id !== 'indoor' && Object.values(scene.subjects).some(recipe => recipe.templateId || recipe.sourceVideoPath));
const unique = [...new Map(completed.map(scene => [scene.id, scene])).values()];
const legacyScenes = scenes.slice();
function variant(scene, generationMode) {
  const subjects = Object.fromEntries(Object.entries(scene.subjects).map(([subject, original]) => {
    if (subject === 'couple' || original.available === false || (!original.templateId && !original.sourceVideoPath)) return [subject, { ...original, available: false }];
    const anchor = original.referenceImagePaths?.[0] || original.referenceImagePath || original.sourceVideoPath;
    const root = anchor && path.dirname(anchor);
    const thumbnail = original.thumbnailPath || (root && existsSync(path.join(root, 'template-thumbnail.jpg')) ? path.join(root, 'template-thumbnail.jpg') : original.referenceImagePath || original.referenceImagePaths?.[0]);
    const source = original.sourceVideoPath || (root && existsSync(path.join(root, 'reference.mp4')) ? path.join(root, 'reference.mp4') : null);
    const base = { ...original, templateId: original.templateId || 'BRIDAL_EDITORIAL_01',
      thumbnailPath: thumbnail, referenceImagePath: original.referenceImagePath || thumbnail,
      imageReferenceImagePath: original.imageReferenceImagePath || thumbnail,
      sound: false, sourceVideoAsset: null, sourceVideoUrl: null, flowProjectUrl: null, sourceAspectRatioPath: source };
    return [subject, generationMode === 'speed'
      ? { ...base, sourceVideoPath: null, referenceImagePaths: original.referenceImagePaths?.length ? original.referenceImagePaths : [thumbnail].filter(Boolean) }
      : { ...base, sourceVideoPath: source, referenceVideoRole: original.referenceVideoRole || 'source-locked', referenceImagePaths: [], referenceImageDescriptions: [],
          prompt: original.sourceVideoPath || original.verbatimPrompt ? original.prompt : 'SOURCE_VIDEO defines the chronological camera, pose, movement, lighting and environment of the supplied ten-second reference. Apply the customer bride, optional groom and actual dress to that progression. Preserve faces and garment across cuts.\n' + original.prompt }];
  }));
  return { ...scene, prompt: Object.values(subjects).find(recipe => recipe.available !== false)?.prompt || scene.prompt, generationModes: [generationMode], subjects };
}
const speedCatalog = unique.map(scene => variant(scene, 'speed'));
const balanceCatalog = unique.map(scene => variant(scene, 'balance'));
// Keep the rejected kissing concept in Premium for owner evaluation only.
const budgetExcludedScenes = new Set(['garden-kiss-embrace']);
const budgetBrideOnlyDemo = true;
function budgetCatalog(catalog) {
  return catalog.filter(scene => !budgetExcludedScenes.has(scene.id))
    .filter(scene => !budgetBrideOnlyDemo || scene.subjects.solo?.available !== false && Boolean(scene.subjects.solo?.prompt))
    .map(scene => budgetBrideOnlyDemo ? { ...scene, subjects: { ...scene.subjects, couple: { ...scene.subjects.couple, available: false } } } : scene);
}
budgetSpeedScenes.splice(0, budgetSpeedScenes.length, ...budgetCatalog(speedCatalog));
budgetScenes.splice(0, budgetScenes.length, ...budgetCatalog(balanceCatalog));
const premiumSpeedScenes = speedCatalog.map(scene => ({ ...scene, subjects: { ...scene.subjects } }));
const quickPassedIds = new Set(['sculpted-romance', 'palace-crimson-reveal', 'lakeside-palace-veil', 'garden-veil-spin', 'courtyard-breeze-portrait']);
const premiumBalanceScenes = budgetScenes.map(scene => ({ ...scene, subjects: {
  ...scene.subjects,
  solo: { ...scene.subjects.solo, copiedFromQuick: quickPassedIds.has(scene.id),
    comingSoon: !quickPassedIds.has(scene.id), available: quickPassedIds.has(scene.id) },
  couple: { ...scene.subjects.couple, available: false },
} })).sort((a,b) => Number(quickPassedIds.has(b.id)) - Number(quickPassedIds.has(a.id)));
scenes.splice(0, scenes.length, ...new Map([...legacyScenes, ...premiumSpeedScenes].map(scene => [scene.id, scene])).values());

const flagshipScenes = require('./flagshipTemplates');
scenes.push(...flagshipScenes);
// Owner-supplied reference: only the first ten seconds are used. Original stays untouched.
const royalGardenRoot = path.join(__dirname, '../assets/royal-red-garden');
const royalGarden = {
  id: 'royal-red-garden-veil-turn', label: 'Royal Red Bride — Garden Portrait & Veil Turn',
  description: 'Ten-second garden portrait and veil turn. New owner-supplied prompt.', category: 'pre-wedding',
  subjects: { solo: { available: true, label: 'Royal Red Bride — Garden Portrait & Veil Turn',
    templateId: 'ROYAL_RED_GARDEN_01', templateNumber: 22, version: 'royal-garden-v2',
    prompt: readFileSync(path.join(royalGardenRoot, 'prompt.txt'), 'utf8').trim(), verbatimPrompt: true,
    duration: 10, aspectRatio: '9:16', sound: false, useSourceAudio: false, musicPath: null,
    sourceVideoPath: path.join(royalGardenRoot, 'reference-10s.mp4'),
    sourceAspectRatioPath: path.join(royalGardenRoot, 'reference-10s.mp4'),
    sourceFilename: 'reference-10s.mp4', thumbnailPath: path.join(royalGardenRoot, 'template-thumbnail.jpg'),
    referenceImagePath: path.join(royalGardenRoot, 'template-thumbnail.jpg'), referenceImagePaths: [],
  }, couple: { available: false } },
};
budgetScenes.unshift(royalGarden);
premiumBalanceScenes.unshift(royalGarden);
scenes.push(royalGarden);
const luxuryRoot = path.join(__dirname, '../assets/luxury-bridal-cinematic');
const luxuryBridal = {
  id: 'luxury-bridal-cinematic', label: 'Luxury Bridal Cinematic', category: 'pre-wedding',
  description: 'Owner-supplied ten-second motion reference and exact replacement prompt.',
  subjects: { solo: { available: true, label: 'Luxury Bridal Cinematic',
    templateId: 'LUXURY_BRIDAL_CINEMATIC_01', templateNumber: 23, version: 'luxury-bridal-v2',
    prompt: readFileSync(path.join(luxuryRoot, 'prompt.txt'), 'utf8').trim(), verbatimPrompt: true,
    duration: 10, aspectRatio: '9:16', sound: false, useSourceAudio: false, musicPath: null,
    sourceVideoPath: path.join(luxuryRoot, 'reference-10s.mp4'),
    sourceAspectRatioPath: path.join(luxuryRoot, 'reference-10s.mp4'), sourceFilename: 'reference-10s.mp4',
    thumbnailPath: path.join(luxuryRoot, 'template-thumbnail.jpg'),
    referenceImagePath: path.join(luxuryRoot, 'template-thumbnail.jpg'), referenceImagePaths: [],
  }, couple: { available: false } },
};
budgetScenes.unshift(luxuryBridal);
premiumBalanceScenes.unshift(luxuryBridal);
scenes.push(luxuryBridal);
// Retire this owner-supplied template from every client-facing catalog. Keep
// its prompt, reference video, and thumbnail on disk so it can be restored
// later without losing the work.
for (const catalog of [budgetScenes, premiumBalanceScenes]) {
  const index = catalog.findIndex(item => item.id === luxuryBridal.id);
  if (index >= 0) catalog.splice(index, 1);
}
const luxurySceneIndex = scenes.findIndex(item => item.id === luxuryBridal.id);
if (luxurySceneIndex >= 0) scenes.splice(luxurySceneIndex, 1);
const eleganceRoot = path.join(__dirname, '../assets/elegance-landscape');
const eleganceLandscape = {
  id: 'pure-elegance-landscape', label: 'Pure Elegance — Landscape', category: 'pre-wedding',
  description: 'Upright landscape bridal film. First ten seconds with original soundtrack.',
  subjects: { solo: { available: true, label: 'Pure Elegance — Landscape',
    templateId: 'PURE_ELEGANCE_LANDSCAPE_01', templateNumber: 24, version: 'elegance-landscape-v2',
    prompt: readFileSync(path.join(eleganceRoot, 'prompt.txt'), 'utf8').trim(), verbatimPrompt: true,
    duration: 10, aspectRatio: '16:9', sound: false, useSourceAudio: true, musicPath: null,
    sourceVideoPath: path.join(eleganceRoot, 'reference-10s-landscape.mp4'),
    sourceAspectRatioPath: path.join(eleganceRoot, 'reference-10s-landscape.mp4'),
    sourceFilename: 'reference-10s-landscape.mp4', thumbnailPath: path.join(eleganceRoot, 'template-thumbnail.jpg'),
    referenceImagePath: path.join(eleganceRoot, 'template-thumbnail.jpg'), referenceImagePaths: [],
  }, couple: { available: false } },
};
// Retired at the owner's request. Keep the exact prompt and original media
// on disk, but do not publish or accept this template for new creations.
for (const catalog of [budgetScenes, premiumBalanceScenes]) {
  for (const item of catalog) {
    const updated = /-v2$/.test(item.subjects.solo?.version || '') || ['courtyard-breeze-portrait', 'garden-veil-spin'].includes(item.id);
    if (!updated) { item.subjects.solo = { ...item.subjects.solo, available: false, comingSoon: true }; }
  }
}
const premiumWanTemplates = [
  { number:25, id:'premium-wan-01-garden-bridal-reverie', templateId:'PREMIUM_WAN_01', label:'Garden Bridal Reverie', category:'wedding', aspectRatio:'9:16', description:'A fifteen-second garden bridal portrait with hand details, soft turns and a full-length veranda finish.' },
  { number:26, id:'premium-wan-02-red-lit-mirror-bride', templateId:'PREMIUM_WAN_02', label:'Red-Lit Mirror Bride', category:'wedding', aspectRatio:'16:9', description:'A fifteen-second red-lit bridal portrait with mirror, flare and soft-focus details.' },
  { number:27, id:'premium-wan-03-ivory-garden-veil', templateId:'PREMIUM_WAN_03', label:'Ivory Garden Veil', category:'wedding', aspectRatio:'9:16', description:'A fifteen-second garden portrait built around full-dress views and a sweeping veil turn.' },
  { number:28, id:'premium-wan-04-crimson-tapestry-letter', templateId:'PREMIUM_WAN_04', label:'Crimson Tapestry Letter', category:'wedding', aspectRatio:'9:16', description:'A fifteen-second intimate bridal story with candle, bouquet and handwritten-letter moments.' },
  { number:29, id:'premium-wan-05-crimson-veil-courtyard', templateId:'PREMIUM_WAN_05', label:'Crimson Veil Courtyard', category:'wedding', aspectRatio:'9:16', description:'A fifteen-second courtyard veil reveal, garden portrait and full-length turn.' },
  { number:30, id:'premium-wan-06-veiled-corridor-reverie', templateId:'PREMIUM_WAN_06', label:'Veiled Corridor Reverie', category:'wedding', aspectRatio:'16:9', description:'A fifteen-second landscape bridal film with veil reveal, corridor walk and low-light portraits.' },
].map(definition => {
  const root = path.join(__dirname, '..', 'assets', 'premium-wan-' + definition.number);
  const sourceVideoPath = path.join(root, 'reference-15s.mp4');
  return {
    id: definition.id, label: definition.label, category: definition.category,
    description: definition.description, generationModes: ['balance'],
    subjects: {
      solo: {
        available: true, label: definition.label, description: definition.description,
        templateId: definition.templateId, templateNumber: definition.number,
        status: 'testing', version: 'premium-wan-v1',
        prompt: readFileSync(path.join(root, 'prompt.txt'), 'utf8').trim(), verbatimPrompt: true,
        duration: 15, aspectRatio: definition.aspectRatio, sound: false, useSourceAudio: false,
        musicPath: path.join(root, 'music.m4a'), sourceVideoPath,
        sourceAspectRatioPath: sourceVideoPath, sourceFilename: 'reference-15s.mp4',
        thumbnailPath: path.join(root, 'template-thumbnail.jpg'),
        referenceImagePath: path.join(root, 'template-thumbnail.jpg'), referenceImagePaths: [],
        referenceVideoRole: 'source-locked', jewelleryMode: 'database-or-minimal',
      },
      couple: { available: false },
    },
  };
});
premiumBalanceScenes.push(...premiumWanTemplates);
tiers.find(t=>t.id==='budget').resolution = '480p';
tiers.find(t=>t.id==='budget').resolutions = ['480p'];
tiers.find(t=>t.id==='budget').model = 'Wan 3.0 Prime';
function resolve(body, recipe) {
  const tier = tiers.find(t => t.id === body.tier);
  if (!tier) throw new Error('Choose a valid model tier.');
  const source = tier.id === 'custom' && body.sourceUploadId ? require('./studioCustomReference').get(body.sourceUploadId) : null;
  const generationMode = tier.id === 'ultrafast' ? 'speed' : tier.id === 'custom' ? source ? 'balance' : 'speed' : body.generationMode || 'speed';
  require('./studioGenerationRoute').resolve(tier.id, generationMode);
  const workflow = tier.id === 'custom' ? 'prompt' : body.workflow || 'preset';
  if (tier.id === 'budget' && budgetBrideOnlyDemo && [body.subjectMode, body.imageSubjectMode, body.videoSubjectMode].includes('couple')) throw new Error('Budget is temporarily Bride only for the demo. Choose a Bride-only template or use Premium.');
  if (tier.id === 'budget' && workflow === 'preset' && budgetExcludedScenes.has(body.scene)) throw new Error('This template is available in Premium only. Choose another Budget template.');
  if (!['preset', 'prompt'].includes(workflow)) throw new Error('Choose scenes or prompt-to-video.');
  const scenePool = tier.id === 'ultrafast' ? require('./studioUltraFastTemplates') : tier.id === 'flagship' ? flagshipScenes : tier.id === 'budget' ? (generationMode === 'speed' ? budgetSpeedScenes : budgetScenes)
    : (generationMode === 'speed' ? premiumSpeedScenes : premiumBalanceScenes);
  const scene = scenePool.find(s => s.id === body.scene) || legacyScenes.find(s => s.id === body.scene);
  if (workflow === 'preset' && !scene) throw new Error('Choose a scene preset.');
  if (workflow === 'preset' && scene.generationModes && !scene.generationModes.includes(generationMode)) throw new Error('This template requires Balance mode.');
  const subjectMode = body.subjectMode || 'solo';
  if (!['solo', 'couple'].includes(subjectMode)) throw new Error('Choose Bride only or Bride & groom.');
  const selectedRecipe = workflow === 'preset' ? (recipe || scene?.subjects[subjectMode]) : null;
  if (selectedRecipe?.available === false) throw new Error('This template is available for Bride only.');
  const prompt = workflow === 'preset' ? selectedRecipe.prompt : String(body.prompt || '').trim();
  const promptLimit = workflow === 'preset' ? (selectedRecipe?.verbatimPrompt ? 40000 : 30000) : 10000;
  if (prompt.length < 5 || prompt.length > promptLimit) throw new Error('Write a prompt between 5 and ' + promptLimit + ' characters.');
  const selectedModel = tier.id === 'ultrafast' ? 'grok_video_v15' : tier.id === 'flagship' ? require('./studioFlagshipModel').current() : tier.id === 'budget' ? 'wan3_0_prime' : (body.model || 'wan3_0_prime');
  if (selectedModel === require('./studioFlagshipModel').LITE && (selectedRecipe?.duration || source?.duration || Number(body.duration)) > 15) throw new Error('Flagship Lite testing supports reference clips up to 15 seconds. Restore Genjutsu for longer clips.');
  const model = tier.id === 'ultrafast' ? {resolutions:['480p','720p','1080p']} : tier.id === 'flagship' ? null : require('./studioModels').videoModel(selectedModel);
  const followsSource = model?.followsSource && source;
  const duration = followsSource ? source.duration : workflow === 'preset' ? (selectedRecipe.duration || tier.duration) : Number(body.duration);
  const resolution = tier.id === 'budget' ? '480p' : body.resolution || tier.resolution;
  const aspectRatio = followsSource ? source.aspectRatio : body.aspectRatio || selectedRecipe?.aspectRatio || '9:16';
  if (tier.id === 'custom' && body.outputType !== 'image' && model.followsSource && !source) throw new Error('Seedance 2.5 Edit needs a reference video. Upload one first.');
  if (tier.id === 'custom' ? !followsSource && (!Number.isInteger(duration) || duration < model.minDuration || duration > model.maxDuration) : !tier.durations.includes(duration)) throw new Error('Unsupported duration for this model.');
  const supportedResolutions = model?.resolutions || tier.resolutions;
  if (!supportedResolutions.includes(resolution)) throw new Error('Unsupported quality for this model.');
  if (!tier.ratios.includes(aspectRatio)) throw new Error('Unsupported frame size for this model.');
  const { IMAGE_RESOLUTION: imageResolution, IMAGE_ASPECT_RATIO: imageAspectRatio } = require('./studioImageOutputPolicy');
  return { tier: tier.id, model: selectedModel, imageResolution, imageAspectRatio, generationMode, workflow, subjectMode, scene: scene?.id, prompt: tier.id === 'custom' || selectedRecipe?.verbatimPrompt ? prompt : withBridalOrnaments(prompt), duration, resolution, aspectRatio,
    sourceUploadId: source ? body.sourceUploadId : null,
    enableThinking: body.enableThinking === true || body.enableThinking === 'true',
    imagePrompt: tier.id === 'custom' ? prompt : selectedRecipe?.imagePrompt, templateVersion: selectedRecipe?.version,
    verbatimPrompt: tier.id === 'custom' || selectedRecipe?.verbatimPrompt === true,
    templateId: selectedRecipe?.templateId, templateNumber: selectedRecipe?.templateNumber, templateStatus: selectedRecipe?.status,
    referenceVideoRole: selectedRecipe?.referenceVideoRole || 'source-locked', category: scene?.category,
    extendedReferences: selectedRecipe?.extendedReferences === true,
    referenceImagePath: selectedRecipe?.referenceImagePath || null,
    referenceImagePaths: selectedRecipe?.referenceImagePaths || [],
    referenceImageDescriptions: selectedRecipe?.referenceImageDescriptions || [],
    imageReferenceImagePath: selectedRecipe?.imageReferenceImagePath || null,
    sourceVideoUrl: selectedRecipe?.sourceVideoUrl || null,
    sourceVideoPath: source?.sourceVideoPath || selectedRecipe?.sourceVideoPath || null,
    sourceVideoAsset: selectedRecipe?.sourceVideoAsset || null,
    flowProjectUrl: selectedRecipe?.flowProjectUrl || null,
    referenceImageUrl: selectedRecipe?.referenceImageUrl || null,
    musicPath: selectedRecipe?.musicPath || null, useSourceAudio: Boolean(selectedRecipe?.useSourceAudio),
    jewelleryMode: selectedRecipe?.jewelleryMode || null,
    sound: selectedRecipe?.sound ?? (body.sound !== 'false' && body.sound !== false) };
}
module.exports = { tiers, scenes, flagshipScenes, budgetScenes, budgetSpeedScenes, premiumSpeedScenes, premiumBalanceScenes, budgetBrideOnlyDemo, resolve };
