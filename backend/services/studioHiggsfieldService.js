const { readFile } = require('node:fs/promises');
const path = require('node:path');
const mcp = require('./higgsfieldMCPClient');
const storage = require('./storageService');
const sourceUploads = new Map();
const submission = require('./higgsfieldSubmission');

async function submit(tool, params, sessionId, onAttempt, onResponse) {
  await onAttempt?.();
  let response;
  try {
    response = tool === 'generate_video' ? await mcp._submitVideoJob(params, sessionId) : await mcp._mcpCall(tool, {params});
    await onResponse?.(response);
    return submission.submittedJob(response);
  } catch (error) {
    await onResponse?.({error:{message:error.message,code:error.code || 'TRANSPORT_ERROR'}});
    // A timed-out paid POST must never be silently retried: it may be accepted.
    if (!['PROVIDER_REQUEST_REJECTED','PROVIDER_JOB_REJECTED','SUBMISSION_UNCERTAIN'].includes(error.code)) {
      const uncertain = new Error('Connection ended before Higgsfield confirmed the submission. Check the saved request before generating again.');
      uncertain.code = 'SUBMISSION_UNCERTAIN';
      throw uncertain;
    }
    throw error;
  }
}

function selectedModel(options) {
  if (options.tier === 'flagship') return { id: 'hf_mult_motion_control' };
  const id = options.tier === 'budget' ? 'wan3_0_prime' : options.model || 'wan3_0_prime';
  require('./studioModels').videoModel(id);
  return id === 'seedance_2_5' ? { id, mode: 'video_edit' } : { id };
}

function videoParams(options, medias = []) {
  const model = selectedModel(options);
  const params = { model: model.id, prompt: options.prompt, aspect_ratio: options.aspectRatio,
    duration: options.duration, resolution: options.resolution, medias, count: 1 };
  if (model.mode) params.mode = model.mode;
  if (model.id !== 'hf_mult_motion_control') params.generate_audio = Boolean(options.sound);
  if (model.id === 'wan3_0_prime') params.enable_thinking = Boolean(options.enableThinking);
  if (model.mode === 'video_edit' || model.id === 'hf_mult_motion_control') {
    if (!medias.some(item => item.role === 'video_references')) throw new Error('This model needs a reference video. Upload one before generating.');
    delete params.duration;
    delete params.aspect_ratio;
  }
  return params;
}

async function importReference(url, type) {
  const result = await mcp._mcpCall('media_import_url', { url, type });
  const id = result?.media_id || result?.id || result?.media?.id;
  if (!id) throw new Error('Higgsfield did not confirm a reference upload. No generation was submitted.');
  return id;
}

async function sourceVideo(options, id) {
  if (options.sourceVideoUrl) return options.sourceVideoUrl;
  if (!options.sourceVideoPath) return null;
  const stamp = await require('node:fs/promises').stat(options.sourceVideoPath);
  const key = options.sourceVideoPath + ':' + stamp.size + ':' + stamp.mtimeMs;
  if (!sourceUploads.has(key)) sourceUploads.set(key, (async () => {
    const file = await readFile(options.sourceVideoPath);
    const uploaded = await storage.uploadVideo(process.env.SUPABASE_BUCKET_NAME,
      `experiences/${id}/motion-reference-${path.basename(options.sourceVideoPath)}`, file, 'video/mp4');
    return uploaded.publicUrl;
  })());
  try { return await sourceUploads.get(key); }
  catch(error) { sourceUploads.delete(key); throw error; }
}

async function imageMedias(references, role = 'image_references') {
  const unique = [...new Set(references.filter(ref => ref?.url).map(ref => ref.url))];
  return Promise.all(unique.map(async url => ({ role, value: await importReference(url, 'image') })));
}

