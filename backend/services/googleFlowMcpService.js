const axios = require('axios');
const { readFile, mkdir } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');

const home = () => process.env.FLOW_MCP_HOME || path.join(__dirname, '..', 'data', 'flow-mcp');
const base = () => process.env.FLOW_MCP_URL || 'http://127.0.0.1:8787';
const worker = path.resolve(__dirname, '..', '..', 'integrations', 'flow-mcp', 'dist', 'worker.js');
let child = null;
let starting = null;
let checking = null;
let cached = { until: 0, value: { ready: false, state: 'offline', message: 'Budget is reconnecting.' } };
async function headers() {
  const token = await readFile(path.join(home(), 'token'), 'utf8');
  return { 'x-flow-token': token.trim() };
}
async function call(method, input, timeout = 60000) {
  try { return (await axios.post(base() + '/api/' + method, input, { headers: await headers(), timeout })).data; }
  catch (error) {
    const failure = new Error(error.response?.data?.error || (error.code === 'ECONNREFUSED' ? 'Budget worker is offline.' : 'Budget connection could not be reached.'));
    failure.code = error.response ? 'FLOW_REQUEST_REJECTED' : 'FLOW_LOGIN_REQUIRED';
    throw failure;
  }
}
async function online() {
  try { return (await axios.get(base() + '/api/health', { timeout: 1200 })).data.name === 'flow-mcp'; } catch { return false; }
}
async function ensureWorker() {
  if (await online()) return true;
  if (process.env.FLOW_MCP_AUTOSTART === 'false' || !existsSync(worker)) return false;
  if (starting) return starting;
  starting = (async () => {
    if (!child || child.exitCode !== null) {
      await mkdir(home(), { recursive: true });
      const port = new URL(base()).port || '8787';
      // The bridge is local only; never spawn a local process for a remote URL.
      if (!['127.0.0.1', 'localhost'].includes(new URL(base()).hostname)) return false;
      child = spawn(process.execPath, [worker], {
        cwd: path.dirname(worker), windowsHide: true,
        env: { ...process.env, FLOW_MCP_HOME: home(), FLOW_MCP_PORT: port,
          FLOW_MCP_OUTPUT: process.env.FLOW_MCP_OUTPUT || path.join(home(), 'outputs'),
          FLOW_MCP_FFMPEG: require('./studioMediaService').binary(),
          FLOW_MCP_PROJECT_URL: process.env.FLOW_MCP_PROJECT_URL || '' },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      child.stderr.on('data', chunk => console.error('[Budget worker]', chunk.toString().slice(-300)));
      child.on('error', error => console.error('[Budget worker]', error.message));
    }
    for (let attempt = 0; attempt < 12; attempt++) {
      if (await online()) return true;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return false;
  })().finally(() => { starting = null; });
  return starting;
}
async function status(force = false) {
  if (!force && cached.until > Date.now()) return cached.value;
  if (checking) return checking;
  checking = checkStatus().finally(() => { checking = null; });
  return checking;
}
async function checkStatus() {
  let value;
  try {
    if (!(await ensureWorker())) value = { ready: false, state: 'offline', message: 'Budget is temporarily unavailable.' };
    else {
      let current = await call('status', { detailed: false }, 15000);
      if (current.flow?.signedIn && !current.flow?.inProject) {
        await call('project', { name: 'Ladies Planet', url: process.env.FLOW_MCP_PROJECT_URL || undefined }, 20000);
        current = await call('status', { detailed: false }, 10000);
      }
      value = /\/404\?reason=project/.test(current.flow?.url || '')
        ? { ready: false, state: 'project_required', message: 'The saved creation project is unavailable. Open your reference project in the dedicated Flow browser.' }
        : current.flow?.blocked
        ? { ready: false, state: 'confirmation_required', message: current.flow.blocked }
        : current.flow?.signedIn && current.flow?.inProject
        ? { ready: true, state: 'ready', message: 'Budget is ready.' }
        : { ready: false, state: 'login_required', message: 'The owner needs to sign in to reconnect Budget.' };
    }
  } catch {
    value = { ready: false, state: 'login_required', message: 'The owner needs to reconnect Budget in the dedicated browser.' };
  }
  cached = { value, until: Date.now() + 15000 };
  return value;
}
async function ready() { return (await status()).ready; }
function publicStatus() {
  if (cached.until <= Date.now()) status().catch(() => {});
  return cached.value;
}
async function upload(file) {
  return (await axios.post(base() + '/api/upload?name=' + encodeURIComponent(file.originalname), file.buffer,
    { headers: { ...await headers(), 'Content-Type': 'application/octet-stream' }, timeout: 45000, maxBodyLength: 100 * 1024 * 1024 })).data.path;
}
async function verifyVideoAsset(name, projectUrl, inspectAssets = true) {
  const current = await call('status', { detailed: false }, 15000);
  if (!current.flow?.signedIn || !current.flow?.inProject || current.flow?.blocked)
    throw new Error(current.flow?.blocked || 'Open the saved reference project in the dedicated Flow browser before linking its clip.');
  if (current.flow.url?.split('?')[0] !== projectUrl?.split('?')[0])
    throw new Error('The saved reference belongs to another Flow project. Open that project before continuing.');
  // The shared worker may be creating the VIP image. Do not mutate its asset
  // picker while busy; the queued video validates the exact title on attachment.
  if (!inspectAssets) return { name, projectUrl };
  const assets = await call('assets', { kind: 'video' }, 90000);
  const matches = assets.filter(asset => asset.name === name && asset.kind === 'video');
  if (matches.length !== 1) throw new Error('The saved clip title must match exactly one video in this Flow project. Relink the template; no replacement clip will be uploaded automatically.');
  return { name, projectUrl: current.flow.url.split('?')[0] };
}
async function generate(options, files, onProgress = () => {}) {
  if (!(await ready())) { const error = new Error('Budget needs the owner to sign in.'); error.code = 'FLOW_LOGIN_REQUIRED'; throw error; }
  let id = options.recoverId;
  const image = options.type === 'image';
  if (id) {
    const saved = (await call('wait', { job_ids: [id], timeout_seconds: 5 })).jobs?.find(job => job.id === id);
    if (!saved) throw new Error('This saved request is missing from the worker. The owner must check Google Flow before submitting again.');
    if (['failed', 'cancelled'].includes(saved.status)) await call('retry', { job_ids: [id] });
  }
  if (!id) {
    if (!image && options.sourceVideoAsset) await verifyVideoAsset(options.sourceVideoAsset, options.flowProjectUrl, false);
    onProgress(undefined, 'Preparing reference uploads…');
    const savedProject = files.find(file => file.assetName)?.projectUrl;
    if (savedProject && savedProject !== await currentProject()) throw new Error('This dress belongs to another Flow project. Sync it again before generating.');
    if (!image && options.sourceVideoAsset) await verifyVideoAsset(options.sourceVideoAsset, options.flowProjectUrl, false);
    const limit = options.extendedReferences || options.prepareOnly ? 7 : 3;
    const hasSourceVideo = !image && Boolean(options.sourceVideoAsset || options.sourceVideoPath || options.sourceVideoUrl);
    if (files.length + Number(hasSourceVideo) > limit) throw new Error('Too many references for this verified creation route.');
    // Upload the full reference set concurrently. Waiting for each image before
    // uploading the next was adding avoidable per-file latency to every request.
    const referenceUploads = Promise.all(files.map(file => file.assetName ? 'asset:' + file.assetName : upload(file)));
    const sourceUpload = !hasSourceVideo || options.sourceVideoAsset
      ? Promise.resolve(options.sourceVideoAsset ? 'asset:' + options.sourceVideoAsset : null)
      : (async () => {
        const source = options.sourceVideoPath
          ? { originalname: 'source-reference.mp4', buffer: await readFile(options.sourceVideoPath) }
          : await (async () => {
            const response = await axios.get(options.sourceVideoUrl, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 100 * 1024 * 1024 });
            return { originalname: 'source-reference.mp4', buffer: Buffer.from(response.data) };
          })();
        return upload(source);
      })();
    const [references, sourceReference] = await Promise.all([referenceUploads, sourceUpload]);
    if (sourceReference) references.push(sourceReference);
    if (!image && options.sourceVideoAsset) onProgress(undefined, 'Using your saved reference clip…');
    const scene = { prompt: options.prompt, type: image ? 'image' : 'video',
      preserve_prompt: options.verbatimPrompt === true,
      identity_reference_indices: files.flatMap((file,index)=>file.identityReference ? [index+1] : []),
      model: image ? process.env.FLOW_MCP_IMAGE_MODEL || 'Nano Banana 2' : process.env.FLOW_MCP_MODEL || 'Omni 1.1 Flash',
      download_quality: image || options.previewFirst ? 'original' : 'upscaled', aspect_ratio: options.aspectRatio, variants: 1, retries: 0, prepare_only: Boolean(options.prepareOnly),
      max_credits: Number(image ? process.env.FLOW_MCP_IMAGE_MAX_CREDITS || 10 : process.env.FLOW_MCP_MAX_CREDITS || 40) };
    if (!image) Object.assign(scene, { duration: options.duration, resolution: '720p',
      generate_audio: options.sound !== false });
    if (!image && options.sourceVideoAsset) scene.reference_project_url = options.flowProjectUrl;
    if (savedProject) {
      if (scene.reference_project_url && scene.reference_project_url !== savedProject) throw new Error('Dress and reference video belong to different Flow projects.');
      scene.reference_project_url = savedProject;
    }
    if (options.firstFrame) scene.first_frame = await upload(options.firstFrame);
    else scene.reference_images = references;
    let result;
    try { result = await call('generate', { project: 'LadiesPlanet', scenes: [scene] }); }
    catch (error) { if (error.code === 'FLOW_LOGIN_REQUIRED') error.code = 'SUBMISSION_UNCERTAIN'; throw error; }
    id = result.jobs?.[0]?.id;
    if (!id) { const error = new Error('Budget did not return a job ID. Check the worker before starting again.'); error.code = 'SUBMISSION_UNCERTAIN'; throw error; }
    await options.onSubmitted?.(id);
  }
  // The worker may spend several minutes preparing references before its own
  // generation timeout starts. Do not expire the backend wait first.
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const state = await call('wait', { job_ids: [id], timeout_seconds: 5 });
    const job = state.jobs?.find(job => job.id === id);
    if (!job) throw new Error('The previous Budget request is no longer in the worker. Check its saved outputs before starting again.');
    const label = image ? 'image' : 'film';
    const progress = job.progress?.match(/\d+(?=%)/)?.[0];
    onProgress(progress ? Math.min(99, Number(progress)) : undefined, job.status === 'queued' ? `Your ${label} is waiting in the shared creation queue…` : job.note || `Creating your ${label}…`, { preparationTimings: job.stageTimings });
    if (job.status === 'failed' || job.status === 'cancelled') {
      const failure = new Error(job.error || 'The saved Google request did not complete. Check the owner connection.');
      failure.code = job.submittedAt ? 'FLOW_RECOVERY_REQUIRED' : 'FLOW_INPUT_FAILED';
      throw failure;
    }
    if (job.status === 'done') {
      if (options.prepareOnly) return { prepared: true, jobId: id };
      const file = job.files?.find(file => image ? /\.(png|jpe?g|webp)$/i.test(file) : /\.(mp4|webm|mov)$/i.test(file));
      if (!file) throw new Error(`Google completed without a downloadable ${label}.`);
      return { file, creditsUsed: job.credits, jobId: id };
    }
  }
  throw new Error('Budget is taking longer than expected. Recover its saved request instead of generating again.');
}
const generateImage = (options, files, onProgress) => generate({ ...options, type: 'image' }, files, onProgress);
async function currentProject() {
  if (!await ensureWorker()) throw new Error('Flow is offline.');
  const state = (await call('status', { detailed: false }, 15000)).flow;
  if (!state?.signedIn || !state?.inProject) throw new Error('Sign in and open your Flow project to sync dresses.');
  return state.url.split('?')[0];
}
async function referenceAssets(projectUrl, names) {
  if (await currentProject() !== projectUrl.split('?')[0]) throw new Error('Open the saved dress Flow project before continuing.');
  return call('assets', { kind: 'image', ...(names?.length ? { names } : {}) }, 90000);
}
async function importAssets(files, projectUrl, onQueued = async () => {}, recoverId) {
  let id = recoverId;
  if (!id) {
    const paths = await Promise.all(files.map(upload));
    id = (await call('import_assets', { files: paths, project_url: projectUrl })).id;
    await onQueued(id);
  } else await call('retry', { job_ids: [id] });
  for (let attempt = 0; attempt < 180; attempt++) {
    const job = (await call('wait', { job_ids: [id], timeout_seconds: 10 })).jobs?.find(j => j.id === id);
    if (!job) throw new Error('Saved dress-sync job is missing.');
    if (job.status === 'done') return job.outputNames;
    if (['failed', 'cancelled'].includes(job.status)) throw new Error(job.error || 'Dress sync needs attention.');
  }
  throw new Error('Dress sync timed out. Retry the saved sync job.');
}
async function upscaleSaved(jobId) {
  if (!await ready()) throw new Error('Reconnect Flow to upscale the saved video. Your preview is safe.');
  const job = (await call('wait',{job_ids:[jobId],timeout_seconds:5})).jobs?.find(j=>j.id===jobId);
  if (!job || job.status!=='done' || job.outputNames?.length!==1) throw new Error('The saved Flow output cannot be identified uniquely. No new generation was submitted.');
  const result = await call('download',{project:'LadiesPlanet',assets:job.outputNames,quality:'upscaled'},660000);
  const file = result.files?.find(f=>/\.(mp4|webm|mov)$/i.test(f));
  if (!file) throw new Error('Flow did not return the upscaled video. Your preview is still available.');
  return file;
}
module.exports = { generate, generateImage, ready, status, publicStatus, ensureWorker, home, verifyVideoAsset, currentProject, referenceAssets, importAssets, upscaleSaved };
