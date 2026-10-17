# Budget Speed prompt integration workflow

This is the user-approved reusable workflow for future bridal templates. Read it before analysing a new reference video or integrating a Budget Speed prompt. The user supplies a video; derive a prompt, scene stills and music from it, then integrate and verify the template in the running platform. Do not treat this document as evidence that any new template has already been tested.

## 1. Inputs and their roles

- Reference video: study its chronological shots, actions, emotions, camera movements, scene changes, atmosphere, crowd and motion speed. It supplies cinematic direction, not the bride's identity or outfit.
- Bride image: supplied dynamically for each generation; the sole authority for the bride's face, skin tone and recognizable features.
- Dress images: supplied dynamically from uploads or Dress Gallery. One clear full-length front view is mandatory. Close-ups, side/rear views and additional angles are optional, with a variable image count. All views describe the same selected garment.
- Dress sheet: include a supporting contact sheet when available, alongside individual photos. Individual full-front images retain usable detail; never render the sheet itself as the output.
- Groom image: required for a bride-and-groom template; determines the groom's distinct identity.
- Scene stills: extract the first usable clear frame of each actual shot. Include complete relevant stage/interior, people arrangement and ambience; a ceiling-only crop is insufficient. They define composition, surroundings and action, not anyone's face or clothing.

## 2. Analyse the supplied video

1. Verify the local file exists, inspect duration and aspect ratio, and view the complete clip plus frames around each cut and important action. Do not invent actions from a filename or one thumbnail.
2. Record shot start/end timestamps and the action progression within each second: gaze, head turn, hand movement, gesture, kiss or other visible action, expressions and partner response.
3. Describe framing, camera height/angle, movement direction, push-in/orbit/tracking, focus, lighting, colour, crowd, decor, smoke and fabric motion when present.
4. Preserve the reference's slow-motion feel and distinct transitions. Use realistic motion descriptions; percentages describe the intended feel, not a guaranteed model setting.
5. Adapt the sequence to 10 seconds while preserving the source video's aspect ratio: portrait 9:16 remains portrait, landscape 16:9 remains landscape unless the user explicitly requests another format. Preserve the source's actual shot count where feasible; compress repeated angles/holds to retain the defining action and emotion. Do not add arbitrary shots to satisfy a generic prompt formula.
6. Keep source-video faces out of the identity instructions. Supporting people can recreate a crowded celebration using new, distinct faces rather than the source people's identities.

## 3. Build the prompt

Write a detailed plain-text prompt with:

1. Output duration, aspect ratio, silent visual generation and overall cinematic intent.
2. Reference-role mapping: BRIDE_IDENTITY, GROOM_IDENTITY when needed, DRESS_FRONT, optional DRESS_DETAIL/SIDE/REAR images, and SCENE_01/02/etc.
3. Identity and garment requirements: preserve the bride's recognizable face shape, eyebrows, eyes, nose, lips, jaw, skin tone and natural texture; preserve dress colours, neckline, sleeves, silhouette, embroidery placement, border widths, fabric and dupatta. Never borrow identities or outfits from scene stills or the source clip.
4. SHOT-BY-SHOT EFFECTS TIMELINE: timestamped actions, emotion, camera movement, motion speed and explicit entry/exit transitions for each scene, with within-shot second-by-second progression where needed.
5. Continuity requirements across cuts: same bride/groom, same garment, realistic hands, coherent lighting and anatomy; no generic substitute dress, face blending or endless walking replacing the planned story.
6. MASTER EFFECTS INVENTORY, EFFECTS DENSITY MAP and ENERGY ARC, describing only effects actually requested or supported by the reference.

The user's target is an identical bride and identical selected dress. Treat that as the acceptance criterion, not a claim that a prompt can guarantee 100% fidelity. Review output faces and garment details; model drift is a failed quality check even if generation technically succeeds.

## 4. Attach actual assets dynamically

- A filename written in the prompt alone does not attach an image. Resolve and attach actual Flow assets, then bind the prompt to their exact names and roles.
- Keep bride, groom, dress views and chronological scene stills in a stable order. Support one dress image as well as multiple views without hardcoded image counts.
- Budget Speed uses photos/scene stills; do not upload the source video as a generation reference. Keep the source clip locally for analysis and music extraction.
- Pre-upload reusable dress and template scene assets to the configured Flow project where supported. Reuse verified saved asset names; invalidate mappings when files, project or account change.
- Upload new assets together if Flow's picker accepts multiple files. Use individual upload fallback where necessary. Wait for every requested asset and verify attachment roles/count before submitting.
- Preserve required provider rights confirmations; reuse previously confirmed assets where possible rather than bypassing notices.

## 5. Music and output

