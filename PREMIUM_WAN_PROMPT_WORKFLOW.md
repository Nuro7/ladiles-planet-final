# Premium (Wan 3.0 Prime) prompt workflow — Instagram reference to template

Read this before turning an Instagram bridal video into a Premium template, writing or revising a Premium prompt, or integrating one. It is the Premium counterpart of `BUDGET_SPEED_PROMPT_WORKFLOW.md`; the identity, garment and honesty rules there still apply. Where the two disagree for **Premium Wan templates**, this file wins (jewellery and prompt length in particular). The user's latest explicit instruction always wins over both.

Goal of every Premium template: **the output is the reference video, shot for shot, with three things replaced — the woman becomes the customer bride, the outfit becomes the selected dress (with its dupatta), and the jewellery becomes the boutique's database jewellery, or minimal jewellery when none can be fetched.** Nothing else changes.

---

## 1. How Premium generation actually works (verified from code, 2026-10-23)

| Item | Fact | Where |
|---|---|---|
| Model | `wan3_0_prime` (Wan 3.0 Prime) via Higgsfield MCP | `backend/services/studioGenerationRoute.js`, `studioVideoConfig.js` tier `premium` |
| Reference video | Sent only in **Balance** mode, as one `video_references` media. Premium **Speed** strips the video. Templates that must follow a video go in `premiumBalanceScenes`. | `studioGenerationRoute.resolve/enforce`, `studioHiggsfieldService.makeVideo` |
| Image references | Sent as `image_references`, in this order: bride → (groom, couple only) → dress views (`dress front`, then optional detail/side/rear) → jewellery image(s) last. Duplicate URLs are dropped. The count varies per customer. | `studioCreationService.js:86-89`, `studioVideoService.render` |
| Prompt | Sent as-is when the recipe has `verbatimPrompt: true`. Without it, `withBridalOrnaments()` appends a ~1,200-character "ornaments sheet" section. **Premium Wan templates must set `verbatimPrompt: true`.** | `studioVideoConfig.js:300`, `bridalOrnamentsPrompt.js` |
| Prompt limit | **Wan 3.0 Prime rejects prompts over 5,000 characters** before submission (`PROMPT_TOO_LONG`). Counted as Unicode characters. | `studioPromptValidation.js` |
| Durations / ratios | Premium tier: 4, 5, 8, 10, **15** s; `16:9` or `9:16` only. New Premium Wan intake targets 15 s; the three earlier owner templates remain 10 s. 1:1 and 4:5 Instagram posts must be converted during preparation (section 4). | `studioVideoConfig.js` tiers |
| Audio | Generate silent (`sound: false`). Original music is added in finishing (`useSourceAudio` or `musicPath`). | `studioMediaService.finishVideo` |
| Spend gate | A credit quote (`get_cost`) is requested first; paid submission requires `HIGGSFIELD_SPEND_ENABLED=true` / owner approval. A quote is the safe way to validate inputs without generating. | `studioHiggsfieldService.requireOwnerApproval` |
| Bride only | Premium Balance currently forces `couple.available = false`. Write Premium Wan templates for Bride only unless the user asks to enable couples. | `studioVideoConfig.js` `premiumBalanceScenes` |

**Prompt text cannot attach anything.** Writing "IMAGE 3" or a filename in the prompt does not supply an image. The backend decides which images reach Wan; the prompt must describe roles that match what is really sent.

---

## 2. Lessons from the existing prompts

Analysed: the 3 owner prompts in Premium (`royal-red-garden/prompt.txt`, `luxury-bridal-cinematic/prompt.txt`, `elegance-landscape/prompt.txt`), the Wan rewrite `royal-red-garden/prompt-wan-v3.txt`, the Budget Speed batch prompts (`budget-speed-batch-4…19`), the Ultra Instagram intake prompts (`ultra-instagram-intake/*/prompt.txt`) and the passed-prompt export (`testing-video-libraries/Quick - All Passed Video Prompts.txt`).

### Keep (proven patterns)

