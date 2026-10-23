// Card photography is visual inspiration only. None of these URLs is sent to
// the image provider; the customer's bride and dress photos are the references.
const previews = [
  'be/8b/8e/be8b8e44748c9668acec8718d0331bfc',
  'ca/5b/42/ca5b427f5ee24a7691d41e2345457186',
  '27/5f/87/275f87b4f5760b227cc3740dd70c0b0f',
  'bc/46/9d/bc469d40aee48927662b5de8019fa6e5',
  'd3/d6/b9/d3d6b9b46f92f6d7b1cf984be161ede9',
  '54/b1/5b/54b15b781642f41855ec6e82382ba0ee',
  '19/89/8b/19898bfd41b6ecfa10e087f59a01881a',
];
const concepts = [
  ['bougainvillea-twirl', 'Bougainvillea Twirl', 'A sunlit garden twirl beneath cascading pink flowers.', 'On a vivid green lawn beneath a canopy of pink bougainvillea, the bride makes a gentle, natural twirl. A wide editorial camera shows the skirt opening into a graceful circle. Clear mid-morning sunlight, crisp floral colour, realistic shadows and a joyful expression.'],
  ['palace-archway', 'Palace Archway', 'A luminous full-length portrait beneath carved stone arches.', 'The bride stands centrally beneath a grand carved sandstone archway, with repeating arches receding behind her. Warm reflected daylight illuminates her face and the entire garment; symmetrical composition, straight architectural lines and a poised relaxed stance.'],
  ['flower-garden-walk', 'Flower Garden Walk', 'A bright bridal walk beside lush flowering borders.', 'The bride walks slowly along a garden path bordered by fresh flowers and leafy greenery. A wide eye-level fashion photograph catches a natural step and subtle movement in the dupatta. Bright soft daylight, clear face, realistic depth and a fully visible silhouette.'],
  ['heritage-staircase', 'Heritage Staircase', 'Regal daylight on a broad heritage staircase.', 'The bride pauses on the middle of broad, pale heritage steps with ornate railings and a softly lit historic facade. A pulled-back, straight-on composition makes the full garment and long skirt easy to see. Luminous daylight, elegant posture, natural hands and realistic stone detail.'],
  ['courtyard-breeze', 'Courtyard Breeze', 'An airy portrait in an open flower-lined courtyard.', 'The bride stands in an open, pale-stone courtyard with flowered planters and delicate trees. A mild breeze moves the edge of the dupatta without hiding her face or garment. Bright high-key daylight, subtle shadow, generous space around her and a calm confident expression.'],
  ['royal-terrace', 'Royal Terrace', 'A complete bridal silhouette against a sunlit terrace.', 'The bride stands on a spacious palace terrace with carved balustrades and distant greenery. Compose a wide fashion image at eye level, with the entire skirt spread naturally on the stone floor. Golden morning side-light reveals true fabric colour and embroidery without darkening the face.'],
  ['jasmine-colonnade', 'Jasmine Colonnade', 'A graceful walk through a jasmine-framed colonnade.', 'The bride walks beneath a sequence of cream-coloured columns, with flowering jasmine climbing along the side. Natural daylight falls evenly across her face, jewellery and dress. Keep the camera far enough back for the full figure, complete train and repeating architectural rhythm.'],
  ['sunny-lawn', 'Sunny Lawn', 'A joyful full-length bridal portrait in fresh greenery.', 'On a clean green lawn with soft trees in the distance, the bride faces slightly toward the camera and holds a relaxed, elegant pose. Bright but gentle daylight, vivid natural colours, realistic skin and a broad uninterrupted view of the entire outfit.'],
  ['floral-entrance', 'Floral Entrance', 'A grand floral entrance with clear bridal detail.', 'The bride stands at the centre of a wide wedding entrance framed by tasteful flower garlands and pale architectural details. A bright frontal fill keeps her face recognizable and the garment true to the uploaded dress. Balanced symmetry, complete floor-length silhouette and natural celebratory atmosphere.'],
  ['marble-pavilion', 'Marble Pavilion', 'Soft daylight inside a spacious marble pavilion.', 'The bride poses beneath an airy white-marble pavilion with open sides and garden views. Place her well inside the frame in a refined full-length editorial composition. Soft luminous daylight, gentle floor reflections, realistic jewellery sparkle and rich visible garment texture.'],
];

