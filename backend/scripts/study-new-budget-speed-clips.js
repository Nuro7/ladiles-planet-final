const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const media = require('../services/studioMediaService');

const downloads = 'C:/Users/MOHD MINHAJ/Downloads';
const clips = [
  { number: 8, prefix: '“𝗧𝗼 𝗳𝗼𝗿𝗲𝘃𝗲𝗿”' },
  { number: 9, prefix: 'wedding reel❤️' },
];

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8_000_000 });
  if (result.status !== 0) throw new Error(result.stderr || `ffmpeg exited ${result.status}`);
  return result;
}

async function main() {
  for (const clip of clips) {
    const name = fs.readdirSync(downloads).find(file => file.startsWith(clip.prefix) && file.toLowerCase().endsWith('.mp4'));
    if (!name) throw new Error(`Missing source clip for #${clip.number}`);
    const source = path.join(downloads, name);
    const root = path.join(__dirname, '..', 'assets', `budget-speed-batch-${clip.number}`);
    fs.mkdirSync(root, { recursive: true });
    const probe = run(media.binary(), ['-hide_banner', '-i', source, '-f', 'null', '-']);
    const duration = probe.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    const size = probe.stderr.match(/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/);
    const seconds = duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : null;
    console.log(JSON.stringify({ number: clip.number, source: name, seconds, width: size?.[1], height: size?.[2], audio: /Audio:/.test(probe.stderr) }));
    run(media.binary(), ['-hide_banner', '-nostdin', '-i', source, '-vf', 'fps=2,scale=240:-2', '-q:v', '3', '-y', path.join(root, 'study-%03d.jpg')]);
    const frames = fs.readdirSync(root).filter(file => /^study-\d+\.jpg$/.test(file)).sort();
    const frameHeight = Math.round(240 * Number(size[2]) / Number(size[1]));
    const cellHeight = frameHeight + 26;
    for (let start = 0; start < frames.length; start += 24) {
      const page = frames.slice(start, start + 24);
      const layers = [];
      for (let index = 0; index < page.length; index++) {
        const left = (index % 6) * 240;
        const top = Math.floor(index / 6) * cellHeight;
        layers.push({ input: await sharp(path.join(root, page[index])).resize(240, frameHeight).toBuffer(), left, top });
        layers.push({ input: Buffer.from(`<svg width="240" height="26"><rect width="240" height="26" fill="#111"/><text x="8" y="19" fill="white" font-size="16">${((start + index) / 2).toFixed(1)}s</text></svg>`), left, top: top + frameHeight });
      }
      await sharp({ create: { width: 1440, height: Math.ceil(page.length / 6) * cellHeight, channels: 3, background: '#111' } })
        .composite(layers).jpeg({ quality: 90 }).toFile(path.join(root, `contact-${Math.floor(start / 24) + 1}.jpg`));
    }
    const cuts = run(media.binary(), ['-hide_banner', '-i', source, '-vf', "select='gt(scene,0.18)',showinfo", '-an', '-f', 'null', '-']);
    console.log(`CUTS #${clip.number}: ` + [...cuts.stderr.matchAll(/pts_time:([\d.]+)/g)].map(match => match[1]).join(', '));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