1. **Strict role separation** (all prompts): video = performance, camera, setting; bride photo = face only; dress photos = garment only; jewellery reference = ornaments only. Say what each reference is *not* for.
2. **"Bride photo is face identity only — ignore its clothing"** (`prompt-wan-v3`). Without it, the customer's casual top leaks into frames.
3. **Dupatta split** (`prompt-wan-v3`): the dress image decides the dupatta's look; the video decides only how it moves. Never mix in the source dupatta.
4. **Mannequin exclusion** (`prompt-wan-v3`, Ultra intake): boutique dress photos are often on mannequins; without this, white plastic torso patches appear on the bride.
5. **Face-to-head integration** (`luxury-bridal-cinematic`): no floating or pasted face, no swap seams, face follows head turns and scene light. Compress to one or two lines.
6. **Compact second-by-second timeline** (Budget Speed batch, Ultra intake): `0.0–2.2s: action; camera; transition.` One line per shot, with real timestamps from the clip.
7. **Explicit "not an unchanged copy"** (`prompt-wan-v3`, Royal Red): Wan can return the source woman if replacement is not stated as the task.
8. **Closing PRIORITIES line** (`prompt-wan-v3`): a short ranked list tells the model what to protect when it cannot do everything.

### Avoid (problems found)

1. **Length.** Royal Red (20,095 chars), Luxury (24,380) and Elegance (23,526) are 4–5× over Wan's 5,000 limit; the 19 Quick passed prompts are ~32,000 each. Royal Red is registered in Premium Balance with its 20 KB `prompt.txt`, so it will fail validation with `PROMPT_TOO_LONG`. Only `prompt-wan-v3.txt` (4,819) fits. Long prompts were written for Google Flow / Seedance and must not be reused for Wan.
2. **Fixed image numbers.** "IMAGE 2 = dress, IMAGE 3 = jewellery" breaks when a customer supplies 1 vs 3 dress views. Describe position by role: first image, the images after it, the last image.
3. **Instructions Wan cannot act on.** Elegance asks for 1920×1080, 30 fps, "preserve the original source music". Resolution, fps and audio are API parameters / finishing steps, not prompt content. Drop them.
4. **Asking the model to rotate or reframe** (Elegance: sideways portrait → landscape). Fix orientation with ffmpeg during preparation; the prompt then says "keep VIDEO 1's framing".
5. **Rich jewellery from the source bride or a global sheet** (`bridalReferenceRules.js`, `bridalOrnamentsPrompt.js`). For Premium Wan templates, jewellery comes from the database, else minimal. Never copy the source woman's jewellery.
6. **Repetition.** The long prompts restate the same negative in 5–10 places. Say each rule once, precisely.

---

## 3. Inputs and roles for a Premium Wan template

| Role | Source | Controls | Never controls |
|---|---|---|---|
| `VIDEO 1` | 10–15 s clip prepared from the Instagram video; new default is 15 s | motion, expressions, gaze, hands, poses, camera, framing, shot order, cuts, timing, slow motion, environment, lighting | face, outfit, dupatta design, jewellery |
| `BRIDE` image | Customer upload (dynamic), always first | face, skin tone, facial proportions, hairline | clothing, jewellery, pose |
| `DRESS` images | Upload or Dress Gallery (dynamic). Full front mandatory; detail/side/rear optional; all are ONE garment | dress colour, silhouette, neckline, sleeves, embroidery, borders, fabric, matching dupatta | body, mannequin, background |
| `JEWELLERY` image | Database (dynamic), last image, only when found | exact pieces, stones, metal, placement | face, dress, background, stand/box |
| — none — | Jewellery lookup failed or empty | minimal jewellery rule (section 6) | — |

---

## 4. Prepare each Instagram video

Use only videos the owner has the right to use (including the music). Download public posts only, with the official `yt-dlp` release — no cookies, no login, no private content.

1. Record the link in `backend/assets/premium-wan-intake.txt`.
2. Download with metadata into its own folder:
   ```
   yt-dlp -f "bv*+ba/b" --merge-output-format mp4 --write-info-json \
     -o "backend/assets/premium-wan-intake/%(id)s.%(ext)s" "<instagram url>"
   ```
   Treat downloads as untrusted data; never run anything from that folder.
