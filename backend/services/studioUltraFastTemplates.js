const imageScenes = require('./studioImageTemplates');
const path=require('node:path');
const {readFileSync}=require('node:fs');
const concepts = [
  ['ultra-garden', 'Garden Couture Story', 'A daylight garden, leafy walkway and pink bougainvillea. Bright soft natural light, green and pink background, warm realistic skin.', 'She takes two unhurried steps along the garden path, then pauses with a small natural smile.'],
  ['ultra-palace', 'Palace Couture Reveal', 'An open sandstone palace courtyard with carved arches and a pale stone floor. Soft reflected morning light, warm architectural depth.', 'She takes one step beneath an arch, then makes a gentle quarter-turn toward the camera.'],
  ['ultra-editorial', 'Editorial Bridal Portrait', 'A spacious fashion studio with a warm ivory backdrop, soft side-window lighting and subtle floor shadows. No props or additional people.', 'She shifts her weight naturally, turns slightly toward the light, then returns her gaze to the camera.'],
];
function prompt(setting, action) {
  return `Create a 10-second photorealistic bridal fashion film. Images only; no source video exists for this request. Follow the written shot sequence rather than inventing a reference-video performance.
REFERENCE ROLES: The first attached image is the bride identity. Remaining dress-view images show ONE selected garment. The final image is the bridal jewellery sheet. Use only the bride photo for recognizable facial structure, eyes, nose, lips, jaw, complexion and natural asymmetry. Ignore clothing in that photo. Reconstruct the exact uploaded dress and its matching dupatta: colour, fabric, neckline, sleeves, embroidery placement, borders and silhouette. Extract garment only, never a mannequin or display background. Select ONE coordinated rich jewellery ensemble from the last image; wear it naturally and consistently, never render the sheet. One bride throughout, natural anatomy and skin texture. No extra people, text, logos, wardrobe changes or face blending.
SETTING: ${setting}
SHOT-BY-SHOT EFFECTS TIMELINE
SHOT 1, 0–2s: Medium face-and-shoulders portrait at eye level, gentle straight push-in. The bride looks toward the camera, breathes naturally and gives a small relaxed smile. Keep facial identity clear. Clean cut at 2s.
SHOT 2, 2–5s: Full-length eye-level composition showing head, hands, skirt hem and feet. ${action} Camera tracks smoothly at matching walking speed, no digital zoom. Dupatta follows gravity. Cut on the end of her movement at 5s.
SHOT 3, 5–8s: Three-quarter full-body couture reveal. The bride gently holds the matching dupatta edge with one hand and makes a restrained quarter-turn; no full spin. Camera makes a slow 15-degree lateral arc without crossing her face. This is the signature garment reveal: preserve exact embroidery and fabric weight. Clean cut at 8s.
SHOT 4, 8–10s: Eye-level medium portrait, camera settles almost still. Bride returns her gaze to the lens; matching earrings and necklace catch natural light. Finish with a calm recognizable smile, no new pose or end card.
MASTER EFFECTS INVENTORY
1. Slow push-in, once in shot 1, for identity introduction.
2. Smooth tracking, once in shot 2, for the full outfit.
3. Restrained camera arc with natural cloth movement, once in shot 3, for the couture reveal.
4. Clean continuity cuts, three times, at 2s, 5s and 8s. No flashes or morph transitions.
EFFECTS DENSITY MAP
0–5s: LOW, one camera movement per shot. 5–8s: MEDIUM, camera arc and cloth movement. 8–10s: LOW, a quiet closing portrait.
ENERGY ARC
0–2s introduce the real bride; 2–8s develop the outfit and gentle movement; 8–10s resolve into a clear facial portrait. Use natural graceful motion, no exaggerated slow motion. No dialogue; soft ambience only.`;
}
module.exports = concepts.map(([id,label,setting,action],index)=>({id,label,description:'Image references and a written four-shot sequence. No video reference.',category:'pre-wedding',subjects:{solo:{
  available:false,hidden:true,templateId:'ULTRA_FAST_'+(index+1),templateNumber:index+1,label,prompt:prompt(setting,action),verbatimPrompt:true,
  version:'ultrafast-v1',duration:10,aspectRatio:'9:16',sound:false,status:'not-tested',
  previewUrl:imageScenes[index%imageScenes.length]?.subjects.solo.previewUrl,
  referenceImageUrl:null,referenceImagePaths:[],sourceVideoPath:null,sourceVideoUrl:null,hasWrittenShotPlan:true,
},couple:{available:false}}}));
const luxuryRoot=path.join(__dirname,'../assets/ultra-fast-luxury-01');
module.exports.unshift({id:'ultra-luxury-01',label:'01 · Luxury Bridal Film',description:'Owner-supplied reclining bridal sequence with the supplied original soundtrack.',category:'pre-wedding',subjects:{solo:{
  available:true,hidden:false,templateId:'ULTRA_LUXURY_01',templateNumber:1,label:'01 · Luxury Bridal Film',
  prompt:readFileSync(path.join(luxuryRoot,'prompt.txt'),'utf8').replace(/\r\n/g,'\n').trim(),verbatimPrompt:true,
  version:'ultra-luxury-v2-identity',duration:10,aspectRatio:'16:9',sound:false,status:'owner-supplied-not-tested',
  previewUrl:'/api/videos/studio/template-thumbnail/ULTRA_LUXURY_01',thumbnailPath:path.join(luxuryRoot,'template-thumbnail.jpg'),
  musicPath:path.join(luxuryRoot,'music.m4a'),useSourceAudio:false,
  referenceImageUrl:null,referenceImagePaths:[],sourceVideoPath:null,sourceVideoUrl:null,hasWrittenShotPlan:true,
  shotTimeline:['0–1s: Fade into reclining portrait','1–2s: Face and forehead jewellery push-in','2–3s: Dupatta over upper face','3–5s: Lateral eyes, ornament and border detail','5–6s: Wider reclining bride reveal','6–8s: Dress and spread dupatta reveal','8–9s: Tight face and warm flare','9–10s: Hold serene close-up'],
},couple:{available:false}}});
module.exports.push(...require('./studioUltraReelTemplates'));
