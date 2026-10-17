#!/usr/bin/env node
'use strict';

// A server-side adapter for the pinned, MIT-licensed SEEB4 visible-logo engine.
// Only decoded picture pixels inside a detected corner sparkle are changed.
// The source is never overwritten; audio packets and supported metadata are copied.
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');

const children = new Set();
let cancelled = false;

function cancel() {
  cancelled = true;
  for (const child of children) child.kill();
}
process.on('message', message => { if (message?.type === 'cancel') cancel(); });
process.on('SIGTERM', cancel);
process.on('SIGINT', cancel);

function launch(binary, args, options = {}) {
  if (cancelled) throw new Error('Visible-logo cleanup was cancelled.');
  const child = spawn(binary, ['-hide_banner', '-nostdin', ...args], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options,
  });
  children.add(child);
  let diagnostic = '';
  child.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-24000); });
  const done = new Promise((resolve, reject) => {
    child.once('error', error => {
      children.delete(child);
      reject(new Error('FFmpeg could not start: ' + error.message));
    });
    child.once('close', code => {
      children.delete(child);
      if (cancelled) return reject(new Error('Visible-logo cleanup was cancelled.'));
      if (code !== 0) return reject(new Error('FFmpeg failed during visible-logo cleanup: ' + diagnostic.slice(-2500)));
      resolve(diagnostic);
    });
  });
  // Errors must not become unhandled while another subprocess is being drained.
  done.catch(() => {});
  return { child, done };
}

function waitForDrain(stream) {
  return new Promise((resolve, reject) => {
    const finish = error => {
      stream.removeListener('drain', onDrain);
      stream.removeListener('error', onError);
      stream.removeListener('close', onClose);
      error ? reject(error) : resolve();
    };
    const onDrain = () => finish();
    const onError = error => finish(error);
    const onClose = () => finish(new Error('The video encoder closed before accepting a frame.'));
    stream.once('drain', onDrain);
    stream.once('error', onError);
    stream.once('close', onClose);
    if (stream.destroyed) onClose();
  });
}

async function probe(binary, file) {
  const job = launch(binary, ['-i', file, '-map', '0:v:0', '-an', '-frames:v', '1', '-f', 'null', '-']);
  job.child.stdout.resume();
  return parseProbe(await job.done);
}

