const SECTION = `BRIDAL ORNAMENTS REFERENCE — JEWELLERY AUTHORITY
The attached bridal-ornaments-reference.png is the jewellery styling reference for the bride. Select ONE coherent, richly ornamented bridal ensemble from the sheet and dress the customer bride in it: an opulent necklace or choker with coordinated earrings, forehead ornament, bangles and visible hand jewellery. Preserve the selected pieces' gold finish, stones, pearls, scale, placement and arrangement consistently through every shot. The ornaments must look physically worn by the bride, with realistic weight, attachment and movement. Do not display the jewellery sheet, its velvet stands, panels or background in the film. Do not copy a face, body or garment from this sheet. The uploaded bride photo alone defines identity; the uploaded dress photos alone define the outfit; the source video or scene references define motion and setting. If a piece is hidden by framing, do not replace it with a different design when it becomes visible.`;

function withBridalOrnaments(prompt) {
  const value = String(prompt || '').trim();
  if (value.startsWith('PROJECT: LADIES PLANET — LUXURY BRIDAL CINEMATIC') && value.includes('MODEL: SEEDANCE 2.5 EDIT')) return value;
  if (value.startsWith('PROJECT: LADIES PLANET — LUXURY BRIDAL CINEMATIC') && value.includes('JEWELLERY REFERENCE:')) return value;
  if (value.includes('ROYAL RED BRIDE — GARDEN PORTRAIT AND VEIL TURN') && value.includes('LUXURY JEWELLERY AND ORNAMENT STYLING')) return value;
  if (value.startsWith('PROJECT: GARDEN VEIL & TURN — ROYAL BRIDAL EDITION') && value.includes('JEWELLERY PRESERVATION')) return value;
  if (!value || value.includes('BRIDAL ORNAMENTS REFERENCE — JEWELLERY AUTHORITY') || value.includes('Jewellery sheet: authority for ONE coordinated, richly ornamented bridal set.')) return value;
  return value + '\n\n' + SECTION;
}

module.exports = { SECTION, withBridalOrnaments };
