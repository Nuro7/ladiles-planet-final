#!/usr/bin/env node
// Mechanical export of the currently authored Budget Balance shot plans into
// owner-reviewable Google Flow Omni Flash video-edit prompt drafts.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const config = require('../services/studioVideoConfig');
const { withBridalOrnaments } = require('../services/bridalOrnamentsPrompt');

const output = path.join(__dirname, '..', '..', 'BUDGET_BALANCE_FLOW_TEST_PROMPTS.txt');
const lines = [
  'BUDGET BALANCE / GOOGLE FLOW GEMINI OMNI FLASH 1.1',
  'MANUAL TESTING CATALOG - 2.1, 2.2, 2.3, 2.5 AND 2.11 OWNER-PASSED; ALL OTHERS DRAFTS',
  '',
  'Use one numbered section per manual Google Flow test. Attach the actual files; typing a filename or @handle alone does not attach an asset. Select Video Edit, 10 seconds, and the listed source aspect ratio in Flow. Check the visible settings before spending credits.',
  'Reference priority: the customer bride photo is the only face authority; the customer dress photo(s) are the only garment authority; the saved bridal ornaments sheet governs jewellery styling; the source video supplies performance, motion, shot order, camera, lighting, surroundings and emotion. The original woman in the clip is NOT the output identity. Attach only photos and videos you have permission to use.',
  'These prompts request high motion fidelity, but Google Flow cannot guarantee exact pixel-level motion transfer, 100% identity, or 100% dress fidelity. Review the rendered result; a successful generation is not a quality pass. Do not mark Passed until the owner says so.',
  'The timing plans below come from the existing authored template shot notes, not a new frame-by-frame verification of every source file. If a prompt disagrees with the video, prefer the visible video and report the discrepancy before testing.',
  'The original source music is not requested inside Flow. Select silent visuals if the UI offers it; saved music can be handled separately outside the video prompt.',
  '',
  '================================================================',
];