function parseProbe(diagnostic) {
  const input = diagnostic.split('Stream mapping:')[0];
  const video = input.match(/Stream #0:\d+[^\r\n]*Video:[^\r\n]+/)?.[0];
  const dimensions = video?.match(/\b(\d{2,5})x(\d{2,5})\b/);
  const rate = video?.match(/,\s*([\d.]+)\s+fps\b/);
  const timeBaseRate = video?.match(/,\s*([\d.]+)\s+tbr\b/);
  const duration = input.match(/Duration:\s*(\d+):(\d+):([\d.]+),\s*start:\s*([-\d.]+)/);
  if (!dimensions || !rate || !timeBaseRate || !duration) {
    throw new Error('Cannot establish the video dimensions, duration and constant frame rate.');
  }
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  const fps = Number(rate[1]);
  const seconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
  const start = Number(duration[4]);
  if (width < 48 || height < 48 || width > 4096 || height > 4096 || width % 2 || height % 2 ||
      !Number.isFinite(fps) || fps < 1 || fps > 60 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 120 ||
      Math.abs(fps - Number(timeBaseRate[1])) > 0.05 || Math.abs(start) > 0.05 || /rotation of (?!0\.00)/i.test(input)) {
    throw new Error('This video has unsupported dimensions, timing or rotation; keep the source for review.');
  }
  const info = { width, height, fps, duration: seconds, hasAudio: /Stream #0:\d+[^\r\n]*Audio:/.test(input) };
  const colors = video.match(/\((pc|tv),\s*([\w.-]+)\/([\w.-]+)\/([\w.-]+)\)/);
  if (colors) info.colorTags = { range: colors[1], space: colors[2], primaries: colors[3], transfer: colors[4] };
  return info;
}

async function loadEngine(enginePath = path.join(__dirname, '..', 'vendor', 'seeb4-erase', 'seeb4-erase.js')) {
  const source = await fs.readFile(enginePath, 'utf8');
  const scope = { self: {}, Buffer, Uint8Array, Uint8ClampedArray, Float32Array, Float64Array,
    atob: encoded => Buffer.from(encoded, 'base64').toString('binary') };
  vm.runInNewContext(source, scope, { filename: enginePath, timeout: 10000 });
  if (!scope.self.SEEB4?.unblendRegion) throw new Error('The pinned visible-logo engine is unavailable.');
  return scope.self.SEEB4;
}

function placement(engine, image, { stroke = false } = {}) {
  const mask = engine.geminiMask();
  let detected;
  try {
    detected = engine.detectScaled(image, mask);
    if (!detected.confident || detected.x < image.width * 0.65 || detected.y < image.height * 0.65) {
    const left = Math.floor(image.width * 0.65);
    const top = Math.floor(image.height * 0.65);
    const width = image.width - left, height = image.height - top;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row++) {
      const start = ((top + row) * image.width + left) * 4;
      data.set(image.data.subarray(start, start + width * 4), row * width * 4);
    }
    detected = engine.detectScaled({ width, height, data }, mask, {
      probeSizes: engine.seedSizes(image.width, image.height),
    });
    detected = { ...detected, x: detected.x + left, y: detected.y + top };
    }
  }
  catch { throw new Error('The visible corner logo could not be located confidently. The source has been kept for review.'); }
  // Never mistake a face, fabric or a central decoration for a corner logo.
  if (!detected.confident || !Number.isFinite(detected.score) || detected.score < 0.3 ||
      detected.x < image.width * 0.65 || detected.y < image.height * 0.65 ||
      detected.size < 20 || detected.size > Math.min(image.width, image.height) * 0.15 ||
      detected.x + detected.size > image.width || detected.y + detected.size > image.height) {
    throw new Error('The visible corner logo could not be located confidently. The source has been kept for review.');
  }
  const box = { x: detected.x, y: detected.y, size: detected.size };
  const cfg = engine.settings({ opacity: 'auto', baseStrength: 1, stroke });
  const gain = engine.solveGain(image, box, mask, cfg);
  if (!gain.solved || !Number.isFinite(gain.gain) || gain.gain < 0.1 || gain.gain > 1.8) {
    throw new Error('The visible logo opacity could not be calibrated confidently. The source has been kept for review.');
  }
  cfg.opacity = gain.gain;
  return { mask, box, cfg, detection: detected, gain };
}

function contourStencil(engine, mask, box, image, radius) {
  if (!radius) return null;
  const scaled = engine.resizeMask(mask, box.size);
  const margin = radius + 1;
  const x = Math.max(0, box.x - margin);
  const y = Math.max(0, box.y - margin);
  const width = Math.min(image.width, box.x + box.size + margin) - x;
  const height = Math.min(image.height, box.y + box.size + margin) - y;
  const stencil = new Uint8Array(width * height);
  const core = (gx, gy) => gx >= 0 && gy >= 0 && gx < box.size && gy < box.size && scaled.data[gy * box.size + gx] >= 0.2;
  let pixels = 0;
  for (let sy = 0; sy < height; sy++) for (let sx = 0; sx < width; sx++) {
    const gx = x + sx - box.x;
    const gy = y + sy - box.y;
    const inside = core(gx, gy);
    let edge = false;
    for (let dy = -radius; dy <= radius && !edge; dy++) for (let dx = -radius; dx <= radius && !edge; dx++) {
      if (dx * dx + dy * dy <= radius * radius && core(gx + dx, gy + dy) !== inside) edge = true;
    }
    if (edge) { stencil[sy * width + sx] = 1; pixels++; }
  }
  if (pixels > box.size * box.size * 0.25) throw new Error('The residual-logo contour would alter too much picture detail.');
  return { x, y, width, height, stencil, pixels, radius };
}

function smoothContour(image, contour) {
  if (!contour) return;
  const { x, y, width, height, stencil } = contour;
  const area = width * height;
  let current = new Float32Array(area * 3);
  let next = new Float32Array(area * 3);
  for (let sy = 0; sy < height; sy++) for (let sx = 0; sx < width; sx++) {
    const from = ((y + sy) * image.width + x + sx) * 4;
    const to = (sy * width + sx) * 3;
    for (let channel = 0; channel < 3; channel++) current[to + channel] = image.data[from + channel];
  }
  next.set(current);
  // Harmonic interpolation is limited to the sparse 2–3 px contour, not a box.
  // Original non-contour pixels are fixed boundary conditions in every pass.
  for (let pass = 0; pass < 64; pass++) {
    let largestChange = 0;
    for (let sy = 1; sy < height - 1; sy++) for (let sx = 1; sx < width - 1; sx++) {
      const index = sy * width + sx;
      if (!stencil[index]) continue;
      for (let channel = 0; channel < 3; channel++) {
        const value = (current[(index - 1) * 3 + channel] + current[(index + 1) * 3 + channel] +
          current[(index - width) * 3 + channel] + current[(index + width) * 3 + channel]) / 4;
        largestChange = Math.max(largestChange, Math.abs(value - current[index * 3 + channel]));
        next[index * 3 + channel] = value;
      }
    }
    [current, next] = [next, current];
    if (pass > 16 && largestChange < 0.025) break;
  }
  for (let sy = 0; sy < height; sy++) for (let sx = 0; sx < width; sx++) {
    const index = sy * width + sx;
    if (!stencil[index]) continue;
    const to = ((y + sy) * image.width + x + sx) * 4;
    for (let channel = 0; channel < 3; channel++) image.data[to + channel] = Math.round(current[index * 3 + channel]);
  }
}

async function cleanVideo({ input, output, ffmpeg, enginePath, stroke = false, contour = 0 }) {
  if (!input || !output || !ffmpeg || !path.isAbsolute(input) || !path.isAbsolute(output) ||
      path.resolve(input).toLowerCase() === path.resolve(output).toLowerCase() || path.extname(output).toLowerCase() !== '.mp4' ||
      ![0, 2, 3].includes(contour) || typeof stroke !== 'boolean') {
    throw new Error('Use distinct absolute input and output paths; output must be an MP4.');
  }
  const sourceStat = await fs.stat(input);
  if (!sourceStat.isFile() || sourceStat.size === 0) throw new Error('The input video is empty or missing.');
  try { await fs.stat(output); throw new Error('The output already exists; it will not be overwritten.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const info = await probe(ffmpeg, input);
  const engine = await loadEngine(enginePath);
  const frameSize = info.width * info.height * 4;
  const decoder = launch(ffmpeg, ['-v', 'error', '-i', input, '-map', '0:v:0', '-an', '-vsync', '0', '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1']);
  let encoder;
  let outputStarted = false;
  let frames = 0;
  let used;
  let edgeStencil;
  let worstQuality = 1;
  let worstQualityFrame = 0;
  let qualityTotal = 0;
  let frame = Buffer.allocUnsafe(frameSize);
  let filled = 0;
  try {
    for await (const chunk of decoder.child.stdout) {
      let offset = 0;
      while (offset < chunk.length) {
        if (cancelled) throw new Error('Visible-logo cleanup was cancelled.');
        const count = Math.min(frameSize - filled, chunk.length - offset);
        chunk.copy(frame, filled, offset, offset + count);
        filled += count;
        offset += count;
        if (filled !== frameSize) continue;
        const image = { width: info.width, height: info.height,
          data: new Uint8ClampedArray(frame.buffer, frame.byteOffset, frame.byteLength) };
        if (!used) {
          used = placement(engine, image, { stroke });
          edgeStencil = contourStencil(engine, used.mask, used.box, image, contour);
          const colorArgs = info.colorTags ? ['-color_range', info.colorTags.range, '-colorspace', info.colorTags.space,
            '-color_primaries', info.colorTags.primaries, '-color_trc', info.colorTags.transfer] : [];
          const encodeArgs = ['-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', info.width + 'x' + info.height,
            '-framerate', String(info.fps), '-i', 'pipe:0', '-i', input,
            '-map', '0:v:0', '-map', '1:a?', '-map_metadata', '1', '-map_metadata:s:v:0', '1:s:v:0',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
            ...colorArgs, '-c:a', 'copy', '-movflags', '+faststart+use_metadata_tags', '-n', output];
          encoder = launch(ffmpeg, encodeArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
          encoder.child.stdin.on('error', () => {});
          outputStarted = true;
        }
        const stats = engine.unblendRegion(image, used.box, used.mask, used.cfg);
        smoothContour(image, edgeStencil);
        if (!Number.isFinite(stats.quality)) throw new Error('Visible-logo cleanup produced invalid diagnostics.');
        if (stats.quality < worstQuality) {
          worstQuality = stats.quality;
          worstQualityFrame = frames;
        }
        qualityTotal += stats.quality;
        if (!encoder.child.stdin.write(frame)) await waitForDrain(encoder.child.stdin);
        frames++;
        // A new frame buffer is necessary: stdin may still retain the previous one.
        frame = Buffer.allocUnsafe(frameSize);
        filled = 0;
      }
    }
    await decoder.done;
    if (filled || frames === 0 || !encoder) throw new Error('The source video ended with incomplete decoded frames.');
    if (Math.abs(frames / info.fps - info.duration) > Math.max(0.12, 2 / info.fps)) {
      throw new Error('The source video timing is not constant; keep the original for review.');
    }
    encoder.child.stdin.end();
    await encoder.done;
    const result = await probe(ffmpeg, output);
    if (result.width !== info.width || result.height !== info.height || Math.abs(result.fps - info.fps) > 0.01 ||
        Math.abs(result.duration - info.duration) > Math.max(0.12, 2 / info.fps) || result.hasAudio !== info.hasAudio) {
      throw new Error('The processed video failed its resolution, duration or audio check.');
    }
    return { ...info, frames, box: used.box, opacity: used.cfg.opacity, detectionScore: used.detection.score,
      anchored: Boolean(used.detection.anchored), worstQuality, worstQualityFrame, averageQuality: qualityTotal / frames,
      visibleOnly: true, stroke,
      contourRadius: contour, contourPixelsPerFrame: edgeStencil?.pixels || 0,
      engine: 'SEEB4', output };
  } catch (error) {
    decoder.child.kill();
    if (encoder) encoder.child.kill();
    await Promise.allSettled([decoder.done, ...(encoder ? [encoder.done] : [])]);
    if (outputStarted) await fs.rm(output, { force: true }).catch(() => {});
    throw error;
  }
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!['--input', '--output', '--ffmpeg', '--stroke', '--contour'].includes(key) || !args[index + 1]) throw new Error('Expected --input, --output and --ffmpeg, with optional --stroke true/false and --contour 0/2/3.');
    values[key.slice(2)] = args[index + 1];
  }
  if (values.stroke !== undefined) {
    if (!['true', 'false'].includes(values.stroke)) throw new Error('--stroke must be true or false.');
    values.stroke = values.stroke === 'true';
  }
  if (values.contour !== undefined) {
    if (!['0', '2', '3'].includes(values.contour)) throw new Error('--contour must be 0, 2 or 3.');
    values.contour = Number(values.contour);
  }
  return values;
}

if (require.main === module) {
  Promise.resolve().then(() => cleanVideo(parseArgs(process.argv.slice(2)))).then(result => {
    process.stdout.write(JSON.stringify(result) + '\n');
    if (process.connected) process.disconnect();
  }).catch(error => {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
    if (process.connected) process.disconnect();
  });
}

module.exports = { cleanVideo, parseArgs, parseProbe, loadEngine, placement, contourStencil, smoothContour };
