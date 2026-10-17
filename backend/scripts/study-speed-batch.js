const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const media = require('../services/studioMediaService');
const downloads = 'C:/Users/MOHD MINHAJ/Downloads';
const prefixes = ['Happy Married Life Jimmy', 'Beautiful dream', 'Forever together', 'Two hearts, one beautiful beginning'];
async function main() {
  for (let i = 0; i < prefixes.length; i++) {
    const matches = fs.readdirSync(downloads).filter(name => name.startsWith(prefixes[i]) && name.endsWith('.mp4'));
    const name = matches.find(name => name.endsWith('(1).mp4')) || matches[0];
    if (!name) throw new Error('Missing video: ' + prefixes[i]);
    const input = path.join(downloads, name);
    const root = path.join(__dirname, '../assets', 'budget-speed-batch-' + (i + 4));
    fs.mkdirSync(root, { recursive: true });
    const info = spawnSync(media.binary(), ['-hide_banner', '-i', input, '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true, maxBuffer: 4000000 });
    const duration = info.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    const size = info.stderr.match(/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/);
    console.log(JSON.stringify({ number: i + 4, source: name, seconds: duration ? +duration[1] * 3600 + +duration[2] * 60 + +duration[3] : null, width: size?.[1], height: size?.[2], audio: /Audio:/.test(info.stderr) }));
    const output = spawnSync(media.binary(), ['-hide_banner', '-nostdin', '-i', input, '-vf', 'fps=2,scale=240:-2', '-q:v', '3', '-y', path.join(root, 'study-%03d.jpg')], { encoding: 'utf8', windowsHide: true });
    if (output.status !== 0) throw new Error(output.stderr);
    const frames = fs.readdirSync(root).filter(name => /^study-\d+\.jpg$/.test(name)).sort();
    for (let start = 0; start < frames.length; start += 24) {
      const page = frames.slice(start, start + 24);
      const height = Math.round(240 * +size[2] / +size[1]);
      const cellHeight = height + 26;
      const layers = [];
      for (let j = 0; j < page.length; j++) {
        const left = j % 6 * 240, top = Math.floor(j / 6) * cellHeight;
        layers.push({ input: await sharp(path.join(root, page[j])).resize(240, height).toBuffer(), left, top });
        layers.push({ input: Buffer.from(`<svg width="240" height="26"><rect width="240" height="26" fill="#111"/><text x="8" y="19" fill="white" font-size="16">${((start + j) / 2).toFixed(1)}s</text></svg>`), left, top: top + height });
      }
      await sharp({ create: { width: 1440, height: Math.ceil(page.length / 6) * cellHeight, channels: 3, background: '#111' } }).composite(layers).jpeg({ quality: 90 }).toFile(path.join(root, 'contact-' + (Math.floor(start / 24) + 1) + '.jpg'));
    }
    const cuts = spawnSync(media.binary(), ['-hide_banner', '-i', input, '-vf', "select='gt(scene,0.18)',showinfo", '-an', '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true, maxBuffer: 4000000 });
    console.log('CUTS ' + (i + 4) + ': ' + [...cuts.stderr.matchAll(/pts_time:([\d.]+)/g)].map(match => match[1]).join(', '));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