3. Inspect with ffprobe: duration, displayed width/height **including rotation metadata**, fps, audio stream. Watch the whole clip and the frames around every cut. Do not describe actions from a thumbnail or caption.
4. Choose the window that holds the defining action. For new templates, use 15 seconds when the source has at least 15 usable seconds. If the complete usable source itself is between 10 and 15 seconds, preserve its natural duration rather than speeding it up, padding it or inventing action. The three existing Premium templates numbered 22–24 stay at 10 seconds. Avoid end cards and text overlays where possible, and record the source start time.
5. Write the shot list from the real clip: start/end per shot, the action inside each second (gaze, head turn, hand, smile, veil lift, turn direction), camera size/height/move, transition type, speed (real-time or slow motion), lighting.
6. Build the template folder `backend/assets/premium-wan-NN/`. Use the real prepared duration in the reference filename (`reference-15s.mp4` for the normal new-template path):
   ```
   ffmpeg -ss <start> -i <source>.mp4 -t <duration> -an -vf "<rotate/scale if needed>" -r 24 \
     -c:v libx264 -crf 18 -movflags +faststart reference-<duration>s.mp4
   ffmpeg -ss <start> -i <source>.mp4 -t <duration> -vn -c:a aac -b:a 192k music.m4a
   ffmpeg -ss <recognisable moment> -i <source>.mp4 -frames:v 1 template-thumbnail.jpg
   ```
   Orientation: 9:16 sources stay 9:16 (e.g. `scale=720:1280`), 16:9 stay 16:9. A 1:1 or 4:5 post is padded or cropped to 9:16 **here**, never by the prompt. Apply `transpose` here if the clip is stored sideways.
7. Save `prompt.txt` (section 5) and `notes.md` (source URL, shortcode, start offset, exact duration, shot list, orientation decision, audit results).

Wan's current API duration choices are discrete: 10 or 15 seconds in this range. A natural source ending strictly between them can still be prepared and prompted honestly, but it must not be registered as an unsupported 11–14 second API duration. Before integration, the owner must choose either an exact 10-second cut or a 15-second generation treatment for that case.

---

## 5. Write the prompt

### Hard rules

- **≤ 4,500 characters** for `prompt.txt` (Wan rejects > 5,000; the rest is reserved for the jewellery block and attached-image map the backend injects). Count with `node -e "console.log([...require('fs').readFileSync(process.argv[1],'utf8').trim()].length)" <file>`.
- Plain text, English, no markdown tables, no filenames, no resolution/fps/audio instructions.
- Roles by name and position (first image / following images / last image), never fixed image numbers.
- Every timeline timestamp comes from the actual duration-labelled prepared reference.
- One rule, one place. No repeated negatives.
- Contains the literal placeholder `{{JEWELLERY_BLOCK}}` exactly once (section 6).
- Describe only what is in the clip. No added shots, petals, smoke, sparkles or camera moves that VIDEO 1 does not have.

### Skeleton (≈2,900 characters of fixed text; fill the `{{…}}` parts)

