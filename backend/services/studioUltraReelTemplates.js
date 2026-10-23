const path = require('node:path');
const fs = require('node:fs');
const entries = [
  ['DeZcHoTMK5g', 2, 'Bouquet Garden & Mirror', 'Floral portraits, garden reveal and a circular mirror-room close.'],
  ['DbvjZykMGHn', 3, 'Chandelier Couture Cuts', 'Rapid chandelier, face, skirt and seated couture montage.'],
  ['Db5aUYYqmCm', 4, 'Window Veil & Smile', 'Warm window portraits, sheer curtains and quick monochrome inserts.'],
  ['DWWL5FJDEaH',5,'Velvet Veil & Ornaments','Rapid ornaments, warm portraits and lifted dupatta borders.'],
  ['DYbvLPzOXKG',6,'Lattice Suite Portrait','Lattice, warm lamps, couture details and a prism-framed veil.'],
  ['DTiV1CIk1tX',7,'Magenta Salon Reveal','Jewellery details, focus reveal and full seated couture.'],
  ['DZr_y90vFSK',8,'Amber Mirror Ritual','Gold mirror, amber portraits and intricate hand ornaments.'],
  ['DOs1F0xkoJX',9,'Carved Wood Bridal Flashes','Fast detail cuts resolving into warm veil portraits.'],
  ['DNlDu8JvP_2',10,'Palms to Palace Steps','Garden and suite highlights with a wide staircase finale.'],
  ['Dc5Ja4HRcVt',11,'Garden Earring & Joy','Daylight garden, earring gestures and joyful portraits.'],
];
module.exports = entries.map(([reelId, number, label, description]) => {
  const root = path.join(__dirname, '../assets/ultra-instagram-intake', reelId);
  const read = file => fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').trim();
  const prompt = number < 5 ? read(path.join(root,'prompt.txt')) : read(path.join(root,'../bridal-reference-rules-v2.txt'))+'\n'+read(path.join(root,'shots.txt'));
  if (prompt.length >= 4000) throw new Error(`Ultra Fast #${number} exceeds the owner's conservative 4000-character target.`);
  return {id:`ultra-reel-${number}`, label, description, category:'pre-wedding', subjects:{solo:{
    available:true, hidden:false, templateId:`ULTRA_REEL_0${number}`, templateNumber:number, label, description,
    prompt, verbatimPrompt:true, version:'ultra-reel-study-v1', status:'owner-requested-not-tested',
    duration:10, aspectRatio:'16:9', lockLandscape:true, sound:false,
    previewUrl:`/template-previews/ultra-reel-0${number}.${number<5?'svg':'jpg'}`, cardDesign:'reel-study',
    musicPath:path.join(root,'music.m4a'), useSourceAudio:false, sourceFilename:reelId+'.mp4',
    referenceImageUrl:null, referenceImagePaths:[], sourceVideoPath:null, sourceVideoUrl:null,
    hasWrittenShotPlan:true, promptCharacterCount:prompt.length,
    shotTimeline:prompt.split('\n').filter(line=>/^\d/.test(line)),
    referenceChecklist:{brideIdentity:true,exactDressAndDupatta:true,jewellerySheet:true,mannequinExclusion:true,timedShots:true,landscape:true},
  },couple:{available:false}}};
});
