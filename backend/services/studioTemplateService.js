const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createStore } = require('../utils/studioStore');
const config = require('./studioVideoConfig');
const imageScenes = require('./studioImageTemplates');
const storage = require('./storageService');
const media = require('./studioMediaService');
const generationRoute = require('./studioGenerationRoute');
const { withBridalOrnaments } = require('./bridalOrnamentsPrompt');

const store = createStore(process.env.STUDIO_TEMPLATE_STORE || path.join(__dirname, '..', 'data', 'studio-templates.json'), {
  defaults: { tier: 'premium', scene: 'indoor', mode: 'standard', subjectMode: 'solo' }, recipes: {},
});
function key(scene, subject, tier = 'shared') {
  if (imageScenes.some(item => item.id === scene)) {
    if (subject !== 'solo') throw new Error('These image templates are Bride only.');
    return 'image:' + scene + ':' + subject;
  }
  const source = tier === 'budget' ? [...config.budgetScenes, ...config.budgetSpeedScenes] : config.scenes;
  if (!source.some(item => item.id === scene) || !['solo', 'couple'].includes(subject)) throw new Error('Choose a valid scene and Bride only or Bride & groom.');
  if (!['shared', 'budget'].includes(tier)) throw new Error('Choose a valid template quality.');
  return (tier === 'budget' ? 'budget:' : '') + scene + ':' + subject;
}
async function recipe(scene, subject = 'solo', tier = 'shared', generationMode = 'balance') {
  const imageScene = imageScenes.find(item => item.id === scene);
  if (imageScene) return imageScene.subjects[subject] || { available: false };
  const name = key(scene, subject, tier);
  const value = await store.read();
  const speedScene = tier === 'budget' && generationMode === 'speed'
    ? config.budgetSpeedScenes.find(item => item.id === scene) : null;
  const baseScene = speedScene || (tier === 'budget' ? config.budgetScenes : generationMode === 'speed' ? config.premiumSpeedScenes : config.premiumBalanceScenes).find(item => item.id === scene) || config.scenes.find(item => item.id === scene);
  const base = baseScene.subjects[subject];
  if (tier === 'shared' && generationMode === 'balance' && base.copiedFromQuick) {
    return { ...await recipe(scene, subject, 'budget', 'balance'), copiedFromQuick: true };
  }
  const saved = value.recipes[name] || {};
  // BUDGET_SPEED_01 was rejected and removed from the customer UI. Ignore a
  // previously persisted copy as well, otherwise it can reappear after a
  // restart even though it no longer exists in the source configuration.
  if (tier === 'budget' && generationMode === 'speed' && saved.templateId === 'BUDGET_SPEED_01') return { ...base };
  const entry = { ...base, ...saved, prompt: withBridalOrnaments(saved.prompt || base.prompt) };
  if (scene === 'royal-red-garden-veil-turn' && subject === 'solo') {
    entry.prompt = require('node:fs').readFileSync(path.join(__dirname, '../assets/royal-red-garden/prompt-wan-v3.txt'), 'utf8').replace(/\r\n/g, '\n').trim();
    entry.verbatimPrompt = true;
    entry.version = 'royal-garden-v3';
  }
  if (scene === 'garden-veil-spin' && subject === 'solo') {
    entry.prompt = require('node:fs').readFileSync(require('node:path').join(__dirname, '../assets/budget-speed-batch-12/garden-v2.txt'), 'utf8').trim();
    entry.duration = 10;
    entry.aspectRatio = '9:16';
    entry.version = 'garden-v2';
    entry.verbatimPrompt = true;
    entry.sound = false;
  }
  if (scene === 'courtyard-breeze-portrait' && subject === 'solo') {
    const path = require('node:path');
    const fs = require('node:fs');
    entry.prompt = fs.readFileSync(path.join(__dirname, '../assets/budget-speed-batch-14/courtyard-v2.txt'), 'utf8').trim();
    entry.sourceVideoPath = path.join(__dirname, '../assets/testing-video-libraries/bride-only/14 - Courtyard Breeze Portrait/reference-with-music.mp4');
    entry.sourceAspectRatioPath = entry.sourceVideoPath;
    entry.sourceVideoUrl = null;
    entry.sourceVideoAsset = null;
    entry.sourceFilename = 'reference-with-music.mp4';
    entry.duration = 10;
    entry.aspectRatio = '9:16';
    entry.version = 'courtyard-v2';
    entry.verbatimPrompt = true;
    entry.useSourceAudio = true;
  }
  if (base.comingSoon) { entry.available = false; entry.comingSoon = true; }
  // Inspect the original clip even in photos-only mode; a saved UI override
  // must never turn a portrait source into a landscape generation.
  const ratioSource = entry.sourceAspectRatioPath || entry.sourceVideoPath;
  if (ratioSource && require('node:fs').existsSync(ratioSource)) entry.aspectRatio = await media.referenceAspectRatio(ratioSource);
  if (tier === 'budget' && config.budgetBrideOnlyDemo && subject === 'couple') entry.available = false;
  if (generationMode === 'speed') return { ...entry, sourceVideoPath: null, sourceVideoUrl: null, sourceVideoAsset: null };
  return { ...entry, sourceVideoPath: entry.version === 'courtyard-v2' ? entry.sourceVideoPath : base.sourceVideoPath || entry.sourceVideoPath, referenceImagePaths: [], referenceImageDescriptions: [] };
}
async function resolve(body) {
  const defaults = (await store.read()).defaults;
  const values = { ...defaults, ...body };
  if(values.tier==='ultrafast') {
    const scenes=require('./studioUltraFastTemplates');
    const scene=scenes.find(item=>item.id===(values.videoScene || values.scene)) || (values.outputType==='image'?scenes[0]:null);
    if(!scene)throw new Error('Choose an Ultra Fast image-based video template.');
    if(scene.subjects.solo.hidden || scene.subjects.solo.available===false)throw new Error('Ultra Fast templates are hidden until the owner provides approved prompts.');
    const options=config.resolve({...values,workflow:'preset',generationMode:'speed',scene:scene.id,subjectMode:'solo'},scene.subjects.solo);
    if(values.outputType!=='video'){
      const image=imageScenes.find(item=>item.id===values.imageScene);
      if(!image)throw new Error('Choose an image template for this bundle.');
      options.imagePrompt=image.subjects.solo.imagePrompt;options.imageTemplateId=image.subjects.solo.templateId;options.imageScene=image.id;
    }
    return {...generationRoute.enforce(generationRoute.resolve('ultrafast','speed'),options),videoScene:scene.id,imageSubjectMode:'solo',videoSubjectMode:'solo'};
  }
  if (values.workflow === 'prompt') {
    const resolved = config.resolve(values);
    return generationRoute.enforce(generationRoute.resolve(resolved.tier, resolved.generationMode), resolved);
  }
  const quality = values.tier === 'budget' ? 'budget' : 'shared';
  const imageScene = values.imageScene || values.scene;
  if (values.outputType !== 'video' && !imageScenes.some(item => item.id === imageScene))
    throw new Error('Choose one of the new bridal image templates. Previous image recipes are no longer available for generation.');
  const videoScene = values.outputType === 'image' && values.tier === 'flagship' ? config.flagshipScenes[0]?.id : values.outputType === 'image'
    ? (values.tier === 'budget' ? (values.generationMode === 'speed' ? config.budgetSpeedScenes : config.budgetScenes)
      : (values.generationMode === 'speed' ? config.premiumSpeedScenes : config.premiumBalanceScenes))[0]?.id
    : values.videoScene || values.scene;
  // Each output owns its prompt and style anchor. Legacy callers still use scene.
  const imageSubjectMode = values.imageSubjectMode || values.subjectMode;
  const videoSubjectMode = values.tier === 'flagship' ? 'couple' : values.videoSubjectMode || values.subjectMode;
  // Image-only requests still resolve a valid video configuration; its scene
  // never becomes an image reference or replaces the chosen image recipe.
  const activeScene = videoScene;
  const generationMode = values.generationMode || 'speed';
  const resolved = config.resolve({ ...values, subjectMode: videoSubjectMode, scene: activeScene }, await recipe(activeScene, videoSubjectMode, quality, generationMode));
  if (values.outputType !== 'video') {
    const imageRecipe = await recipe(imageScene, imageSubjectMode, quality, generationMode);
    resolved.imagePrompt = imageRecipe.imagePrompt;
    resolved.imageTemplateId = imageRecipe.templateId || imageScene;
    resolved.imageTemplateNumber = imageRecipe.templateNumber || null;
    resolved.imageReferenceImageUrl = imageRecipe.referenceImageUrl || null;
    resolved.imageReferenceImagePath = imageRecipe.imageReferenceImagePath || null;
    resolved.imageReferenceImageUrl = null;
    resolved.imageTemplateVersion = imageRecipe.version;
  }
  const route = generationRoute.resolve(resolved.tier, resolved.generationMode);
  const routed = generationRoute.enforce(route, resolved);
  return { ...routed, subjectMode: values.outputType === 'image' ? imageSubjectMode : videoSubjectMode, imageSubjectMode, videoSubjectMode, imageScene, videoScene };
}
async function publicConfig() {
  const value = await store.read();
  async function publicScenes(source, tier, generationMode = 'balance') { return Promise.all(source.map(async scene => ({
    id: scene.id, label: scene.label, description: scene.description, category: scene.category || 'pre-wedding',
    comingSoon: Boolean(scene.subjects.solo?.comingSoon), copiedFromQuick: Boolean(scene.subjects.solo?.copiedFromQuick),
    subjects: Object.fromEntries(await Promise.all(['solo', 'couple'].map(async subject => {
      const entry = await recipe(scene.id, subject, tier, generationMode);
      return [subject, { label: entry.label || scene.label, description: entry.description || scene.description, available: entry.available !== false, templateId: entry.templateId, templateNumber: entry.templateNumber, sound: entry.sound, previewUrl: entry.previewUrl || (entry.thumbnailPath ? '/api/videos/studio/template-thumbnail/' + encodeURIComponent(entry.templateId) : entry.referenceImageUrl), sourceFilename: entry.sourceFilename || null, referenceVideoUrl: entry.sourceVideoUrl, hasReferenceImage: Boolean(entry.referenceImageUrl || entry.referenceImagePath), hasReferenceVideo: Boolean(entry.sourceVideoUrl || entry.sourceVideoPath || entry.sourceVideoAsset), hasImagePrompt: typeof entry.imagePrompt === 'string' && entry.imagePrompt.trim().length >= 5, hasVideoPrompt: typeof entry.prompt === 'string' && entry.prompt.trim().length >= 5, reusesFlowClip: Boolean(entry.sourceVideoAsset), hasMusic: Boolean(entry.musicPath || entry.useSourceAudio), version: entry.version, duration: entry.duration || null, aspectRatio: entry.aspectRatio || null }];
    }))),
  }))); }
  const ultraFastScenes=require('./studioUltraFastTemplates').filter(scene=>!scene.subjects.solo.hidden).map(scene=>({...scene,subjects:{solo:{...scene.subjects.solo,prompt:undefined,hasVideoPrompt:true,hasWrittenShotPlan:true,hasReferenceImage:false,hasReferenceVideo:false},couple:{available:false}}}));
  return { defaults: value.defaults, ultraFastScenes, flagshipScenes: await publicScenes(config.flagshipScenes, 'shared', 'balance'), imageScenes: await publicScenes(imageScenes, 'shared', 'speed'), scenes: await publicScenes(config.premiumSpeedScenes, 'shared', 'speed'),
    premiumSpeedScenes: await publicScenes(config.premiumSpeedScenes, 'shared', 'speed'),
    premiumBalanceScenes: await publicScenes(config.premiumBalanceScenes, 'shared', 'balance'),
    budgetScenes: await publicScenes(config.budgetScenes, 'budget'), budgetSpeedScenes: await publicScenes(config.budgetSpeedScenes, 'budget', 'speed') };
}
async function list(tier = 'shared') {
  if (!['shared', 'budget'].includes(tier)) throw new Error('Choose a valid template quality.');
  const source = tier === 'budget' ? config.budgetScenes : config.scenes;
  return Promise.all(source.map(async scene => ({
    id: scene.id, label: scene.label, description: scene.description,
    subjects: Object.fromEntries(await Promise.all(['solo', 'couple'].map(async subject => {
      const { sourceVideoPath, referenceImagePath, musicPath, ...entry } = await recipe(scene.id, subject, tier);
      return [subject, { ...entry, hasReferenceVideo: Boolean(sourceVideoPath || entry.sourceVideoUrl || entry.sourceVideoAsset), hasMusic: Boolean(musicPath || entry.useSourceAudio) }];
    }))),
  })));
}
async function update(scene, subject, body, files = {}, tier = 'shared') {
  const name = key(scene, subject, tier);
  const change = {};
  if (body.sourceVideoAsset !== undefined) {
    if (String(body.sourceVideoAsset).trim()) throw new Error('Google Flow assets are no longer accepted. Upload the source clip for Higgsfield instead.');
    change.sourceVideoAsset = null;
    change.flowProjectUrl = null;
  }
  for (const field of ['prompt', 'imagePrompt']) {
    if (body[field] !== undefined) {
      const text = String(body[field]).trim();
      const limit = field === 'prompt' && (await recipe(scene, subject, tier)).verbatimPrompt ? 40000 : 30000;
      if (text.length < 5 || text.length > limit) throw new Error('Saved prompts must contain 5 to ' + limit.toLocaleString('en-US') + ' characters.');
      change[field] = text;
    }
  }
  const prefix = 'templates/' + tier + '/' + scene + '/' + subject + '/' + randomUUID();
  if (files.referenceImage?.[0]) {
    const file = files.referenceImage[0];
    await media.saveUpload(file, 'image-anchor');
    const result = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME, prefix + '.jpg', file.buffer, file.mimetype);
    change.referenceImageUrl = result.publicUrl;
  }
  if (files.sourceVideo?.[0]) {
    if (change.sourceVideoAsset) throw new Error('Choose either a saved Flow clip or a new reference upload, not both.');
    change.sourceVideoAsset = null;
    change.flowProjectUrl = null;
    const saved = await media.saveUpload(files.sourceVideo[0], 'source');
    const prepared = await media.prepareVideo(saved, (await recipe(scene, subject, tier)).duration || 8);
    const result = await storage.uploadVideo(process.env.SUPABASE_BUCKET_NAME, prefix + '.mp4', await media.readFile(prepared), 'video/mp4');
    change.sourceVideoUrl = result.publicUrl;
    change.sourceVideoPath = prepared;
  }
  if (files.music?.[0]) {
    const saved = await media.saveUpload(files.music[0], 'music');
    await media.validateTrack(saved);
    change.musicPath = saved;
  }
  if (body.useSourceAudio !== undefined) change.useSourceAudio = body.useSourceAudio === true || body.useSourceAudio === 'true';
  if (body.removeVideo === 'true') { change.sourceVideoUrl = null; change.sourceVideoPath = null; change.sourceVideoAsset = null; change.flowProjectUrl = null; change.useSourceAudio = false; }
  if (body.removeImage === 'true') change.referenceImageUrl = null;
  if (body.removeMusic === 'true') change.musicPath = null;
  const current = await recipe(scene, subject, tier);
  const sourcePath = Object.hasOwn(change, 'sourceVideoPath') ? change.sourceVideoPath : current.sourceVideoPath;
  if ((change.useSourceAudio ?? current.useSourceAudio) && !sourcePath) throw new Error('Attach a reference video before using its audio.');
  if (change.useSourceAudio) await media.validateTrack(change.sourceVideoPath || current.sourceVideoPath);
  await store.update(value => {
    const previous = value.recipes[name] || {};
    value.recipes[name] = { ...previous, ...change, version: (previous.version || 1) + 1 };
    return value;
  });
  return recipe(scene, subject, tier);
}
async function updateDefaults(body) {
  const defaults = { ...(await store.read()).defaults, ...body };
  config.resolve({ ...defaults, workflow: 'preset' });
  if (!['standard', 'vip'].includes(defaults.mode)) throw new Error('Choose Standard or VIP.');
  return (await store.update(value => ({ ...value, defaults: { tier: defaults.tier, scene: defaults.scene, mode: defaults.mode, subjectMode: defaults.subjectMode } }))).defaults;
}
module.exports = { recipe, resolve, publicConfig, list, update, updateDefaults };
