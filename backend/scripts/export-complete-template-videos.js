const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assets = path.resolve(__dirname, '../assets');
const destination = path.join(assets, 'complete-original-videos');
const entries = [
  { folder: 'budget-balance-01', name: 'Sculpted Romance', number: '01', subject: 'bride-only', file: 'reference.mp4' },
  { folder: 'budget-speed-01', name: 'A Promise in Slow Motion', number: '02', subject: 'bride-and-groom', file: 'original.mp4' },
  { folder: 'budget-speed-dream-03', name: 'The Moment We Dreamed', number: '03', subject: 'bride-and-groom', file: 'original.mp4' },
];
for (let n = 4; n <= 19; n++) {
  const folder = 'budget-speed-batch-' + n;
  const manifest = JSON.parse(fs.readFileSync(path.join(assets, folder, 'manifest.json'), 'utf8'));
  entries.push({ folder, name: manifest.label, number: String(n).padStart(2, '0'),
    subject: manifest.subjectMode === 'solo' ? 'bride-only' : 'bride-and-groom',
    source: manifest.subjectMode === 'solo'
      ? path.join(assets, 'instagram-intake', manifest.sourceFilename)
      : path.join(assets, folder, 'original.mp4') });
}
entries.push(
  { folder: 'flagship-01', name: 'Jimshad Wedding', number: 'F1', subject: 'bride-and-groom', file: 'reference.mp4' },
  { folder: 'flagship-02', name: 'Romantic Bridal Moment', number: 'F2', subject: 'bride-and-groom', file: 'original.mp4' },
);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const entry of entries) {
  const source = entry.source || path.join(assets, entry.folder, entry.file);
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,width,height', '-of', 'json', source], { encoding: 'utf8' }));
  if (!metadata.streams.some(stream => stream.codec_type === 'audio')) throw new Error('Missing original audio: ' + source);
  const folder = path.join(destination, entry.subject);
  fs.mkdirSync(folder, { recursive: true });
  const output = path.join(folder, `${entry.number} - ${entry.name}.mp4`);
  fs.copyFileSync(source, output);
  const digest = hash(source);
  if (hash(output) !== digest) throw new Error('Original copy verification failed: ' + output);
  Object.assign(entry, { source, output, durationSeconds: Number(metadata.format.duration),
    originalAudio: true, sha256: digest, trimmed: false, cropped: false, reencoded: false });
}
for (const subject of ['bride-only', 'bride-and-groom']) {
  const group = entries.filter(entry => entry.subject === subject);
  fs.writeFileSync(path.join(destination, subject, 'metadata.json'), JSON.stringify(group, null, 2));
  console.log(JSON.stringify({ folder: path.join(destination, subject), count: group.length,
    minimumSeconds: Math.min(...group.map(entry => entry.durationSeconds)),
    maximumSeconds: Math.max(...group.map(entry => entry.durationSeconds)), verifiedOriginalCopiesWithAudio: true }));
}
