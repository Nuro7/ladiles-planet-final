const { randomUUID } = require('node:crypto');
const path = require('node:path');
const sharp = require('sharp');
const { createStore } = require('../utils/studioStore');
const storage = require('./storageService');
const imageClient = require('./studioHiggsfieldImageService');
const video = require('./studioVideoService');
const templates = require('./studioTemplateService');
const dressService = require('./dressService');
const { transitionTiming, refreshCreationTiming } = require('../utils/studioTiming');
const generationRoute = require('./studioGenerationRoute');
const { studioErrorMessage } = require('../utils/studioErrorMessage');

const store = createStore(process.env.STUDIO_EXPERIENCE_STORE || path.join(__dirname, '..', 'data', 'studio-experiences.json'), [], { backup:true });
const runtime = require('./runtimeService');
const jobs = new Map();
const loaded = store.read().then(saved => {
  for (const job of saved) {
    job.subjectMode ||= 'solo';
    job.outputType ||= 'both';
    if (job.options && !job.options.generationMode) {
      job.options.generationMode = job.options.sourceVideoUrl || job.options.sourceVideoPath || job.options.sourceVideoAsset ? 'balance' : 'speed';
      job.generationMode = job.options.generationMode;
    }
    if (job.image.status === 'generating') job.image = { ...job.image, status: 'interrupted', message: 'Image work was interrupted. Try again.' };
    if (job.video.status === 'generating') job.video = { ...job.video, status: 'interrupted', message: 'Film work was interrupted. Recover its result before retrying.' };
    if (job.video.upscaleStatus === 'generating') job.video = {...job.video,upscaleStatus:'error',message:'Upscaling was interrupted. Your preview is safe; retry Upscale.'};
    jobs.set(job.id, job);
  }
});
function publicJob(job) {
  if (!job) return null;
  const { assets, options, ...visible } = job;
  const result = structuredClone(visible);
  result.historyMetadata = {};
  for (const kind of ['image','video']) {
    const image=kind==='image';
    result.historyMetadata[kind]=require('./studioHistoryMetadata').metadata({
      model:image?'gpt_image_2':options?.model || job.model,
      mode:image?'medium':options?.model==='seedance_2_5'?'video_edit':null,
      prompt:image?imageInstructions(job):options?.prompt,
      template:image?job.imageScene:job.videoScene || job.scene,
      resolution:image?options?.imageResolution:options?.resolution,
      duration:image?null:options?.duration,
      aspectRatio:image?options?.imageAspectRatio || (job.tier==='custom'?options?.aspectRatio:(job.imageSubjectMode || job.subjectMode)==='couple'?'4:3':'3:4'):options?.aspectRatio,
      source:'Saved platform request',
    });
  }
  for (const part of ['image','video']) if(result[part]?.message) result[part].message=studioErrorMessage(result[part].message);
  return { ...result, serverNow: new Date().toISOString() };
}
async function save() { await store.update(() => [...jobs.values()].map(job => structuredClone(job))); }
async function saveSubmissionResponse(job, part, response) {
  // Keep troubleshooting data local, without reference URLs or prompt contents.
  const first = require('./higgsfieldJobState').itemsFrom(response)[0];
  job.assets[part + 'SubmissionResponse'] = { at:new Date().toISOString(), keys:Object.keys(response || {}),
    id:first?.id || response?.job_id || response?.id, status:first?.status || response?.status,
    error:response?.error, notice:response?.notice?.message, text:response?.text };
  await save();
}
async function update(job, part, changes) {
  const now = new Date().toISOString();
  job[part] = transitionTiming(job[part], changes, now);
  job.updatedAt = now;
  refreshCreationTiming(job, now);
  await save();
}
async function get(id) {
  await loaded;
  const job = jobs.get(id);
  if (job && ['generating','interrupted'].includes(job.video.status) && job.assets?.provider?.id) {
    // Reconcile stopped jobs after restart too. Read-only: never submit or retry.
    try {
      const {itemsFrom, failureFor} = require('./higgsfieldJobState');
      const response = await require('./higgsfieldMCPClient')._mcpCall('job_display', {id:job.assets.provider.id});
      const failure = failureFor(itemsFrom(response).find(item=>String(item.id)===String(job.assets.provider.id)));
      if (failure) await update(job,'video',{status:'error',progress:0,message:studioErrorMessage(failure)});
    } catch (error) { console.warn('[Studio] Provider status reconciliation:',error.message); }
  }
  return publicJob(job);
}
async function list() { await loaded; return [...jobs.values()].map(publicJob).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
function references(job, kind = 'video') {
  const result = [];
  const subjectMode = kind === 'image' ? job.imageSubjectMode || job.subjectMode : job.videoSubjectMode || job.subjectMode;
  if (job.assets.brideUrl) result.push({ role: 'bride', url: job.assets.brideUrl });
  if (subjectMode === 'couple' && job.assets.groomUrl) result.push({ role: 'groom', url: job.assets.groomUrl });
  const views = job.assets.dressViews || [{ url: job.assets.dressUrl, angle: 'front' }];
  for (const view of views) if (view.url) result.push({ role: 'dress ' + view.angle, url: view.url });
  const hasSceneStillSet = kind === 'video' && job.options.referenceImagePaths?.length;
  const styleUrl = kind === 'image' ? null : hasSceneStillSet ? null : job.options.referenceImageUrl;
  if (styleUrl) result.push({ role: 'scene style only', url: styleUrl });
  return result;
}
function imageInstructions(job) {
  if (job.tier === 'custom') return job.options.prompt;
  const subjectMode = job.imageSubjectMode || job.subjectMode;
  return [
    job.options.imagePrompt || 'Create a realistic bridal fashion photograph.',
    'Preserve the bride identity, skin tone and facial features from the bride reference. Dress views all show the same garment: preserve its actual colour, embroidery, silhouette and draping.',
    subjectMode === 'couple' ? 'The groom reference is the actual partner. Preserve his distinct face; do not blend the two faces. Only this bride and this groom are the main subjects.' : 'Bride only. Do not add a groom or extra partner.',
    'FRAMING IS MANDATORY: one bright, complete head-to-toe full-body photograph. Pull the camera back and leave generous space above the head and below the feet. Keep the entire head, both feet, hands, full skirt hem and complete outfit inside the frame; for a couple, show both people fully from head to toe. No close-up, beauty portrait, bust crop, waist-up frame, cut-off head, missing limbs, partial body, sheet, collage or inset panels. If scene guidance suggests a close frame, ignore that framing and use a wide full-body composition instead.',
    'The written scene description guides setting and light. No external style image is attached. Natural skin texture and anatomy; no text.',
  ].join('\n');
}
function renderImage(job) {
  return runtime.track(() => runtime.generations.run(() => renderImageWork(job))
    .catch(error => update(job, 'image', { status:'error', message:studioErrorMessage(error) })));
}
async function renderImageWork(job) {
  await update(job, 'image', { status: 'generating', stage:'preparing', message: 'References ready. Preparing your bridal look…' });
  try {
    const refs = references(job, 'image');
    if (/^BRIDAL_IMAGE_0[3-8]$/.test(job.options.imageTemplateId || '') && !job.assets.imageProvider) {
      const sheet = await require('node:fs/promises').readFile(path.join(__dirname, '../assets/global/bridal-ornaments-reference.png'));
      const uploaded = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME,
        'experiences/' + job.id + '/image-bridal-ornaments-reference.png', sheet, 'image/png');
      refs.push({ role: 'bridal jewellery sheet', url: uploaded.publicUrl });
    }
    const result = await imageClient.generateImage({
      brideImageUrl: job.assets.brideUrl, dressImageUrl: job.assets.dressUrl,
      references: refs, prompt: imageInstructions(job), sessionId: job.id,
      flowDressKey: job.options.flowDressKey,
      referenceImagePath: job.options.imageReferenceImagePath || null,
      aspectRatio: job.options.imageAspectRatio || (job.tier === 'custom' ? job.options.aspectRatio : (job.imageSubjectMode || job.subjectMode) === 'couple' ? '4:3' : '3:4'), recoverId: job.assets.imageProvider,
      approvedCredits: job.options.approvedCreditCosts?.image,
      imageResolution: job.options.imageResolution,
      onAttempt: async () => {job.assets.imageSubmissionUncertain=true;await save();},
      onResponse: response => saveSubmissionResponse(job,'image',response),
      onSubmitted: async id => { job.assets.imageProvider = id; job.assets.imageSubmissionUncertain=false; await update(job,'image',{stage:'submitted',message:'Generation submitted. Creating your bridal look…'}); },
    }, (progress, message) => {
      if (job.image.status === 'generating') update(job, 'image', { progress, message }).catch(error => console.error('[Studio] Image progress:', error.message));
    });
    if (!result.imageUrl) throw new Error('The image provider returned no image.');
    job.assets.localImageFile = await require('./studioMediaService').saveGeneratedImage(result.imageUrl, job.id);
    await update(job, 'image', { status: 'ready', url: '/api/videos/studio/media/' + job.id + '/image', message: job.outputType === 'image' ? 'Your bridal look is ready.' : 'Your bridal look is ready. The film request is already underway.' });
  } catch (error) {
    console.error('[Studio] Image:', error.message);
    if (error.code === 'SUBMISSION_UNCERTAIN') job.assets.imageSubmissionUncertain = true;
    if (['PROVIDER_REQUEST_REJECTED','PROVIDER_JOB_REJECTED'].includes(error.code)) job.assets.imageSubmissionUncertain=false;
    await update(job, 'image', { status: 'error', message: studioErrorMessage(error) });
    if (job.mode === 'standard' && job.video.status === 'awaiting_approval')
      await update(job, 'video', { status: 'blocked', message: 'The film is waiting for a successful bridal image. Recover the image first.' });
  }
}
function renderVideo(job, approved = false, recover = false) {
  return runtime.track(() => runtime.generations.run(() => renderVideoWork(job, approved, recover))
    .catch(error => update(job, 'video', { status:'error', message:studioErrorMessage(error) })));
}
async function renderVideoWork(job, approved = false, recover = false) {
  await update(job, 'video', { status: 'generating', stage:'preparing', message: recover ? 'Recovering the existing film…' : 'References ready. Preparing your film…' });
  try {
    const onProgress = (progress, message, details = {}) => {
      if (job.video.status === 'generating') update(job, 'video', { progress, message, ...(details.preparationTimings ? {preparationTimings:details.preparationTimings} : {}) }).catch(error => console.error('[Studio] Save:', error.message));
    };
    const onSubmitted = async provider => { job.assets.provider = provider; job.assets.submissionUncertain=false; await update(job,'video',{stage:'submitted',message:'Generation submitted. Higgsfield is creating your film…'}); };
    const url = await video.render(job.id, job.options, {
      references: references(job), imageUrls: references(job).map(ref => ref.url),
      firstFrameUrl: approved ? job.image.url : null,
      sourceVideoUrl: job.options.sourceVideoUrl, provider: recover ? job.assets.provider : null, onSubmitted,
      onAttempt: async () => {job.assets.submissionUncertain=true;await save();},
      onResponse: response => saveSubmissionResponse(job,'video',response),
      rawVideoFile: recover ? job.assets.rawVideoFile : null,
      onRawReady:async file=>{job.assets.rawVideoFile=file;await save();},
    }, onProgress);
    if (video.localResults.has(job.id)) job.assets.localVideoFile = video.localResults.get(job.id);
    if(job.options.previewFirst)job.assets.previewVideoFile=job.assets.localVideoFile;
    await update(job, 'video', { status: 'ready', progress: 100, url, isPreview:Boolean(job.options.previewFirst),quality:job.options.previewFirst?'720p':job.options.resolution,upscaleStatus:job.options.previewFirst?'available':undefined,message:job.options.previewFirst?'720p preview ready. Review the face and dress, then click Upscale for the 1080p final.':'Your film is ready. Review the faces and outfit before sharing.' });
  } catch (error) {
    console.error('[Studio] Film:', error.message);
    if (error.code === 'SUBMISSION_UNCERTAIN') job.assets.submissionUncertain = true;
    if (['PROVIDER_REQUEST_REJECTED','PROVIDER_JOB_REJECTED'].includes(error.code)) job.assets.submissionUncertain=false;
    const message = error.code === 'FLOW_LOGIN_REQUIRED' ? 'Budget needs the owner to reconnect. Your saved images are safe.' : error.code === 'PROVIDER_AUTH' ? 'This creation option needs an account update. Contact the boutique owner.' : studioErrorMessage(error);
    await update(job, 'video', { status: 'error', progress: 0, errorCode:error.code || 'GENERATION_ERROR', canRecover:Boolean(job.assets.provider?.id), message: job.assets.submissionUncertain ? 'Higgsfield did not confirm this submission. The request is saved. Check the connected account before creating another video.' : message });
  }
}
async function upload(file, id, name) {
  if (!file) return null;
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
  if (!extension) throw new Error('Choose JPG, PNG or WEBP images.');
  return (await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME, 'experiences/' + id + '/' + name + '.' + extension, file.buffer, file.mimetype)).publicUrl;
}
async function ensureVideo(options) {
  const balance = await require('./higgsfieldMCPClient').getBalance();
  if (!Number.isFinite(Number(balance.credits))) throw new Error('Higgsfield connection is not ready. No generation was submitted.');
}
function prepareAndStart(...args) { return runtime.track(() => prepareAndStartWork(...args)); }
async function prepareAndStartWork(job, bride, groom, dressFiles, selectedDress, savedBride) {
  try {
    for (const part of ['image','video']) if(job[part].status!=='skipped') await update(job,part,{stage:'uploading',message:'Checking and uploading your reference photos…'});
    const readiness = ensureVideo(job.options);
    const assetPreparation = (async () => {
      const [brideUrl, groomUrl, uploadedDress] = await Promise.all([
        savedBride ? Promise.resolve(savedBride.url) : upload(bride, job.id, 'bride'), upload(groom, job.id, 'groom'),
        Promise.all(dressFiles.map((file, index) => upload(file, job.id, 'dress-' + index))),
      ]);
      const angles = ['front', 'detail', 'side', 'back', 'dupatta', 'blouse', 'full', 'other'];
      const dressViews = selectedDress?.images || uploadedDress.map((url, index) => ({ url, angle: angles[index] }));
      return { brideUrl, groomUrl, dressViews };
    })();
    const [readyResult, assetResult] = await Promise.allSettled([readiness, assetPreparation]);
    if (readyResult.status === 'rejected') throw readyResult.reason;
    if (assetResult.status === 'rejected') throw assetResult.reason;
    const prepared = assetResult.value;
    job.assets = { brideUrl: prepared.brideUrl, groomUrl: prepared.groomUrl,
      dressUrl: selectedDress?.imageUrl || prepared.dressViews[0]?.url, dressViews: prepared.dressViews };
    if (prepared.flowDressKey) job.options.flowDressKey = prepared.flowDressKey;
    await save();

    // Start both Higgsfield requests in the same turn after references are ready.
    const tasks = [];
    if (job.outputType !== 'video') tasks.push(renderImage(job));
    if (job.outputType !== 'image') tasks.push(renderVideo(job));
    await Promise.allSettled(tasks);
  } catch (error) {
    console.error('[Studio] Preparation:', error.message);
    const message = studioErrorMessage(error);
    if (job.image.status === 'queued') await update(job, 'image', { status: 'error', message });
    if (job.video.status === 'queued') await update(job, 'video', { status: 'error', progress: 0, message });
  }
}
async function start(body, files = {}) {
  const startedAt = new Date().toISOString();
  await loaded;
  const options = await templates.resolve(body);
  options.previewFirst = false;
  const selectedRoute = generationRoute.resolve(options.tier, options.generationMode);
  const mode = body.mode || (await templates.publicConfig()).defaults.mode;
  const outputType = body.outputType || (options.workflow === 'prompt' ? 'video' : 'both');
  if (!['standard', 'vip'].includes(mode)) throw new Error('Choose Standard or VIP.');
  if (!['image', 'video', 'both'].includes(outputType)) throw new Error('Choose image, film or both.');
  require('./studioPromptValidation').validateVideoPrompt(options, outputType);
  options.approvedCreditCosts = require('./studioCreditQuote').consume(body.creditQuoteId, options, outputType);
  const bride = files.brideImage?.[0], groom = files.groomImage?.[0];
  if (bride && body.brideId) throw new Error('Choose a saved bride or upload a new bride photo, not both.');
  const savedBride = body.brideId ? await require('./savedBrideService').resolve(body.brideId, body.brideImageId) : null;
  const dressFiles = files.dressImages || files.dressImage || [];
  if (options.workflow === 'preset' && !bride && !savedBride) throw new Error('Add the bride image or choose a saved bride.');
  const needsGroom = outputType === 'both'
    ? options.imageSubjectMode === 'couple' || options.videoSubjectMode === 'couple'
    : options.subjectMode === 'couple';
  if (needsGroom && ((!bride && !savedBride) || !groom)) throw new Error('Add both the bride and the groom photos for the selected couple prompt.');
  let selectedDress;
  if (body.recentDressKey) {
    const recent = await require('./dressFlowSyncService').get(body.recentDressKey);
    if (!recent || recent.kind !== 'recent') throw new Error('Recent dress not found.');
    selectedDress = {id:null,name:recent.name,images:recent.views,isAvailable:true,imageUrl:recent.views[0]?.url};
  } else if (body.dressId) {
    selectedDress = await dressService.getDressById(body.dressId);
    if (selectedDress.isDeleted || !selectedDress.isAvailable) throw new Error('This dress is unavailable. Choose another dress.');
  }
  if (options.workflow === 'preset' && !selectedDress && !dressFiles.length) throw new Error('Choose a gallery dress or upload its photos.');
  await Promise.all([bride, groom, ...dressFiles].filter(Boolean).map(file => sharp(file.buffer, { limitInputPixels: 40000000 }).metadata()));
  const id = randomUUID();
  const skipImage = outputType === 'video';
  const now = new Date().toISOString();
  const job = {
    id, mode, outputType, workflow: options.workflow, tier: options.tier, generationMode: selectedRoute.generationMode,
    provider: selectedRoute.provider, model: options.model, usage: { status: 'unavailable', estimatedCredits: null, reportedCredits: null, reportedCost: null }, scene: options.scene,
    imageScene: options.imageScene, videoScene: options.videoScene,
    imageTemplateId: options.imageTemplateId || options.imageScene, imageTemplateVersion: options.imageTemplateVersion || null,
    videoTemplateId: options.templateId || options.videoScene,
    bundleStartedAt: outputType === 'both' ? startedAt : null,
    subjectMode: options.videoSubjectMode || options.subjectMode,
    imageSubjectMode: options.imageSubjectMode || options.subjectMode,
    videoSubjectMode: options.videoSubjectMode || options.subjectMode,
    templateId: options.templateId, templateVersion: options.templateVersion, dressName: selectedDress?.name || null, dressId: selectedDress?.id || null,
    image: { status: skipImage ? 'skipped' : 'queued', message: skipImage ? '' : 'Starting image reference preparation…' },
    video: { status: outputType === 'image' ? 'skipped' : 'queued', progress: 0, message: outputType === 'image' ? '' : outputType === 'both' ? 'Preparing film references…' : 'Waiting to start…' },
    brideId: savedBride?.brideId || null, brideName: savedBride?.name || null,
    assets: { brideUrl: null, groomUrl: null, dressUrl: selectedDress?.imageUrl || null, dressViews: selectedDress?.images || [] },
    options, createdAt: now, updatedAt: now, startedAt,
  };
  jobs.set(id, job);
  await save();
  setImmediate(() => prepareAndStart(job, bride, groom, dressFiles, selectedDress, savedBride));
  return publicJob(job);
}
async function approve(id) {
  await loaded;
  const job = jobs.get(id);
  if (!job) throw new Error('Creation not found.');
  if (job.mode !== 'standard' || job.image.status !== 'ready' || job.video.status !== 'awaiting_approval') throw new Error('Wait for the image, then approve it once.');
  await ensureVideo(job.options);
  if (job.video.status !== 'awaiting_approval') throw new Error('This film has already started.');
  await update(job, 'video', { status: 'generating', message: 'Starting your film…' });
  await update(job, 'image', { message: 'Your bridal look is approved. Film creation is underway.' });
  renderVideo(job, true).catch(error => console.error('[Studio] Film worker:', error.message));
  return publicJob(job);
}
async function regenerateImage(id) {
  await loaded;
  const job = jobs.get(id);
  if (!job) throw new Error('Creation not found.');
  if (job.outputType === 'video') throw new Error('This is a video-only creation; no image generation was requested.');
  if (job.assets.imageSubmissionUncertain && !job.assets.imageProvider) throw new Error('The previous image request may have been accepted. Check Higgsfield before submitting another.');
  if (!['ready', 'error', 'interrupted'].includes(job.image.status) || !['awaiting_approval', 'skipped', 'blocked', 'error', 'interrupted'].includes(job.video.status)) throw new Error('Wait for the current film before changing its image.');
  if (!job.assets.imageProvider || job.image.status === 'ready') throw new Error('Start a new creation and approve its current credit quote before generating another image.');
  if (job.video.status === 'blocked') await update(job, 'video', { status: 'awaiting_approval', message: 'Approve your recovered look to start the film.' });
  await update(job, 'image', { status: 'generating', url: null });
  renderImage(job).catch(error => console.error('[Studio] Image worker:', error.message));
  return publicJob(job);
}
async function retryVideo(id) {
  await loaded;
  const job = jobs.get(id);
  if (!job) throw new Error('Creation not found.');
  if (!['error', 'interrupted'].includes(job.video.status)) throw new Error('The film is in progress or already ready.');
  const recover = Boolean(job.assets.provider);
  if (!recover) throw new Error('No confirmed job is available to recover. Check the saved error, then start a new creation with a fresh credit quote.');
  if (job.assets.submissionUncertain && !recover) throw new Error('The previous submission is uncertain. Ask the owner to check the account before submitting again.');
  if (job.video.status === 'interrupted' && !recover) throw new Error('The previous submission is uncertain. Check the provider account before starting a new creation.');
  await ensureVideo(job.options);
  if (!['error', 'interrupted'].includes(job.video.status)) throw new Error('Recovery has already started.');
  await update(job, 'video', { status: 'generating' });
  renderVideo(job, job.mode === 'standard' && job.image.status === 'ready', recover).catch(error => console.error('[Studio] Recovery:', error.message));
  return publicJob(job);
}
async function upscaleVideo(id) {
  await loaded;
  const job=jobs.get(id);
  if(!job || !job.video.isPreview || job.video.status!=='ready')throw new Error('Wait for a ready preview before upscaling.');
  if(job.video.upscaleStatus==='generating')throw new Error('Upscaling has already started.');
  job.video.upscaleStatus='generating';
  job.video.upscaleStartedAt=new Date().toISOString();
  delete job.video.upscaleFinishedAt;
  await save();
  runtime.track(async()=>{
    try{
      const url=await video.upscale(id,job.options,{provider:job.assets.provider,upscaledRawFile:job.assets.upscaledRawFile,onUpscaledRaw:async file=>{job.assets.upscaledRawFile=file;await save();}},(_,message)=>update(job,'video',{message}).catch(error=>console.error('[Studio] Upscale progress:',error.message)));
      job.assets.localVideoFile=video.localResults.get(id);
      await update(job,'video',{url,isPreview:false,quality:'1080p',upscaleStatus:'done',upscaleFinishedAt:new Date().toISOString(),message:'Your 1080p final video is ready.'});
    }catch(error){console.error('[Studio] Upscale:',error.message);await update(job,'video',{upscaleStatus:'error',upscaleFinishedAt:new Date().toISOString(),message:'Upscaling needs attention: '+studioErrorMessage(error)+' Your preview remains available.'});}
  }).catch(error=>console.error('[Studio] Upscale:',error.message));
  return publicJob(job);
}
async function localVideoFile(id,version) { await loaded; const assets=jobs.get(id)?.assets;return (version==='preview'?assets?.previewVideoFile:assets?.localVideoFile) || null; }
async function localImageFile(id) { await loaded; return jobs.get(id)?.assets?.localImageFile || null; }
module.exports = { start, get, list, approve, regenerateImage, retryVideo, upscaleVideo, localVideoFile, localImageFile, references };
