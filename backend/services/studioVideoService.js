const { randomUUID } = require('node:crypto');
const axios = require('axios');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const storage = require('./storageService');
const flow = require('./googleFlowMcpService');
const media = require('./studioMediaService');
const watermark = require('./watermarkService');
const templates = require('./studioTemplateService');
const sessions = require('./sessionService');
const localResults = new Map();
const generationRoute = require('./studioGenerationRoute');
const higgsfieldStudio = require('./studioHiggsfieldService');
const { referenceRules } = require('./bridalReferenceRules');
const bridalOrnamentsPath = path.join(__dirname, '..', 'assets', 'global', 'bridal-ornaments-reference.png');
const JEWELLERY_PLACEHOLDER = '{{JEWELLERY_BLOCK}}';
const JEWELLERY_FOUND = 'The LAST image is the JEWELLERY reference. Reproduce its exact pieces, design, stones, colours, metal finish, size and placement on the bride. Wear only those pieces; do not add others. Ignore its stand, box, model and background. Never copy VIDEO 1\'s jewellery. Ornaments stay attached and identical in every frame.';
const JEWELLERY_MINIMAL = 'No jewellery reference is attached. Use minimal, delicate bridal jewellery only: small stud or small drop earrings, one fine thin necklace or none, a few thin bangles. No heavy choker, maang tikka, matha patti, nath or layered sets. Never copy VIDEO 1\'s jewellery. Keep the same minimal pieces in every frame.';

function prepareDatabaseJewellery(options, references) {
  if (options.jewelleryMode !== 'database-or-minimal') return { options, references };
  const occurrences = String(options.prompt || '').split(JEWELLERY_PLACEHOLDER).length - 1;
  if (occurrences !== 1) throw new Error('This Premium template must contain exactly one jewellery placeholder. No generation was submitted.');
  const jewellery = references.find(ref => ref.role === 'jewellery' && ref.url);
  const withoutJewellery = references.filter(ref => ref.role !== 'jewellery');
  const ordered = jewellery ? [...withoutJewellery, jewellery] : withoutJewellery;
  const prompt = options.prompt.replace(JEWELLERY_PLACEHOLDER, jewellery ? JEWELLERY_FOUND : JEWELLERY_MINIMAL);
  return { options: { ...options, prompt }, references: ordered };
}

