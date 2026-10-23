const IMAGE_ASPECT_RATIO = '16:9';
const IMAGE_RESOLUTION = '2k';
const LANDSCAPE_RULE = 'MANDATORY IMAGE OUTPUT: Produce one 16:9 LANDSCAPE image at 2K quality. Compose for a wide horizontal canvas with the complete bride, hands, feet, dress, skirt hem and train inside the frame. Keep generous headroom and visible ground; do not crop the subject to fill the wide canvas. This output requirement overrides any conflicting portrait or vertical framing instruction. Preserve all other identity, garment, jewellery, scene and lighting instructions.';

function landscapeImagePrompt(prompt) {
  const original = String(prompt || '')
    .replace(/\bvertical\s+(?:4:5\s+)?portrait\s+composition\b/gi, '16:9 landscape composition')
    .replace(/\bportrait orientation\b/gi, '16:9 landscape orientation')
    .replace(/\bvertical bridal fashion photograph\b/gi, 'landscape bridal fashion photograph');
  return original.includes(LANDSCAPE_RULE) ? original : original + '\n\n' + LANDSCAPE_RULE;
}

module.exports = { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION, LANDSCAPE_RULE, landscapeImagePrompt };