```
PROJECT: LADIES PLANET — {{TITLE}}
MODEL: WAN 3.0 PRIME | {{ACTUAL DURATION, normally 15 SECONDS}} | {{9:16 VERTICAL or 16:9 LANDSCAPE}} | SILENT

OBJECTIVE
Recreate VIDEO 1 shot for shot with a different bride. Replace only three things: the woman's identity, her complete outfit and her jewellery. Everything else in VIDEO 1 stays the same. This is subject-and-wardrobe replacement, not a new concept and not an unchanged copy of VIDEO 1.

REFERENCE ROLES
VIDEO 1 = motion, expressions, gaze, hand and finger positions, poses, camera angle and movement, framing, shot order, cuts, timing, slow motion, environment and lighting. Never use its woman's face, outfit, dupatta or jewellery.
FIRST image = the BRIDE. Facial identity only.
FOLLOWING images = the DRESS. All views show ONE garment and its matching dupatta.
Jewellery reference: see section 5.

1. FACE IDENTITY
The bride is the woman in the BRIDE image in every frame, not a similar woman. Preserve face shape and proportions, eyes and spacing, eyebrows, nose, lips, cheeks, jaw, chin, forehead, hairline, skin tone, natural asymmetry and skin texture. Never blend or alternate with VIDEO 1's woman. The face follows every head turn, tilt and light change; no pasted or floating face, no seams, no beauty filter. Ignore the BRIDE image's clothing and accessories.

2. MOTION AND SHOT TIMELINE
{{one line per shot: "0.0–2.1s: framing; action second by second; camera move; transition out."}}
Match VIDEO 1's speed and cut points exactly. No extra shots, poses, gestures or camera moves.

3. EXACT DRESS AND DUPATTA
The DRESS images are the only authority for the outfit: colour, silhouette, neckline, sleeves, bodice, fabric, embroidery motifs and placement, borders and construction. The matching dupatta from the DRESS images is mandatory; VIDEO 1 decides only how it moves and is held. Never reuse VIDEO 1's outfit or dupatta. Unseen areas stay plain and consistent, not invented.

4. NO MANNEQUIN
Take only the garment from the DRESS images. Ignore any mannequin, stand, hanger or display bust. Zero mannequin parts or white plastic patches on the bride; natural human body, skin and proportions.

5. JEWELLERY
{{JEWELLERY_BLOCK}}

6. ENVIRONMENT
{{one or two lines naming the real setting, e.g. "Sunlit palace courtyard, carved sandstone arches, warm afternoon side light."}} Keep VIDEO 1's background, architecture, lighting, colour grade, depth of field and framing. No new people, props, text, logos or effects.

7. CONTINUITY
Same face, dress, dupatta and jewellery in every frame. Realistic hands with five fingers, natural fabric weight and folds. No flicker, morphing embroidery, colour shifts, floating jewellery, distorted limbs, watermark or captions.

PRIORITIES: 1) VIDEO 1 shot sequence and motion. 2) Bride face identity. 3) Exact dress and dupatta. 4) No mannequin. 5) Jewellery rule. 6) Natural anatomy and continuity.
```

Keep the timeline and environment to about 1,400 characters combined. If a source has more cuts than fit, merge repeated holds rather than dropping the defining action.

---

## 6. Jewellery: database first, minimal fallback

`{{JEWELLERY_BLOCK}}` is replaced at generation time by exactly one of these blocks.

**A. Jewellery found in the database** (the jewellery image is attached as the LAST image):
```
The LAST image is the JEWELLERY reference. Reproduce its exact pieces, design, stones, colours, metal finish, size and placement on the bride. Wear only those pieces; do not add others. Ignore its stand, box, model and background. Never copy VIDEO 1's jewellery. Ornaments stay attached and identical in every frame.
```

**B. No jewellery found or the lookup failed** (no jewellery image attached):
```
No jewellery reference is attached. Use minimal, delicate bridal jewellery only: small stud or small drop earrings, one fine thin necklace or none, a few thin bangles. No heavy choker, maang tikka, matha patti, nath or layered sets. Never copy VIDEO 1's jewellery. Keep the same minimal pieces in every frame.
```

Lookup order (proposed contract — confirm with the owner before implementing):
1. Jewellery explicitly chosen or uploaded for this creation.
2. Jewellery linked to the selected dress, e.g. `dresses.metadata.jewellery.image_url`.
3. Nothing found, URL unreachable or not an image → block B, and attach **no** jewellery image.

Never attach a jewellery image without block A, and never send block A without the image.

### Current platform gaps (must be fixed before these templates can generate as specified)

- There is **no jewellery catalogue table** today. The only jewellery fields are `videos.jewellery_image_url` / `jewellery_style` (legacy flow). `dresses.metadata` (jsonb) is the nearest place to link jewellery to a dress.
- `studioVideoService.render()` always pushes `backend/assets/global/bridal-ornaments-reference.png` for Higgsfield routes. That contradicts the minimal fallback, and **the file is not in this working copy** (`backend/assets/global/` does not exist), so a Premium render would fail when it reads it.
- `{{JEWELLERY_BLOCK}}` substitution does not exist yet. Until it does, a prompt containing the placeholder must not be published as available.

