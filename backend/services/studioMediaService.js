const { mkdir, writeFile, readFile } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const axios = require('../utils/safeRemoteMedia');
const sharp = require('sharp');
const mediaQueue = require('./runtimeService').media;

const root = process.env.STUDIO_MEDIA_ROOT || path.join(__dirname, '..', 'data', 'studio-media');
const referenceRatios = new Map();
async function referenceAspectRatio(file) {
  const stamp = require('node:fs').statSync(file);
  const key = file + ':' + stamp.mtimeMs + ':' + stamp.size;
  if (!referenceRatios.has(key)) referenceRatios.set(key, mediaQueue.run(() => new Promise((resolve, reject) => {
    const child = spawn(binary(), ['-hide_banner', '-nostdin', '-i', file, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    const chunks = [];
    const timer = setTimeout(() => child.kill(), 15000);
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', async code => {
      clearTimeout(timer);
      try {
        if (code !== 0) throw new Error('Could not inspect the reference video aspect ratio.');
        const { width, height } = await sharp(Buffer.concat(chunks)).metadata();
        const ratio = width / height;
        if (Math.abs(ratio - 9 / 16) < .035) resolve('9:16');
        else if (Math.abs(ratio - 16 / 9) < .07) resolve('16:9');
        else throw new Error('The reference ratio is unsupported by this video route; it will not be converted automatically.');
      } catch (error) { referenceRatios.delete(key); reject(error); }
    });
  })).catch(error => { referenceRatios.delete(key); throw error; }));
  return referenceRatios.get(key);
}
function binary() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require('@ffmpeg-installer/ffmpeg').path; } catch { return 'ffmpeg'; }
}
function run(args) {
  return mediaQueue.run(() => new Promise((resolve, reject) => {
    const threads = process.env.FFMPEG_THREADS || '1';
    // Set decoder and final output encoder limits; an input-only flag does not
    // constrain libx264's encoder threads.
    const outputArgs = [...args.slice(0, -1), '-threads', threads, args.at(-1)];
    const child = spawn(binary(), ['-hide_banner', '-nostdin', '-threads', threads, '-filter_threads', '1', '-filter_complex_threads', '1', ...outputArgs], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let diagnostic = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 180000);
    child.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-10000); });
    child.on('error', () => { clearTimeout(timer); reject(new Error('Video processing is unavailable. Configure FFmpeg on the server.')); });
    child.on('close', code => { clearTimeout(timer); code === 0 && !timedOut ? resolve(diagnostic) : reject(new Error('The media file could not be processed. Use a valid MP4, MOV, MP3 or WAV file.')); });
  }));
}
async function saveUpload(file, prefix) {
  if (!file?.buffer?.length) throw new Error('Choose a media file.');
  await mkdir(root, { recursive: true });
  const extension = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
  if (!extension) throw new Error('Unsupported media format.');
  if (file.mimetype.startsWith('image/')) await sharp(file.buffer).metadata();
  const target = path.join(root, prefix + '-' + randomUUID() + '.' + extension);
  await writeFile(target, file.buffer);
  return target;
}
async function validateTrack(file) {
  await run(['-i', file, '-t', '1', '-map', '0:a:0', '-f', 'null', '-']);
}
async function extractTemplateMusic(input, output) {
  await mkdir(path.dirname(output), { recursive: true });
  // Preserve the supplied recording, rather than asking a generator to imitate it.
  await run(['-i', input, '-map', '0:a:0', '-vn', '-c:a', 'copy', '-y', output]);
  await validateTrack(output);
  return output;
}
async function requireFullHd(file) {
  const diagnostic = await run(['-i', file, '-frames:v', '1', '-f', 'null', '-']);
  const size = diagnostic.match(/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/);
  if (!size || Math.max(Number(size[1]), Number(size[2])) < 1920 || Math.min(Number(size[1]), Number(size[2])) < 1080) {
    throw new Error('Budget finished without a 1080p download. The film remains unavailable; recover the saved provider result after checking upscale access.');
  }
}
async function requirePreview720(file) {
  const diagnostic = await run(['-i',file,'-frames:v','1','-f','null','-']);
  const size = diagnostic.match(/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/);
  if (!size || Math.max(+size[1],+size[2])<1280 || Math.min(+size[1],+size[2])<720) throw new Error('The preview is below 720p. Recover the saved result.');
}
async function prepareVideo(file, duration = 8) {
  const output = path.join(root, 'reference-' + randomUUID() + '.mp4');
  // Fixed scene duration remains server-owned; reference clips are cropped to it.
  await run(['-i', file, '-t', String(duration), '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-movflags', '+faststart', '-y', output]);
  return output;
}
async function fullHdOutput(file, id, aspectRatio = '9:16', onProgress = () => {}) {
  try { await requireFullHd(file); return file; } catch { /* Validate the scaled result again below. */ }
  onProgress(undefined, 'Upscaling the completed film to 1080p…');
  await mkdir(root, { recursive: true });
  const [width, height] = aspectRatio === '9:16' ? [1080, 1920] : [1920, 1080];
  const output = path.join(root, 'upscaled-' + id + '.mp4');
  // Resolution upscale, not a claim to recover missing detail or fix likeness.
  await run(['-i', file, '-map', '0:v:0', '-map', '0:a?', '-vf',
    `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', '-y', output]);
  await requireFullHd(output);
  return output;
}
async function contactSheet(urls, label = 'Dress views', options = {}) {
  if (options.hero) {
    if (!urls.length || urls.length > 8) throw new Error('A garment sheet requires 1 to 8 views.');
    const originals = await Promise.all(urls.map(async url => {
      url = await require('./storageService').refreshUrl?.(url) || url;
      return Buffer.from((await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: 10 * 1024 * 1024 })).data);
    }));
    const heroIndex = Math.max(0, Math.min(originals.length - 1, options.heroIndex || 0));
    const canvas = [], caption = (width, text) => Buffer.from(`<svg width="${width}" height="60"><rect width="100%" height="100%" fill="#faf7f2"/><text x="20" y="38" font-family="Arial" font-size="24">${text}</text></svg>`);
    canvas.push({input:await sharp(originals[heroIndex]).rotate().resize(960,1680,{fit:'contain',background:'#faf7f2'}).png().toBuffer(),left:0,top:0});
    canvas.push({input:caption(960,'Main garment view '+(heroIndex+1)),left:0,top:1680});
    const others = originals.map((buffer,index)=>({buffer,index})).filter(item=>item.index!==heroIndex);
    for (const [slot,item] of others.entries()) {
      const left=960+(slot%2)*600, top=Math.floor(slot/2)*435;
      canvas.push({input:await sharp(item.buffer).rotate().resize(600,375,{fit:'contain',background:'#faf7f2'}).png().toBuffer(),left,top});
      canvas.push({input:caption(600,'Supporting view '+(item.index+1)),left,top:top+375});
    }
    return {originalname:'dress-evidence.jpg',mimetype:'image/jpeg',buffer:await sharp({create:{width:2160,height:1740,channels:3,background:'#faf7f2'}}).composite(canvas).jpeg({quality:96}).toBuffer()};
  }
  const pictures = await Promise.all(urls.map(async (url, index) => {
    url = await require('./storageService').refreshUrl?.(url) || url;
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: 10 * 1024 * 1024 });
    const image = await sharp(Buffer.from(response.data)).rotate().resize(360, 440, { fit: 'contain', background: '#faf7f2' }).png().toBuffer();
    const caption = Buffer.from('<svg width="360" height="40"><rect width="100%" height="100%" fill="#faf7f2"/><text x="16" y="26" font-family="Arial" font-size="16">' + label + ' ' + (index + 1) + '</text></svg>');
    return { image, caption, index };
  }));
  const columns = Math.min(3, pictures.length);
  const rows = Math.ceil(pictures.length / columns);
  const output = await sharp({ create: { width: columns * 360, height: rows * 480, channels: 3, background: '#faf7f2' } }).composite(pictures.flatMap(item => [
    { input: item.image, left: (item.index % columns) * 360, top: Math.floor(item.index / columns) * 480 },
    { input: item.caption, left: (item.index % columns) * 360, top: Math.floor(item.index / columns) * 480 + 440 },
  ])).jpeg({ quality: 94 }).toBuffer();
  return { originalname: 'dress-views.jpg', mimetype: 'image/jpeg', buffer: output };
}
async function remoteImage(url, name) {
  url = await require('./storageService').refreshUrl?.(url) || url;
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: 10 * 1024 * 1024 });
  const buffer = await sharp(Buffer.from(response.data)).rotate().jpeg({ quality: 96 }).toBuffer();
  return { originalname: name + '.jpg', mimetype: 'image/jpeg', buffer };
}
async function saveGeneratedImage(url, id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid creation ID.');
  const response = await axios.get(url, { responseType:'arraybuffer', timeout:120000, maxContentLength:30 * 1024 * 1024 });
  const bytes = Buffer.from(response.data);
  const info = await sharp(bytes, { limitInputPixels: 100000000 }).metadata();
  const extension = {jpeg:'jpg',png:'png',webp:'webp'}[info.format];
  if (!extension) throw new Error('The provider image format cannot be archived. Recover the saved image.');
  await mkdir(root, {recursive:true});
  const file = path.join(root, 'image-' + id + '-' + randomUUID() + '.' + extension);
  await writeFile(file, bytes, {mode:0o600,flag:'wx'});
  return file;
}
async function finishVideo(url, { musicPath, sourceVideoPath, useSourceAudio }, id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid creation ID.');
  if (!url.startsWith('https://') && !path.isAbsolute(url)) throw new Error('The provider returned an invalid media URL.');
  const music = musicPath || (useSourceAudio ? sourceVideoPath : null);
  if (music && !existsSync(music)) throw new Error('The saved music file is missing. Update this scene before retrying.');
  if (music) await validateTrack(music);
  await mkdir(root, { recursive: true });
  let video = url;
  if (url.startsWith('https://')) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000, maxContentLength: 300 * 1024 * 1024 });
    video = path.join(root, 'generated-' + id + '.mp4');
    await writeFile(video, Buffer.from(response.data), {mode:0o600});
  }
  // Keep an owned copy even when no soundtrack was requested. Provider links
  // are delivery URLs, not the permanent history store.
  if (!music) return { file:video, url:'/api/videos/studio/media/' + id };
  const output = path.join(root, 'film-' + id + '.mp4');
  await run(['-i', video, '-stream_loop', '-1', '-i', music, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', '-y', output]);
  return { file: output, url: '/api/videos/studio/media/' + id };
}
module.exports = { run, binary, referenceAspectRatio, saveUpload, validateTrack, extractTemplateMusic, requireFullHd, requirePreview720, fullHdOutput, prepareVideo, contactSheet, remoteImage, saveGeneratedImage, finishVideo, readFile };