function credentials() {
  const combined = (process.env.HF_CREDENTIALS || '').trim();
  const separate = process.env.HIGGSFIELD_API_KEY && process.env.HIGGSFIELD_API_SECRET
    ? process.env.HIGGSFIELD_API_KEY.trim() + ':' + process.env.HIGGSFIELD_API_SECRET.trim() : '';
  const value = combined || separate;
  return /^[^:\s]+:[^:\s]+$/.test(value) ? value : '';
}
function client() {
  if (!credentials()) throw new Error('The owner must configure the creation account.');
  return axios.create({ baseURL: 'https://api.higgsfield.ai', headers: { Authorization: 'Key ' + credentials() }, timeout: 30000 });
}
function buildRequest(options, references, firstFrameUrl, sourceVideoUrl) {
  const refs = references.filter(ref => ref.url);
  if (options.ornamentReferenceUrl) refs.push({ role: 'Bridal ornaments sheet; one coherent rich jewellery ensemble only, never the mannequin or background', url: options.ornamentReferenceUrl });
  if (firstFrameUrl) refs.unshift({ role: 'approved bridal look; same people and exact outfit', url: firstFrameUrl });
  const prompt = [
    sourceVideoUrl
      ? 'Use the attached source video for choreography, shot order, transitions, framing and timing. Replace the original bride, and the groom when present, with the supplied people. Keep source camera movement and setting. The source identities and wardrobe are not targets.'
      : options.prompt,
    sourceVideoUrl ? 'Saved scene instructions (source timing takes priority): ' + options.prompt : '',
    sourceVideoUrl ? 'Scene direction: ' + (options.imagePrompt || '') : '',
    refs.map((ref, index) => 'Image ' + (index + 1) + ': ' + ref.role + '.').join('\n'),
    options.subjectMode === 'couple' ? 'Preserve the two distinct identities from the bride and groom references throughout. Do not merge faces or substitute a generic groom.' : 'Only the referenced bride. No groom or additional partner.',
    'Preserve bride facial features and skin tone. Dress views show one garment; keep colour, embroidery, silhouette and draping consistent across views and frames. Natural anatomy and realistic fabric motion.',
  ].filter(Boolean).join('\n');
  const model = options.tier === 'premium' ? 'seedance-2.0' : 'seedance-2.5';
  const kind = sourceVideoUrl && options.tier === 'flagship' ? 'video-edit' : refs.length || sourceVideoUrl ? 'reference-to-video' : 'text-to-video';
  const input = { prompt, resolution: options.resolution, generate_audio: !options.musicPath && !options.useSourceAudio && options.sound };
  if (kind !== 'video-edit') Object.assign(input, { duration: options.duration, aspect_ratio: options.aspectRatio });
  if (refs.length) input.image_urls = refs.map(ref => ref.url);
  if (sourceVideoUrl) {
    if (kind === 'video-edit') input.video_url = sourceVideoUrl;
    else input.video_urls = [sourceVideoUrl];
  }
  return { endpoint: 'bytedance/' + model + '/' + kind, input };
}
async function poll(id, onProgress) {
  const api = client();
  for (let attempt = 0; attempt < 240; attempt++) {
    const result = (await api.get('/requests/' + encodeURIComponent(id) + '/status')).data;
    if (result.status === 'completed') {
      const url = result.video?.url || result.data?.video?.url;
      if (!url) throw new Error('The generation completed without a downloadable film.');
      return url;
    }
    if (['failed', 'nsfw', 'cancelled'].includes(result.status)) throw new Error('The saved provider request did not complete. Start a new creation if you want another attempt.');
    onProgress(undefined, result.status === 'queued' ? 'Your film is waiting in the creation queue…' : 'Creating your film…');
    await new Promise(resolve => setTimeout(resolve, 3500));
  }
  throw new Error('Your film is taking longer than expected. Recover it instead of submitting again.');
}
async function budgetFiles(options, references, firstFrameUrl, sourceVideoUrl) {
  const hasSource = Boolean(sourceVideoUrl || options.sourceVideoPath || options.sourceVideoAsset);
  const maxImages = 7 - Number(hasSource);
  // Even with an approved image, the original bride and dress remain explicit
  // references. A first frame is an optional composition guide, not a substitute.
  const people = references.filter(ref => ['bride', 'groom'].includes(ref.role));
  const dresses = references.filter(ref => ref.role.startsWith('dress'));
  if (options.extendedReferences && !dresses.some(ref => ref.role === 'dress front')) {
    throw new Error('Add one full-front dress photo before creating this film. Close-up and side photos are optional. No generation was submitted.');
  }
  const files = [];
  const roles = [];
  const saved = options.flowDressKey ? await require('./dressFlowSyncService').bundle(options.flowDressKey, true) : null;
  if (people.length === 1) { files.push(await media.remoteImage(people[0].url, 'bride')); roles.push('BRIDE_IDENTITY: original uploaded bride photograph, identity only'); }
  else if (people.length) { files.push(await media.contactSheet(people.map(ref => ref.url), 'Identity reference')); roles.push('identity sheet: reference 1 is the bride, reference 2 is her groom; keep their distinct faces'); }
  if (people.length) files[0].identityReference = true;
  if (saved && dresses.length === 1) {
    const front = saved.photos.find(photo=>photo.angle==='front');
    if (!front) throw new Error('The saved full-front dress photo is missing. Retry dress sync.');
    files.push(front); roles.push('DRESS_REFERENCE: actual selected full-front dress photograph, garment only; no additional angles were supplied');
  }
  else if (saved) { files.push(saved.sheet); roles.push('DRESS_REFERENCE: saved dress sheet, all panels show ONE selected garment, not a collage to render'); }
  else if (dresses.length === 1) { files.push(await media.remoteImage(dresses[0].url, 'dress')); roles.push('DRESS_REFERENCE: actual selected dress photograph, garment only'); }
  else if (dresses.length) { files.push(await media.contactSheet(dresses.map(ref => ref.url), 'Dress view', {hero:true,heroIndex:Math.max(0,dresses.findIndex(ref=>ref.role==='dress front'))})); roles.push('DRESS_REFERENCE: large main view and supporting panels show ONE selected garment; use all documented stitching and construction, never render the sheet layout'); }
  if (options.extendedReferences && dresses.length > 1) {
    const selected = [dresses.find(ref=>ref.role==='dress front')||dresses[0], dresses.find(ref=>/detail|close|blouse/.test(ref.role)), dresses.find(ref=>ref.role==='dress side')];
    // Reserve three of Flow's seven extended slots for the chronological scene stills.
    const detailLimit = Math.max(0, maxImages - 1 - files.length - (options.referenceImagePaths || []).length);
    for (const { ref, index } of selected.map((ref,index)=>({ref,index})).filter(item=>item.ref).slice(0, detailLimit)) {
      const cached = saved?.photos.find(photo=>'dress '+photo.angle===ref.role);
      if (saved && !cached) throw new Error('A saved dress angle is missing in Flow. Retry dress sync.');
      files.push(cached || await media.remoteImage(ref.url,['dress-front','dress-close-up','dress-side'][index]));
      roles.push(['individual full front of the SAME selected garment; silhouette and construction','individual close-up of the SAME selected garment; stitching and embroidery','individual side of the SAME selected garment; sleeve, depth and fit'][index]);
    }
  }
  if (!hasSource && !options.referenceImagePaths?.length && files.length < maxImages - 1 && (options.referenceImagePath || options.referenceImageUrl)) {
    files.push(options.referenceImagePath ? { originalname: 'environment-reference.png', buffer: await readFile(options.referenceImagePath) } : await media.remoteImage(options.referenceImageUrl, 'scene-style'));
    roles.push('ENVIRONMENT_REFERENCE: architecture, setting and lighting only, never identity or outfit');
  }
  for (const [index, imagePath] of (options.referenceImagePaths || []).entries()) {
    if (files.length >= maxImages - 1) throw new Error('This template has too many scene references to include the required bridal ornaments sheet. No generation was submitted.');
    files.push({ originalname: `wedding-scene-${index + 1}-still.png`, buffer: await readFile(imagePath) });
    roles.push((options.referenceImageDescriptions?.[index] || `WEDDING_SCENE_REFERENCE ${index + 1}: chronological opening frame for scene ${index + 1}; staging, decor, lighting and composition only`) + '; never source identity or outfit, never render sheet panels or source text');
  }
  if (files.length >= maxImages) throw new Error('Too many references to include the required bridal ornaments sheet. No generation was submitted.');
  files.push({ originalname: 'bridal-ornaments-reference.png', buffer: await readFile(bridalOrnamentsPath) });
  roles.push('BRIDAL_ORNAMENTS_REFERENCE: select one coherent rich bridal jewellery ensemble from this sheet; use its necklace, earrings, forehead, bangles and hand ornaments as styling authority, never its mannequin or background. Bride photo defines identity and dress photos define the garment.');
  return { files, roles, sourceUrl: sourceVideoUrl, sourcePath: options.sourceVideoPath,
    firstFrame: firstFrameUrl && !hasSource && files.length < 3 ? await media.remoteImage(firstFrameUrl, 'approved-look') : undefined };
}
async function render(id, options, input = {}, onProgress = () => {}) {
  const route = generationRoute.resolve(options.tier, options.generationMode);
  options = generationRoute.enforce(route, options, input.source || input.sourceVideoUrl);
  if (route.provider === 'higgsfield-mcp') {
    let references = input.references || (input.imageUrls || []).map((url, index) => ({ role: index ? 'dress view' : 'bride', url }));
    if (options.jewelleryMode === 'database-or-minimal') {
      ({ options, references } = prepareDatabaseJewellery(options, references));
    } else {
      const ornaments = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME,
        'experiences/' + id + '/bridal-ornaments-reference.png', await readFile(bridalOrnamentsPath), 'image/png');
      references.push({ role: 'bridal jewellery sheet', url: ornaments.publicUrl });
    }
    require('./studioPromptValidation').validateVideoPrompt(options);
    onProgress(undefined, 'Preparing references and checking the credit cost…');
    const result = await higgsfieldStudio.makeVideo({ options, references, sessionId: id,
      provider: input.provider, onSubmitted: input.onSubmitted, onAttempt: input.onAttempt, onResponse: input.onResponse });
    const finished = await media.finishVideo(result.videoUrl, options, id);
    if (finished.file) localResults.set(id, finished.file);
    return finished.url;
  }
  if (route.provider !== 'google-flow-mcp') {
    throw new Error('Premium MCP video generation is not verified yet. No paid API request was sent.');
  }
  let references = input.references || (input.imageUrls || []).map((url, index) => ({ role: index === 0 ? 'bride' : 'dress view', url }));
  for (const [index, file] of (input.images || []).entries()) {
    const uploaded = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME, id + '/reference-' + index + '.' + file.mimetype.split('/')[1], file.buffer, file.mimetype);
    references.push({ role: index === 0 ? 'bride' : 'dress view', url: uploaded.publicUrl });
  }
  let sourceVideoUrl = route.useReferenceVideo ? input.sourceVideoUrl || options.sourceVideoUrl : null;
  if (route.useReferenceVideo && input.source) {
    const uploaded = await storage.uploadVideo(process.env.SUPABASE_BUCKET_NAME, id + '/source.mp4', input.source.buffer, input.source.mimetype);
    sourceVideoUrl = uploaded.publicUrl;
  }
  // When the Premium MCP route is enabled, its reference submission can use
  // this same fixed ornament asset without turning it into prompt text.
  if (options.tier === 'premium') {
    const stored = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME, 'experiences/' + id + '/bridal-ornaments-reference.png', await readFile(bridalOrnamentsPath), 'image/png');
    options = { ...options, ornamentReferenceUrl: stored.publicUrl };
  }
  const request = buildRequest(options, references, input.firstFrameUrl, sourceVideoUrl || options.sourceVideoPath);
  onProgress(undefined, 'Preparing your saved references…');
  let url;
  if (options.tier === 'budget') {
    const bundle = await budgetFiles(options, references, input.firstFrameUrl, sourceVideoUrl);
    options = { ...options, extendedReferences: true };
    // Static template clips are imported once into the current Flow project.
    // If pre-sync fails, retain the proven local-upload route for this request.
    if (bundle.sourcePath && !bundle.sourceUrl && !options.sourceVideoAsset && !options.prepareOnly) {
      try {
        const clip = await require('./flowTemplateClipCache').resolve(bundle.sourcePath);
        options = { ...options, sourceVideoAsset: clip.name, flowProjectUrl: clip.projectUrl };
        bundle.sourcePath = null;
      } catch (error) {
        console.warn('[Flow template clip cache] local upload fallback:', error.message);
      }
    }
    const providerPrompt = options.verbatimPrompt ? options.prompt : options.prompt
      .replace(/;?\s*the platform adds the saved original music\.?/gi, '')
      .replace(/the platform adds the original reference (?:music|song) (?:afterwards|afterward)\.?/gi, '')
      .replace(/audio can be added separately during post-production\.?/gi, '')
      .trim();
    const budgetPrompt = options.verbatimPrompt ? options.prompt : providerPrompt + '\nATTACHED INGREDIENT MAPPING\n' +
      bundle.roles.map((role, index) => 'Image ' + (index + 1) + ': ' + role + '.').join('\n') +
      (bundle.sourceUrl || bundle.sourcePath || options.sourceVideoAsset ? options.referenceVideoRole === 'inspiration'
        ? '\nAttached video: cinematic inspiration only for person and garment; the approved prompt defines how closely to retain the reference setting, camera and shot progression. Source identity and wardrobe are never targets.'
        : '\nAttached video: SOURCE_VIDEO, the authoritative source for motion, camera, scene, shot order and timing; not face or dress appearance.' : '') +
      (options.subjectMode === 'couple' ? '\nPreserve the two distinct identities in the identity sheet; never blend bride and groom faces.' : '\nBride only; do not add a groom or additional partner.') +
      (bundle.firstFrame ? '\nContinue the approved look from the first frame; keep these people and this outfit.' : '') + '\n' + referenceRules(options.aspectRatio, options.generationMode);
    const result = input.rawVideoFile && require('node:fs').existsSync(input.rawVideoFile)
      ? { file: input.rawVideoFile }
      : await flow.generate({ ...options, prompt: budgetPrompt, firstFrame: bundle.firstFrame, sourceVideoUrl: bundle.sourceUrl, sourceVideoPath: bundle.sourcePath,
      recoverId: input.provider?.kind === 'flow' ? input.provider.id : undefined,
      onSubmitted: id => input.onSubmitted?.({ kind: 'flow', id }),
    }, bundle.files, onProgress);
    await input.onRawReady?.(result.file);
    if (options.previewFirst) {
      await media.requirePreview720(result.file);
      const cleaned = await watermark.cleanVisibleLogo(result.file,onProgress,{preview:true});
      const prepared = await media.finishVideo(cleaned,options,id+'-preview');
      const file = prepared.file || cleaned;
      await media.requirePreview720(file);
      localResults.set(id,file);
      return '/api/videos/studio/media/'+id+'?version=preview';
    }
    const fullHd = await media.fullHdOutput(result.file, id, options.aspectRatio, onProgress);
    url = await watermark.cleanVisibleLogo(fullHd, onProgress);
    await media.requireFullHd(url);
  } else {
    let requestId = input.provider?.kind === 'api' ? input.provider.id : null;
    if (!requestId) {
      const { createHiggsfieldClient } = await import('@higgsfield/client/v2');
      const sdk = createHiggsfieldClient({ credentials: credentials(), maxRetries: 0, timeout: 30000 });
      let submitted;
      try { submitted = await sdk.subscribe(request.endpoint, { input: request.input, withPolling: false }); }
      catch (error) {
        if (error.name === 'AuthenticationError' || /credentials/i.test(error.message)) error.code = 'PROVIDER_AUTH';
        else if (!error.statusCode || error.statusCode >= 500) error.code = 'SUBMISSION_UNCERTAIN';
        throw error;
      }
      requestId = submitted.request_id;
      if (!requestId) { const error = new Error('The creation request was not acknowledged. Check the account before submitting again.'); error.code = 'SUBMISSION_UNCERTAIN'; throw error; }
      await input.onSubmitted?.({ kind: 'api', id: requestId, endpoint: request.endpoint });
    }
    url = await poll(requestId, onProgress);
  }
  const finished = await media.finishVideo(url, options, id);
  if (options.tier === 'budget') {
    const finalFile = finished.file || url;
    // Publish once, only after cleanup, optional music, and final 1080p validation.
    await media.requireFullHd(finalFile);
    localResults.set(id, finalFile);
    return '/api/videos/studio/media/' + id;
  }
  if (finished.file) localResults.set(id, finished.file);
  return finished.url;
}
async function start(body, files = {}) {
  const options = await templates.resolve(body);
  const route = generationRoute.resolve(options.tier, options.generationMode);
  const id = randomUUID();
  sessions.create(id);
  const references = [];
  for (const [name, role] of [['brideImage', 'bride'], ['groomImage', 'groom'], ['dressImage', 'dress front']]) {
    const file = files[name]?.[0];
    if (file) {
      const result = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME, id + '/' + name + '.' + file.mimetype.split('/')[1], file.buffer, file.mimetype);
      references.push({ role, url: result.publicUrl });
    }
  }
  if (options.subjectMode === 'couple' && !references.some(ref => ref.role === 'groom')) throw new Error('Add a groom photo for Bride & groom.');
  render(id, options, { references, source: files.sourceVideo?.[0] }, (progress, message) => sessions.update(id, { status: 'video_gen', progress, message }))
    .then(videoUrl => sessions.complete(id, { videoUrl, tier: options.tier }))
    .catch(error => sessions.fail(id, 'Your film needs attention. Contact the boutique owner.'));
  return { sessionId: id };
}
async function upscale(id,options,input,onProgress=()=>{}) {
  if (options.tier!=='budget' || input.provider?.kind!=='flow') throw new Error('This preview cannot be upscaled through Flow.');
  onProgress(undefined,'Requesting 1080p for your saved video…');
  const raw = input.upscaledRawFile || await flow.upscaleSaved(input.provider.id);
  await input.onUpscaledRaw?.(raw);
  const hd = await media.fullHdOutput(raw,id+'-final',options.aspectRatio,onProgress);
  const clean = await watermark.cleanVisibleLogo(hd,onProgress);
  const finished = await media.finishVideo(clean,options,id+'-final');
  const file = finished.file || clean;
  await media.requireFullHd(file);
  localResults.set(id,file);
  return '/api/videos/studio/media/'+id+'?version=1080p';
}
module.exports = { start, render, upscale, credentials, localResults, buildRequest, poll, budgetFiles, prepareDatabaseJewellery };