const authority = 'REFERENCE AUTHORITY: The uploaded bride photograph is the ONLY identity source. Preserve her actual facial structure, features, age appearance, complexion and natural asymmetry. The uploaded dress photographs show ONE actual garment and are the ONLY outfit source: preserve its true colours, neckline, sleeves, fit, embroidery placement, silhouette, skirt hem and dupatta. Style the bride with one coherent, opulent bridal jewellery set—necklace or choker, matching earrings, forehead ornament and bangles—while keeping her face unobstructed. Do not copy a face, dress or jewellery from the card preview. No style/reference image is attached for this scene. ';
const framing = 'FRAMING: Produce one photorealistic, bright, high-resolution vertical bridal fashion photograph. The bride must appear complete from the top of her head to the bottom of both feet. Leave generous clear space above the head, beside the body and below the full skirt hem. Show both hands, every limb, the complete dress and its train. No close-up, cropped head, cropped feet, missing body part, collage, inset, text, logo or extra person. Natural anatomy, realistic hands, grounded fabric and clean facial detail.';

const archivedTemplates = concepts.map(([id, label, description, scene], index) => ({
  id: 'image-' + id, label, description, category: 'pre-wedding',
  subjects: {
    solo: {
      templateId: 'BRIDAL_IMAGE_' + String(index + 1).padStart(2, '0'),
      templateNumber: index + 1, label, description,
      imagePrompt: `${authority}SCENE: ${scene} ${framing}`,
      previewUrl: `https://i.pinimg.com/${index === 0 ? '736x' : '474x'}/${previews[index % previews.length]}.jpg`,
      available: true, version: 1,
    },
    couple: { available: false },
  },
}));

// The owner approved only the supplied image prompts. Keep the previous
// concepts above for recovery, and publish only complete approved entries.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const approvedSource = readFileSync(path.join(__dirname, '../assets/approved-image-prompts/user-approved-source.txt'), 'utf8').replace(/\r\n/g, '\n');
function approvedPrompt(section, nextSection) {
  const start = approvedSource.indexOf(section);
  const end = approvedSource.indexOf(nextSection, start + section.length);
  const block = approvedSource.slice(start, end);
  const promptStart = block.indexOf('GENERATION PROMPT:\n');
  if (start < 0 || end < 0 || promptStart < 0) throw new Error('Approved image prompt source is incomplete.');
  return block.slice(promptStart + 'GENERATION PROMPT:\n'.length).replace(/\s*=+\s*$/, '').trim();
}
const approved = [
  { id: 'image-bougainvillea-twirl', number: 1, label: 'Garden Bridal Spin — Pink Bougainvillea',
    description: 'A full-length bridal turn beneath pink bougainvillea.', preview: archivedTemplates[0].subjects.solo.previewUrl,
    prompt: approvedPrompt('5. IMAGE PROMPT 1', '6. IMAGE PROMPT 2') },
  { id: 'image-forest-courtyard-spin', number: 2, label: 'Forest Courtyard Spin — Ornate Lehenga',
    description: 'A full-length lehenga flare in a leafy stone courtyard.', preview: archivedTemplates[1].subjects.solo.previewUrl,
    prompt: approvedPrompt('6. IMAGE PROMPT 2', '7. PROMPTS 3–10') },
];
approved.push({ id: 'image-regal-staircase', number: 3, label: 'Regal Staircase',
  description: 'Full-length staircase portrait with dramatic cinematic lighting.',
  preview: '/template-previews/image-03.png',
  prompt: readFileSync(path.join(__dirname, '../assets/approved-image-prompts/prompt-03-staircase.txt'), 'utf8').trim() });
const additionalSource = readFileSync(path.join(__dirname, '../assets/approved-image-prompts/user-image-prompts-03-to-08.txt'), 'utf8').replace(/\r\n/g, '\n');
for (let number = 4; number <= 8; number++) {
  const section = additionalSource.split(`#prompt${number} — `)[1];
  if (!section) throw new Error(`Missing image prompt ${number}`);
  const label = section.split('\n')[0].trim();
  const body = section.slice(section.indexOf('Create a photorealistic'));
  const prompt = body.split(/\n\s*=+\s*\n/)[0].trim();
  if (!prompt.startsWith('Create a photorealistic') || !prompt.includes('MANNEQUIN REMOVAL:')) throw new Error(`Incomplete image prompt ${number}`);
  approved.push({ id: `image-owner-${number}`, number, label,
    description: 'Owner-supplied landscape bridal photograph. Bride identity and exact dress from your uploads.',
    preview: `/template-previews/image-${String(number).padStart(2, '0')}.png`, prompt });
}
module.exports = approved.map(item => ({
  id: item.id, label: item.label, description: item.description, category: 'pre-wedding',
  subjects: { solo: {
    templateId: `BRIDAL_IMAGE_${String(item.number).padStart(2, '0')}`,
    templateNumber: item.number, label: item.label, description: item.description,
    imagePrompt: item.number >= 3 ? item.prompt : require('./studioImageOutputPolicy').landscapeImagePrompt(item.prompt), aspectRatio: '16:9', imageResolution: '2k', status: 'user-approved', ownerApproved: true,
    previewUrl: item.preview, available: true, version: 2,
  }, couple: { available: false } },
}));
