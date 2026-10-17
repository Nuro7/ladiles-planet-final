'use strict';
// Local diagnostic only: compare isolated MIT alpha masks on the existing cat clip.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const { loadEngine } = require('./clean-visible-logo');

async function main() {
  const base = path.join(__dirname, '..');
  const source = path.join(base, 'data/flow-mcp/outputs/LadiesPlanet/clip-02.mp4');
  const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;
  const engine = await loadEngine();
  const box = { x: 1704, y: 864, size: 72 };
  const cfg = engine.settings({ opacity: 'auto', baseStrength: 1, stroke: false, edgeDiffusion: 'off' });
  async function mask(filename) {
    const decoded = await sharp(path.join(base, 'vendor/seeb4-erase/additional-masks', filename)).greyscale().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return { size: decoded.info.width, data: Float32Array.from(decoded.data, byte => byte / 255) };
  }
  const masks = [['SEEB4', engine.geminiMask()], ['frog48', await mask('froggeric-gemini-48.png')], ['frog96', await mask('froggeric-gemini-96.png')]];
  const strokeMode = process.argv.includes('--stroke-sweep');
  const tests = strokeMode ? [
    ['none', masks[0][1], { ...cfg, opacity: .6522685491676813 }],
    ...[.03,.06,.1,.15].map(alpha=>['stroke '+alpha,masks[0][1],{...cfg,stroke:true,strokeAlpha:alpha,strokeWidth:1.5/72,opacity:.6522685491676813}]),
  ] : masks.map(([name,chosenMask])=>[name,chosenMask,cfg]);
  const outputs = [];
  const report = [];
  for (const time of [0, 1.5, 3]) {
    const decoded = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', String(time), '-i', source, '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1'], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    if (decoded.status !== 0 || decoded.stdout.length !== 1920 * 1080 * 4) throw new Error('Cannot decode source frame: ' + decoded.stderr);
    const versions = [['original', Buffer.from(decoded.stdout)]];
    for (const [name, chosenMask, chosenCfg] of tests) {
      const pixels = Buffer.from(decoded.stdout);
      const image = { width: 1920, height: 1080, data: new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength) };
      const gain = typeof chosenCfg.opacity === 'number' ? {gain:chosenCfg.opacity,solved:true} : engine.solveGain(image, box, chosenMask, chosenCfg);
      const stats = engine.unblendRegion(image, box, chosenMask, { ...chosenCfg, opacity: gain.gain });
      versions.push([name + ' gain ' + gain.gain.toFixed(3), pixels]);
      report.push({time,name,gain:gain.gain,solved:gain.solved,quality:stats.quality});
    }
    for (let col = 0; col < versions.length; col++) {
      const [label, pixels] = versions[col];
      const tile = await sharp(pixels, { raw: { width: 1920, height: 1080, channels: 4 } }).extract({ left: 1664, top: 824, width: 152, height: 152 }).resize(380,380,{ kernel: 'nearest' }).png().toBuffer();
      const row = [0,1.5,3].indexOf(time);
      outputs.push({input:tile,left:col*380,top:row*420+40});
      const caption = Buffer.from('<svg width="380" height="40"><rect width="380" height="40" fill="white"/><text x="8" y="25" font-family="Arial" font-size="18">' + time + 's ' + label + '</text></svg>');
      outputs.push({input:caption,left:col*380,top:row*420});
    }
  }
  const output = path.join(base,'data/studio-media/'+(strokeMode?'cat-stroke-sweep.png':'cat-mask-variants.png'));
  await sharp({ create: { width: (tests.length+1)*380,height:1260,channels:4,background:'white' } }).composite(outputs).png().toFile(output);
  const a = masks[0][1].data, b = masks[1][1].data;
  console.log(JSON.stringify({output,report,mask48rms:Math.sqrt(a.reduce((sum,v,i)=>sum+(v-b[i])**2,0)/a.length)},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