- Extract the original music once during template preparation, using the supplied clip the user has permission to use. Save it with the template.
- Generate silent visuals in Flow. Add the saved original audio automatically in backend finishing, using a documented audio start offset and matching the final duration. Do not ask the generator to recreate the song.
- Present the finished 720p preview first. User clicks Upscale to request the 1080p final; retain music and the preview during upscaling.
- Verify dimensions, duration, audio and finishing success before marking ready. Preserve the provider download and saved provider ID so finishing or upscale failures can recover without another generation.
- Do not confuse visible-logo processing with removal of invisible provenance. Do not promise no future provider errors or guaranteed generation time.

## 6. Integrate and verify

1. Give the template an apt name, unique ID and number. Choose Pre-wedding, Wedding or Post-wedding and Bride only or Bride & groom based on the actual story.
2. Save its editable prompt, chronological scene stills and extracted music in the backend template assets folder.
3. Register it in the Budget Speed configuration and template service with the correct supported subjects, duration, ratio, prompts and references.
4. Ensure it appears as a populated template card in Budget > Speed > the selected output. Show Bride only or Bride & groom on the card and request the relevant uploads automatically; no separate subject-category buttons. Use a recognizable moment from its own source video as the thumbnail, show an AI badge, source filename and correct portrait/landscape format. Avoid empty placeholder cards.
5. Provide a separate image prompt only where image generation is offered; video-only must not require an intermediate generated image.
6. Build changed code, load it into the running backend/worker and check the live configuration. Verify UI visibility before saying integration is done.
7. Distinguish code/build verification, live attachment verification and successful generation/quality review. Report anything still unverified.
8. Do not submit a paid demo unless the user requests a generation/test. When authorised, record preparation, provider generation and finishing/upscale times separately where possible.

## 7. Fast repeat workflow

### 2026-10-14 reference-role and lookup update

- Jewellery authority is the original bride in the cinematic reference video
  or scene images. Transfer her ornaments and arrangement; customer identity
  photos govern the face only, and dress uploads govern the garment only.
  Require rich bridal styling and consistent ornaments across shots.
- Read the original clip's displayed orientation (including rotation metadata)
  to preserve portrait 9:16 or landscape 16:9 in both Speed and Balance.
- Preserve chronological performance, slow motion, expressions, camera and
  transitions. Treat motion fidelity as a quality requirement, not a guarantee
  of exact model motion transfer.
- Resolve saved assets by opening Flow's composer `@` picker, searching their
  exact saved names and selecting each asset. Verify the resulting ingredient
  chips and count before submitting; plain `@filename` text alone is never
  sufficient. Stable names based on project and file content allow reuse of
  completed local uploads. Probe the same picker for existing uploads, upload
  missing files, and wait for upload readiness. The previous exact-name gallery
  scrolling and ingredient-picker route remains available as
  `attachment_method: "scroll"`. If `@` attachment fails before submission,
  clear the partial composer and retry all references once with scrolling;
  abort without generating unless the final attachment count is exact.

New video -> inspect all shots -> extract scene stills and music once -> write role-bound prompt -> register visible template -> verify running UI -> generate using the customer's bride, optional groom and selected dress.

Reuse the established services and asset cache. A new reference video should not require rebuilding the platform or repeating setup questions already answered in this guide. Respect later user corrections and explicit requests for manual prompt review before integration.

## 8. Google Flow Omni Flash preflight before owner testing

- The active surface is **Google Flow**, not the Gemini API. Confirm the visible model is Gemini Omni Flash 1.1 and select the template's supported duration and original aspect ratio in Flow's settings. Do not infer the model from an internal label alone.
- Before presenting or revising one numbered prompt, run the offline audit from `backend`: `npm run flow:prompt-audit -- --tier budget --mode speed --number 1` (or `--mode balance`). It uses the vendored MIT-licensed `google-flow-scripting-skill` validator as an advisory linter and checks the local reference path. It never submits to Flow.
- Inspect each finding. The upstream validator's style preferences, including its em-dash rule, are **not** Google policy or proof of quality. Resolve genuine issues such as unsupported Flow settings, missing references, or backend-only music instructions before asking the owner to spend credits. Do not rewrite a user-approved shot sequence merely to silence a stylistic warning.
- Give the owner the **exact current inbuilt prompt** and the **local reference file path** first. Propose edits explicitly and update the inbuilt prompt only after agreement. An audit pass does not mean Google accepted the generation or that face, dress, motion, and emotion passed visual review.
- Mark a template Passed only after the owner reports satisfaction with that specific mode, numbered prompt, and output. Keep the original video locally for analysis; Budget Speed still attaches scene stills rather than the source video, while Budget Balance attaches the source video.
