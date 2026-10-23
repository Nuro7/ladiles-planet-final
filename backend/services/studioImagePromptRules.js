const MANNEQUIN_EXCLUSION = 'STRICT GARMENT-ONLY REFERENCE RULE — NO MANNEQUIN: Dress photographs may show a mannequin, display bust, artificial torso, hanger or stand. These are display objects, NOT part of the garment or the bride. Extract only the exact dress and matching dupatta; preserve all garment details. Completely discard the mannequin and its white/plastic colour, surface, texture and anatomy. Fit the garment naturally onto the real bride. Where the dress covers the stomach, waist or torso, show the actual dress fabric. Where the actual design exposes skin, including the stomach or waist, show natural human skin matching the bride’s complexion. Never fill exposed areas with white or plastic mannequin material. No white stomach patches, plastic belly, artificial torso, display neck, mannequin limbs, mannequin remnants or display objects anywhere in the image. Remove the display form, never the dress.';

function withMannequinExclusion(prompt) {
  const original = String(prompt || '');
  return original.includes(MANNEQUIN_EXCLUSION) ? original : original + '\n\n' + MANNEQUIN_EXCLUSION;
}

module.exports = { MANNEQUIN_EXCLUSION, withMannequinExclusion };