function requireOwnerApproval(cost, approvedCredits) {
  if (Number.isFinite(approvedCredits)) {
    if (cost > approvedCredits) throw new Error('The credit price increased. Get a new quote before generating.');
    return;
  }
  // Disabled until the owner explicitly approves a paid live test.
  if (process.env.HIGGSFIELD_SPEND_ENABLED !== 'true') {
    const error = new Error(`Higgsfield is connected, but paid creation is paused for owner approval${cost == null ? '' : ` (${cost} credits quoted)`}. No generation was submitted.`);
    error.code = 'OWNER_APPROVAL_REQUIRED';
    throw error;
  }
}

function quotedCredits(result) {
  const rejected = submission.rejection(result);
  if (rejected) throw rejected;
  if (result?.unlim_choice) throw new Error('Higgsfield requires the owner to choose a credit source. No generation was submitted.');
  const value = result?.cost?.credits_exact ?? result?.cost?.credits;
  if (value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('Higgsfield did not return a credit quote. No generation was submitted.');
  return Number(value);
}

async function makeImage({ prompt, references, brideImageUrl, dressImageUrl, aspectRatio, sessionId, recoverId, onSubmitted, onAttempt, onResponse, approvedCredits, imageResolution = '2k' }) {
  if (!['1k', '2k'].includes(imageResolution)) throw new Error('Choose 1K or 2K image quality.');
  const model = 'GPT Image 2';
  if (recoverId) return { imageUrl: await mcp._pollJob(recoverId, sessionId, 'image'), jobId: recoverId, provider: 'higgsfield-mcp', model, aspectRatio: aspectRatio || '3:4', resolution: imageResolution };
  const imageReferences = references || [{ role: 'bride', url: brideImageUrl }, { role: 'dress', url: dressImageUrl }];
  const medias = await imageMedias(imageReferences, 'image');
  const params = { model: 'gpt_image_2', prompt, aspect_ratio: aspectRatio || '3:4',
    resolution: imageResolution, quality: 'medium', medias, count: 1 };
  const quote = await mcp._mcpCall('generate_image', { params: { ...params, get_cost: true } });
  requireOwnerApproval(quotedCredits(quote), approvedCredits);
  const {id:jobId, job:first} = await submit('generate_image', params, sessionId, onAttempt, onResponse);
  await onSubmitted?.(jobId);
  const failure = require('./higgsfieldJobState').failureFor(first);
  if (failure) throw failure;
  const imageUrl = first?.results?.rawUrl || first?.results?.url || await mcp._pollJob(jobId, sessionId, 'image');
  return { imageUrl, jobId, provider: 'higgsfield-mcp', model, aspectRatio: params.aspect_ratio, resolution: imageResolution, generatedAt: new Date().toISOString() };
}

async function makeVideo({ options, references, sessionId, provider, onSubmitted, onAttempt, onResponse }) {
  if (provider?.kind === 'higgsfield-mcp' && provider.id) {
    return { videoUrl: await mcp._pollJob(provider.id, sessionId), jobId: provider.id };
  }
  require('./studioPromptValidation').validateVideoPrompt(options);
  const medias = await imageMedias(references);
  if (options.generationMode === 'balance') {
    const url = await sourceVideo(options, sessionId);
    if (!url) throw new Error('This Balance template has no usable motion reference. No generation was submitted.');
    medias.push({ role: 'video_references', value: await importReference(url, 'video') });
  }
  const params = videoParams(options, medias);
  const quote = await mcp._submitVideoJob({ ...params, get_cost: true }, sessionId);
  requireOwnerApproval(quotedCredits(quote), options.approvedCreditCosts?.video);
  const {id:jobId, job:first} = await submit('generate_video', params, sessionId, onAttempt, onResponse);
  await onSubmitted?.({ kind: 'higgsfield-mcp', id: jobId });
  const failure = require('./higgsfieldJobState').failureFor(first);
  if (failure) throw failure;
  return { videoUrl: first?.results?.rawUrl || await mcp._pollJob(jobId, sessionId), jobId };
}

module.exports = { selectedModel, videoParams, importReference, makeImage, makeVideo, quotedCredits, sourceVideo };
