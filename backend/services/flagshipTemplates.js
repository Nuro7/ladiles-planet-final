const path = require('node:path');
const { readFileSync } = require('node:fs');

module.exports = [
  ['01', 'flagship-jimshad-wedding', 'Jimshad Wedding', 15.02],
  ['02', 'flagship-romantic-bouquet', 'Romantic Bridal Moment', 14.9],
  ['03', 'flagship-moment-we-dreamed', 'The Moment We Dreamed', 13.349],
].map(([number, id, label, duration]) => {
  const root = path.join(__dirname, '../assets/flagship-' + number);
  const mediaRoot = number === '01' ? path.join(root, 'landscape-v3') : root;
  return { id, label, category: 'wedding', generationModes: ['balance'],
    description: 'Flagship couple transformation with the supplied bride, groom and dress.',
    subjects: {
      solo: { available: false },
      couple: {
        templateId: 'FLAGSHIP_GENJUTSU_' + number, templateNumber: Number(number),
        label, description: 'Your couple, dress and jewellery following the original wedding performance.',
        status: number === '03' ? 'testing' : 'user-approved', version: 1, verbatimPrompt: true, available: true,
        prompt: readFileSync(path.join(root, number === '01' ? 'prompt-identity-body-v2.txt' : 'prompt.txt'), 'utf8').replace(/Seedance 2\.0 Fast/gi, 'Higgsfield Genjutsu').trim(),
        duration, aspectRatio: number === '01' ? '16:9' : '9:16', sound: false, extendedReferences: true,
        sourceVideoPath: path.join(mediaRoot, 'reference.mp4'),
        thumbnailPath: path.join(mediaRoot, 'thumbnail.jpg'),
        musicPath: path.join(mediaRoot, 'music.m4a'), useSourceAudio: false,
      },
    },
  };
});
