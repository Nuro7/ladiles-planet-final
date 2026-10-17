const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const media = require('../services/studioMediaService');

const downloads = 'C:/Users/MOHD MINHAJ/Downloads';
const clips = [
  {
    number: 8,
    prefix: '“𝗧𝗼 𝗳𝗼𝗿𝗲𝘃𝗲𝗿”',
    frames: [0.12, 6.08, 16.05, 22.72],
    thumbnail: 28.2,
    // Native landscape composition.
    filter: null,
  },
  {
    number: 9,
    prefix: 'wedding reel❤️',
    frames: [0.12, 8.8, 15.0, 33.5],
    thumbnail: 45.2,
    // The supplied file declares 9:16 but its pixel content is sideways.
    // Rotate it upright and centre-crop it back to the declared portrait frame
    // so the output ratio follows the source while Flow receives usable scenes.
    filter: 'transpose=2,crop=405:720:(iw-405)/2:0,scale=720:1280',
  },
];

function extract(binary, source, time, output, filter) {
  const args = ['-hide_banner', '-nostdin', '-ss', String(time), '-i', source];
  if (filter) args.push('-vf', filter);
  args.push('-frames:v', '1', '-y', output);
  const result = spawnSync(binary, args, { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || `ffmpeg exited ${result.status}`);
}

async function main() {
  for (const clip of clips) {
    const sourceName = fs.readdirSync(downloads).find(file => file.startsWith(clip.prefix) && file.toLowerCase().endsWith('.mp4'));
    if (!sourceName) throw new Error(`Missing source clip #${clip.number}`);
    const source = path.join(downloads, sourceName);
    const root = path.join(__dirname, '..', 'assets', `budget-speed-batch-${clip.number}`);
    for (const [index, time] of clip.frames.entries()) {
      extract(media.binary(), source, time, path.join(root, `source-shot-${String(index + 1).padStart(2, '0')}.png`), clip.filter);
    }
    extract(media.binary(), source, clip.thumbnail, path.join(root, 'thumbnail.jpg'), clip.filter);
    await media.extractTemplateMusic(source, path.join(root, 'music.m4a'));
    console.log(`Prepared #${clip.number}: ${clip.frames.length} chronological scene stills, thumbnail and original music.`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