---

## 7. Integrate

1. Folder `backend/assets/premium-wan-NN/` with the duration-labelled reference (normally `reference-15s.mp4`), `music.m4a`, `template-thumbnail.jpg`, `prompt.txt`, `notes.md`. Template numbers 22–24 are the existing 10-second set; new templates start at **25** and normally use 15 seconds. IDs: `PREMIUM_WAN_01…07`.
2. Register in `premiumBalanceScenes` (not Budget), Bride only:
   ```js
   { id: 'premium-wan-01-<slug>', label: '<Name>', category: 'pre-wedding' | 'wedding' | 'post-wedding',
     description: '<one line>',
     subjects: { solo: { available: true, label: '<Name>', templateId: 'PREMIUM_WAN_01', templateNumber: 25,
       version: 'premium-wan-v1', prompt: readFileSync(<prompt.txt>, 'utf8').trim(), verbatimPrompt: true,
       duration: 15, aspectRatio: '9:16', sound: false, useSourceAudio: false, musicPath: <music.m4a>,
       sourceVideoPath: <reference-15s.mp4>, sourceAspectRatioPath: <reference-15s.mp4>, sourceFilename: 'reference-15s.mp4',
       thumbnailPath: <template-thumbnail.jpg>, referenceImagePath: <template-thumbnail.jpg>, referenceImagePaths: [],
       jewelleryMode: 'database-or-minimal' }, couple: { available: false } } }
   ```
   Push it **after** the retirement loop in `studioVideoConfig.js` (line ~254). Anything in `premiumBalanceScenes` before that loop whose `version` does not end in `-v2` is forced to Coming soon.
3. Do not add it to `budgetScenes` unless the user asks.
4. Restart the backend and check the live `/templates` config and the Premium > Balance card (thumbnail, Bride only, portrait/landscape) before saying it is integrated.

---

## 8. Checks before asking the owner to spend credits

- [ ] `prompt.txt` ≤ 4,500 characters; with the longer jewellery block (A) it is still ≤ 5,000.
- [ ] Timeline timestamps match the prepared reference through its exact final timestamp; shot count matches the clip; no invented actions.
- [ ] New default: `reference-15s.mp4` is exactly 15 s, upright, 9:16 or 16:9, with no audio track; `music.m4a` matches its exact duration. For an owner-approved natural 10–15 s exception, prompt, notes, reference and music all agree on the same duration.
- [ ] Prompt has no fixed image numbers, filenames, resolution, fps or audio instructions.
- [ ] `verbatimPrompt: true`, Balance catalogue, Bride only, `{{JEWELLERY_BLOCK}}` present once.
- [ ] Both jewellery paths tested at quote level (`get_cost`): with a DB jewellery image and with none.
- [ ] Give the owner the exact prompt and file paths first; generate only on their request.

## 9. Review the output honestly

A prompt cannot guarantee an identical face, dress or motion. After a generation, check and report separately:
- Face: same woman as the BRIDE image in close-ups and turns; no blend with the source woman.
- Dress and dupatta: colour, neckline, sleeves, embroidery placement, borders match the DRESS images; no source outfit, no mannequin remnants.
- Jewellery: matches the DB piece, or is minimal when none was supplied; never the source woman's set.
- Motion: same shot order, cuts, actions and camera as VIDEO 1.
- Finishing: duration, ratio, music aligned.

A template is **Passed** only when the owner says that specific output is satisfactory. Registration, a passing audit or a successful quote is not a pass.

---

## 10. Batch of 7 — fast path

For each video: download → inspect every shot → prepare the 15-second reference by default (or preserve an owner-approved natural 10–15 second source) with matching `music.m4a` and thumbnail → write `notes.md` shot list → fill the skeleton through the exact final timestamp → count characters → owner reviews prompt → register after the retirement loop → verify card in the running UI → owner-approved test generation → face/dress/jewellery/motion review.
