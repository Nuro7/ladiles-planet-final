const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const media = require('../services/studioMediaService');
const downloads = 'C:/Users/MOHD MINHAJ/Downloads';
const clips = [
  { n: 4, prefix: 'Happy Married Life Jimmy', frames: [0.12, 2.07, 4.94, 7.64, 15.3], thumbnail: 10.7 },
  { n: 5, prefix: 'Beautiful dream', frames: [0.12, 3.45, 14.5], thumbnail: 10.5 },
  { n: 6, prefix: 'Forever together', frames: [0.6, 1.85, 4.95], thumbnail: 9.2 },
  { n: 7, prefix: 'Two hearts, one beautiful beginning', frames: [0.12, 1.08, 2.58, 4.12, 5.15, 8.12, 10.02, 11.12, 12.55, 15.35, 17.92, 19.68, 21.72, 22.82, 24.25, 25.25, 25.95], thumbnail: 18.5 },
];
async function run() {
  for (const clip of clips) {
    const matches = fs.readdirSync(downloads).filter(name => name.startsWith(clip.prefix) && name.endsWith('.mp4'));
    const source = path.join(downloads, matches.find(name => name.endsWith('(1).mp4')) || matches[0]);
    const root = path.join(__dirname, '../assets/budget-speed-batch-' + clip.n);
    for (const [i, time] of [...clip.frames, clip.thumbnail].entries()) {
      const name = i === clip.frames.length ? 'thumbnail.jpg' : 'source-shot-' + String(i + 1).padStart(2, '0') + '.png';
      const args = ['-hide_banner', '-nostdin', '-ss', String(time), '-i', source, '-frames:v', '1', '-y', path.join(root, name)];
      const result = spawnSync(media.binary(), args, { encoding: 'utf8', windowsHide: true });
      if (result.status !== 0) throw new Error(result.stderr);
    }
    await media.extractTemplateMusic(source, path.join(root, 'music.m4a'));
    if (clip.n === 4) {
      const layers = [];
      for (let j = 0; j < 2; j++) layers.push({input:await sharp(path.join(root,'source-shot-0'+(j+1)+'.png')).resize(720,1280).png().toBuffer(),left:j*720,top:0});
      await sharp({create:{width:1440,height:1280,channels:3,background:'#111'}}).composite(layers).png().toFile(path.join(root,'scene-board-1.png'));
    }
    if (clip.n === 7) {
      // Group the full, uncropped chronological source shots into three readable
      // boards. Flow has seven ingredient slots; reserve slots for identities,
      // the dress sheet and individual garment photos as well as the setting.
      const groups = [[1,2,3,4,5,6], [7,8,9,10,11,12], [13,14,15,16]];
      for (const [groupIndex, group] of groups.entries()) {
        const layers = [];
        for (const [slot, shot] of group.entries()) {
          const left = slot % 2 * 960, top = Math.floor(slot / 2) * 600;
          layers.push({ input: await sharp(path.join(root, 'source-shot-' + String(shot).padStart(2, '0') + '.png')).resize(960, 542, {fit:'contain',background:'#151515'}).png().toBuffer(), left, top });
          layers.push({ input: Buffer.from(`<svg width="960" height="58"><rect width="960" height="58" fill="#151515"/><text x="16" y="36" fill="white" font-size="26">SOURCE SHOT ${shot} | ${clip.frames[shot - 1]}s | setting/action only</text></svg>`), left, top: top + 542 });
        }
        await sharp({create:{width:1920,height:1800,channels:3,background:'#151515'}}).composite(layers).png().toFile(path.join(root, 'scene-board-' + (groupIndex + 1) + '.png'));
      }
    }
    console.log('Prepared #' + clip.n + ': ' + clip.frames.length + ' full shot frames, thumbnail, original audio');
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