for (const [index, scene] of config.budgetScenes.entries()) {
  const entry = scene.subjects.solo;
  const ownerApproved = ['palace-crimson-reveal', 'lakeside-palace-veil', 'garden-veil-spin', 'courtyard-breeze-portrait', 'sculpted-romance'].includes(scene.id);
  const file = entry.sourceVideoPath;
  const meta = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', file], { encoding: 'utf8' }));
  const video = meta.streams.find(stream => stream.width && stream.height);
  const ratio = video.height > video.width ? '9:16' : '16:9';
  const duration = Number(meta.format.duration);
  const original = entry.prompt.trim();
  const timeline = original.match(/SHOT-BY-SHOT EFFECTS TIMELINE[\s\S]*/)?.[0];
  const environment = original.match(/^Environment:.*$/m)?.[0] || '';
  const sculpted = scene.id === 'sculpted-romance';
  const sourceDetail = sculpted ? [
    'SHOT-BY-SHOT EFFECTS TIMELINE - adapted from the existing Sculpted Romance visual plan',
    '[0.0-1.5s] Reveal the bride through monumental curved timber forms; controlled warm light reaches her face, rich ornaments, blouse, skirt and dupatta. Slow, physically plausible camera reveal. Cut on her gentle movement.',
    '[1.5-3.0s] Full-body hero view. The entire head, hem and feet are visible within the wooden architecture. Controlled push-in or lateral camera move. Match cut on the bride\'s pose.',
    '[3.0-4.1s] She moves subtly between curved timber forms. Camera tracks her path; foreground and background wood create real parallax. Preserve the direction and speed of the supplied clip.',
    '[4.1-5.1s] Brief blouse and sleeve detail shot: show the actual uploaded neckline, sleeve construction and documented stitching. Warm wood remains softly visible. Clean cut.',
    '[5.1-6.1s] Textile macro: realistic fibres, metallic stitching and the uploaded garment\'s actual motif placement. Controlled focus pull; no invented motifs. Cut on fabric movement.',
    '[6.1-7.1s] Hand, bridal ornaments and garment detail. Her fingers touch the fabric naturally; jewellery remains coherent. Soft timber bokeh. Clean cut.',
    '[7.1-8.4s] Wider three-quarter hero view. Bride turns gracefully; camera moves laterally around curved wood. Dupatta, sleeves, face and ornaments remain consistent.',
    '[8.4-9.5s] Bride walks through the sculptural environment, with weighted skirt movement and natural dupatta inertia. Camera tracks alongside. Match motion into the ending.',
    '[9.5-10.0s] Final full-body or three-quarter hero composition within the same timber setting. Hold a recognizable face and complete dress to the final frame.',
    'MASTER EFFECTS INVENTORY: slow reveal, push-in, lateral tracking, foreground parallax, focus pull, natural fabric inertia, clean matched cuts. No random zoom, impossible camera path or morph transition.',
    'EFFECTS DENSITY MAP: 0-4.1s low (reveal and walk); 4.1-7.1s medium (garment and jewellery details); 7.1-10s low (turn, walk, settled hero ending).',
    'ENERGY ARC: architectural introduction, detailed couture reveal, resolved bridal portrait.',
  ].join('\n') : [environment, timeline].filter(Boolean).join('\n\n')
    // The saved plans cite timestamps from the longer original reels, while
    // these exported assets are ten-second excerpts. Keep only output timing.
    .replace(/\s+[—-]\s+Source moment [^\r\n]+/g, '')
    .replace(/\bGenerate silent visuals; the platform adds the saved original music\.\s*/g, '')
    .replace(/—/g, '-');

  const prompt = withBridalOrnaments(ownerApproved ? original : [
    'NO TEXT IN THE IMAGE: do not render captions, labels, social handles, logos or new watermarks.',
    'Create one 10-second photorealistic vertical 9:16 South Asian bridal film in Google Flow Gemini Omni Flash 1.1 Video Edit. Preserve the source video\'s chronological actions, pose timing, expression changes, camera heights and angles, camera movement, shot boundaries, transitions, slow-motion feel, lighting direction and surroundings as closely as this model allows. Do not simply copy the source woman.',
    'ATTACHED REFERENCES AND AUTHORITY:',
    '@Bride: the attached customer portrait defines the only output bride identity, natural complexion, facial structure, eyes, nose, lips, jaw, hairline and age appearance. Never reuse or blend the woman\'s face from @SourceVideo.',
    '@Dress: the attached full-front dress image and any optional side, rear or detail images show ONE actual garment. Reproduce its real colours, neckline, sleeves, silhouette, embroidery, border widths, skirt, dupatta and material. Replace the original garment in @SourceVideo; do not borrow its design. Optional views support the same garment and are not separate outfits.',
    '@SourceVideo: use this clip for motion, choreography, expression, camera, cuts, transitions, slow motion, jewellery arrangement, physical surroundings and lighting only. Its people and clothing are not identity or garment references.',
    'One bride throughout. Preserve recognisable face and garment across every cut; use rich bridal ornaments matching the source styling where visible. Keep skin and fabric realistic, hands anatomically sound, and the heavy bridal skirt physically grounded. If exact transfer is not possible, prioritise the key source action and continuity without inventing a different story.',
    'Keep the source aspect ratio. Avoid crop-only framing: include clear full-body views showing the head and complete dress in establishing and final shots, while retaining short source-motivated detail shots where the reference uses them. No substitute bride, generic gown, duplicate person, contact sheet or montage of unrelated scenes.',
    '',
    sourceDetail,
    '',
    'AUDIO: Intentional silence; no dialogue, synthetic music or sound effects.',
  ].join('\n'));

  lines.push(
    ownerApproved ? 'STATUS: PASSED (owner-tested Budget Balance video)' : 'STATUS: NOT TESTED',
    `${index + 1}. ${scene.label}`,
    `Template number: 2.${index + 1} (Budget Balance, video)`,
    `Internal template ID: ${entry.templateId}`,
    `Reference video to attach: ${file}`,
    `Source video: ${Math.round(duration * 100) / 100}s, ${video.width}x${video.height}, ${ratio}`,
    `Flow output setting: 10s, ${ratio}, Video Edit`,
    `Current app ratio setting: ${entry.aspectRatio || 'unspecified'}`,
    ...(duration > 10 ? ['IMPORTANT: This source is longer than Flow\'s up-to-10-second video-edit input. Do not upload it expecting the full 20-second sequence; select or prepare an authorised 10-second excerpt before this manual test.'] : []),
    ...(entry.aspectRatio !== ratio ? ['IMPORTANT: Current app ratio disagrees with the source. This draft follows the actual source orientation. The app setting must be corrected before an in-app test.'] : []),
    ownerApproved ? 'Status: base prompt PASSED by owner in a manual Google Flow reference-video test. The appended bridal-ornaments section is new and has not yet been quality-tested.' : 'Status: NOT TESTED. This is a proposed Flow copy-paste prompt; the platform inbuilt prompt has NOT been changed.',
    'Attach manually: source video, customer bride portrait, selected full-front dress photo, the saved backend/assets/global/bridal-ornaments-reference.png sheet, and optional extra views of that same dress. Use Flow\'s actual asset picker; @Bride, @Dress and @SourceVideo are role labels, not automatic attachments.',
    '',
    'COPY-PASTE PROMPT START',
    prompt,
    'COPY-PASTE PROMPT END',
    '',
    'OWNER QUALITY CHECK: recognizable customer face; actual dress colour, sleeves, embroidery and dupatta; source action and emotion; camera movement and cuts; correct aspect ratio; no policy or attachment error. Reply with the exact template number and PASS only when satisfied.',
    '================================================================',
  );
}

fs.writeFileSync(output, lines.join('\r\n') + '\r\n', 'utf8');
console.log(`${output}\n${config.budgetScenes.length} prompts exported.`);
