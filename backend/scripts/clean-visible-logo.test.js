'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, parseProbe, loadEngine, cleanVideo, contourStencil, smoothContour, placement } = require('./clean-visible-logo');

const inputInfo = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'example.mp4':
  Duration: 00:00:04.00, start: 0.000000, bitrate: 5957 kb/s
    Stream #0:0(und): Video: h264 (High), yuv420p(tv), 1920x1080, 5778 kb/s, 24 fps, 24 tbr, 12288 tbn
    Stream #0:1(und): Audio: aac (LC), 48000 Hz, stereo
Stream mapping:
Output #0, null, to 'pipe:':
    Stream #0:0: Video: wrapped_avframe, 1280x720, 60 fps, 60 tbr`;

test('parses only input dimensions and retains audio/timing', () => {
  assert.deepEqual(parseProbe(inputInfo), { width: 1920, height: 1080, fps: 24, duration: 4, hasAudio: true });
});

test('rejects ambiguous frame rate, nonzero timeline and unsupported dimensions', () => {
  assert.throws(() => parseProbe(inputInfo.replace('24 tbr', '30 tbr')), /unsupported/);
  assert.throws(() => parseProbe(inputInfo.replace('start: 0.000000', 'start: 0.500000')), /unsupported/);
  assert.throws(() => parseProbe(inputInfo.replace('1920x1080', '1921x1080')), /unsupported/);
  assert.throws(() => parseProbe('not a video'), /Cannot establish/);
});

test('recognizes explicit display color tags for the encoder to retain', () => {
  const source = inputInfo.replace('yuv420p(tv)', 'yuv420p(tv, smpte170m/bt709/iec61966-2-1)');
  assert.deepEqual(parseProbe(source).colorTags, { range: 'tv', space: 'smpte170m', primaries: 'bt709', transfer: 'iec61966-2-1' });
});

test('CLI requires known value pairs', () => {
  assert.deepEqual(parseArgs(['--input', 'a', '--output', 'b', '--ffmpeg', 'c']), { input: 'a', output: 'b', ffmpeg: 'c' });
  assert.throws(() => parseArgs(['--remove-synthid', 'yes']), /Expected/);
  assert.throws(() => parseArgs(['--input']), /Expected/);
  assert.deepEqual(parseArgs(['--contour', '2', '--stroke', 'false']), { contour: 2, stroke: false });
  assert.throws(() => parseArgs(['--contour', '10']), /0, 2 or 3/);
  assert.throws(() => parseArgs(['--stroke', 'on']), /true or false/);
});

test('does not treat an unmarked flat scene as a confidently detected logo', async () => {
  const engine = await loadEngine();
  const width = 320;
  const height = 180;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(128);
  assert.throws(() => placement(engine, { width, height, data }), /could not be located confidently/);
});

test('contour interpolation is sparse, bounded and never changes pixels outside its mask', async () => {
  const engine = await loadEngine();
  const width = 128;
  const height = 128;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    data[index] = x + 20; data[index + 1] = y + 40; data[index + 2] = 150; data[index + 3] = 255;
  }
  const image = { width, height, data };
  const contour = contourStencil(engine, engine.geminiMask(), { x: 40, y: 40, size: 72 }, image, 2);
  assert.ok(contour.pixels > 0 && contour.pixels <= 72 * 72 * 0.25);
  for (let cy = 0; cy < contour.height; cy++) for (let cx = 0; cx < contour.width; cx++) {
    if (!contour.stencil[cy * contour.width + cx]) continue;
    const index = ((contour.y + cy) * width + contour.x + cx) * 4;
    data[index] = data[index + 1] = data[index + 2] = 255;
  }
  const before = data.slice();
  smoothContour(image, contour);
  let changed = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    const cx = x - contour.x;
    const cy = y - contour.y;
    const masked = cx >= 0 && cy >= 0 && cx < contour.width && cy < contour.height && contour.stencil[cy * contour.width + cx];
    if (!masked) assert.deepEqual(data.slice(index, index + 4), before.slice(index, index + 4));
    else if (data[index] !== before[index]) changed++;
    assert.equal(data[index + 3], 255);
  }
  assert.ok(changed > contour.pixels * 0.9);
});

test('never accepts input overwrite or relative output', async () => {
  await assert.rejects(cleanVideo({ input: __filename, output: __filename, ffmpeg: 'ffmpeg' }), /distinct absolute/);
  await assert.rejects(cleanVideo({ input: __filename, output: 'out.mp4', ffmpeg: 'ffmpeg' }), /distinct absolute/);
});

test('pinned engine reverses synthetic alpha-blended corner pixels without touching other pixels', async () => {
  const engine = await loadEngine();
  const size = 48;
  const width = 96;
  const height = 96;
  const mask = engine.geminiMask();
  const box = { x: 40, y: 40, size };
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 65; data[index + 1] = 110; data[index + 2] = 155; data[index + 3] = 255;
  }
  const before = data.slice();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const alpha = mask.data[y * size + x];
    const index = ((box.y + y) * width + box.x + x) * 4;
    for (let channel = 0; channel < 3; channel++) data[index + channel] = alpha * 255 + (1 - alpha) * data[index + channel];
  }
  const diagnostics = engine.unblendRegion({ width, height, data }, box, mask, engine.settings({ opacity: 1, edgeDiffusion: 'off' }));
  assert.ok(diagnostics.quality > 0.97, 'synthetic mark amplitude must be removed');
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    const inside = x >= box.x && x < box.x + size && y >= box.y && y < box.y + size;
    for (let channel = 0; channel < 4; channel++) {
      assert.ok(Math.abs(data[index + channel] - before[index + channel]) <= (inside ? 1 : 0));
    }
  }
});
