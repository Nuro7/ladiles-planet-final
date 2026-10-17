const path = require('node:path');
const { readFileSync } = require('node:fs');

const { existsSync, readdirSync } = require('node:fs');
const numbers = readdirSync(path.join(__dirname, '../assets'))
  .filter(name => /^budget-speed-batch-\d+$/.test(name))
  .map(name => Number(name.split('-').at(-1))).sort((a,b) => a-b)
  .filter(number => existsSync(path.join(__dirname, '../assets/budget-speed-batch-' + number, 'manifest.json')) && existsSync(path.join(__dirname, '../assets/budget-speed-batch-' + number, 'prompt.txt')));
module.exports = numbers.map(number => {
  const root = path.join(__dirname, '../assets/budget-speed-batch-' + number);
  const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const references = manifest.sceneFiles.map(file => path.join(root, file));
  let imagePrompt = [
    `Create one photorealistic ${manifest.aspectRatio} wedding photograph. ${manifest.imageAction}`,
    'MANDATORY IMAGE FRAMING: bright, complete head-to-toe full-body composition, pulled-back camera, generous headroom and visible floor beneath both feet. Keep the whole head, hands, complete outfit and skirt hem inside frame; for couples, show both people entirely from head to toe. Never create a close-up, medium/waist-up portrait, cut-off head, cropped feet, partial body, contact sheet, collage or inset panels. Full-body framing overrides any conflicting scene still or action wording.',
    'The current bride photograph alone defines her recognizable face, natural skin tone, age appearance, brows, eyes, nose, lips, cheeks and jaw. The current groom photograph alone defines his separate identity. Do not blend faces or adopt scene-reference faces.',
    'The actual selected dress photographs alone define colour, neckline, sleeves, seams, stitching, embroidery placement and scale, border widths, material texture, skirt and supplied dupatta. All optional views describe this one garment; never render a mannequin or garment contact sheet. One full-front image is required; other views are optional.',
    `Environment: ${manifest.environment} Use the scene stills only for surroundings, atmosphere, camera, composition and action. Never adopt the source people or clothing.`,
    'Preserve realistic anatomy and grounded contact. Clear face and outfit detail, natural expression, no captions, social handles or source branding.',
  ].join('\n');
  if (manifest.subjectMode === 'solo') imagePrompt = imagePrompt
    .replace('The current groom photograph alone defines his separate identity.', 'One bride only; no groom or additional model.')
    .replace('Do not blend faces or adopt scene-reference faces.', 'Use the customer bride face consistently; do not adopt scene-reference faces.');
  return {
    id: manifest.id, label: manifest.label, category: manifest.category,
    description: manifest.description, generationModes: ['speed'],
    subjects: {
      [manifest.subjectMode === 'solo' ? 'couple' : 'solo']: { available: false, label: manifest.label, description: manifest.subjectMode === 'solo' ? 'This story is for one bride.' : 'This story requires bride and groom photographs.' },
      [manifest.subjectMode || 'couple']: {
        templateId: manifest.templateId, templateNumber: manifest.templateNumber,
        status: [10, 11, 12, 14].includes(number) ? 'user-approved' : 'testing', version: [10, 11, 12, 14].includes(number) ? 2 : 1, label: manifest.label, description: manifest.description,
        verbatimPrompt: [10, 11, 12, 14].includes(number),
        prompt: readFileSync(path.join(root, 'prompt.txt'), 'utf8').trim(), imagePrompt,
        thumbnailPath: path.join(root, manifest.thumbnailFile || 'thumbnail.jpg'), sourceFilename: manifest.sourceFilename,
        referenceImagePath: references[0], imageReferenceImagePath: references[0],
        referenceImagePaths: references, referenceImageDescriptions: manifest.sceneRoles,
        extendedReferences: true, duration: manifest.duration, aspectRatio: manifest.aspectRatio, sound: false,
        sourceVideoUrl: null, sourceVideoPath: null, sourceVideoAsset: null,
        musicPath: path.join(root, 'music.m4a'), useSourceAudio: false,
      },
    },
  };
});
