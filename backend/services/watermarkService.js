const { spawn } = require('node:child_process');
const { stat, mkdir, rename, unlink, writeFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const media = require('./studioMediaService');
const source = require('../vendor/seeb4-erase/SOURCE.json');

const root = path.join(__dirname, '..', 'data', 'studio-media');
const worker = path.join(__dirname, '..', 'scripts', 'clean-visible-logo.js');

function cleanupError(message) {
  const error = new Error(message);
  error.code = 'VISIBLE_LOGO_CLEANUP_FAILED';
  return error;
}

function processVideo(input, output) {
  return require('./runtimeService').media.run(() => new Promise((resolve, reject) => {
    // Argument arrays prevent filenames from becoming shell commands. The isolated
    // worker performs frame processing without blocking the web server event loop.
    const child = spawn(process.execPath, [worker, '--input', input, '--output', output, '--ffmpeg', media.binary(), '--contour', '2'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let stdout = '', stderr = '', timedOut = false, forceKill;
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.connected) child.send({ type: 'cancel' }, () => {});
      else child.kill();
      forceKill = setTimeout(() => child.kill(), 2000);
    }, 300000);
    const clearTimers = () => { clearTimeout(timer); clearTimeout(forceKill); };
    child.stdout.on('data', chunk => { stdout = (stdout + chunk.toString()).slice(-32768); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-12000); });
    child.on('error', () => {
      clearTimers();
      reject(cleanupError('Film finishing is unavailable. Ask the owner to check the server and recover the saved result.'));
    });
    child.on('close', code => {
      clearTimers();
      if (code !== 0 || timedOut) {
        console.error('[Studio] Visible-logo cleanup:', timedOut ? 'processing timeout' : stderr.trim());
        reject(cleanupError('Film finishing could not verify a clean result. Recover the saved film; a new generation is not required.'));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (!Number.isInteger(result.frames) || result.frames < 1 || !result.box || !Number.isFinite(result.opacity)) throw new Error('Incomplete processing report.');
        resolve(result);
      } catch {
        reject(cleanupError('Film finishing returned an incomplete result. Recover the saved film.'));
      }
    });
  }));
}

/**
 * Clean the visible corner logo only. Never overwrite the provider download,
 * strip metadata deliberately, or attack invisible provenance. A failed cleanup
 * throws: callers must not publish the unprocessed original as a fallback.
 */
async function cleanVisibleLogo(inputPath, onProgress = () => {}, options = {}) {
  if (typeof inputPath !== 'string' || !path.isAbsolute(inputPath)) throw cleanupError('Film finishing requires a local downloaded video.');
  const input = path.resolve(inputPath);
  const info = await stat(input);
  if (!info.isFile() || info.size === 0) throw cleanupError('The downloaded film is missing or empty. Recover the saved result.');
  await mkdir(root, { recursive: true });
  const token = randomUUID();
  const temporary = path.join(root, 'clean-' + token + '.processing.mp4');
  const output = path.join(root, 'clean-' + token + '.mp4');
  const audit = output + '.json';
  onProgress(undefined, options.preview ? 'Finishing your 720p preview…' : 'Finishing your 1080p film…');
  try {
    const result = await processVideo(input, temporary);
    const finished = await stat(temporary);
    if (!finished.size) throw cleanupError('Film finishing produced an empty file.');
    if (options.preview) await media.requirePreview720(temporary);
    else await media.requireFullHd(temporary);
    await rename(temporary, output);
    // Internal audit only; do not send server paths or provider details to clients.
    await writeFile(audit, JSON.stringify({
      ...result,
      version: 1, createdAt: new Date().toISOString(), source: input, output,
      engine: { repository: source.repository, commit: source.commit },
      scope: 'visible-logo-only', originalRetained: true,
    }, null, 2));
    return output;
  } catch (error) {
    // Remove only our unpublished derivatives. The original remains recoverable.
    await Promise.all([temporary, output, audit].map(file => unlink(file).catch(() => {})));
    throw error;
  }
}

module.exports = { cleanVisibleLogo };
