# Ladies Planet — current source release

Updated from the working project on 23 October 2026, preserving this repository's existing history. Includes the latest frontend/backend code, Ultra Fast prompts, illustrated template cards, security hardening, deployment files and optional integrations. Live environment files, credentials, OAuth state, customer records, source media, generated history and installed dependencies are deliberately excluded.

**Not an approval to launch production.** Read [the current launch checklist](deploy/LAUNCH-CHECKLIST.md) before hosting. Credential rotation, deployment acceptance and unresolved regression failures still need review. The older handover documents below are background and are superseded by current source/environment examples and this checklist.

Read [the developer guide](handover/DEVELOPER-GUIDE.md) and [the owner's GitHub steps](handover/GITHUB-STEPS.md).

## Local startup

Use Node.js 24 LTS (the source was checked locally with Node 24.15). In separate terminals:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
# Fill .env privately, restore required media, then:
npm start
```

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
# Fill public Supabase URL/anon key, then:
npm run dev -- --host 127.0.0.1 --port 3002
```

Open http://127.0.0.1:3002/studio/cinematic and sign in with an approved active staff account. Vite proxies /api to the backend on port 5050. Authentication is mandatory by default, including on localhost. Production uses one HTTPS origin for the frontend and API. See Dockerfile and deploy/Caddyfile; keep backend/data on a private persistent disk and run one backend instance.

## Current models

Ultra Fast: Grok Imagine 1.5, images plus written shot plans only; source videos are not generation references. Quick: Wan 3.0 Prime, fixed 480p. Premium/Custom: Wan Prime or Seedance 2.5 Edit. Flagship: the configured Genjutsu variant (currently Lite by default; see FLAGSHIP_VIDEO_VARIANT). Images: GPT Image 2, landscape 2K Medium. Exact supported settings and routing are defined by current code, not this short summary. Legacy provider code remains present but is not the active Studio route.

Model routing lives in backend/services/studioGenerationRoute.js, studioModels.js and studioHiggsfieldService.js. Exact user-approved Royal Red Bride prompt lives in backend/assets/royal-red-garden/prompt-wan-v3.txt. Do not silently rewrite approved prompts.

## Media and records

[handover/MEDIA-MANIFEST-2026-10-23.json](handover/MEDIA-MANIFEST-2026-10-23.json) lists current excluded media/assets with relative paths, sizes and SHA-256 checksums. Arrange a private transfer of required reference assets and saved music from the owner before exercising templates. The older 17 October media archive is not complete for this release. Do not upload customer photos, source reels or OAuth files to GitHub. Source media remains in the original local project.

backend/data is deliberately excluded because it mixes user data, OAuth credentials, local videos and template overrides. Do not copy it wholesale or commit it. The developer must arrange an approved, selective migration of studio-templates.json, studio-experiences.json, completed videos and related records if the existing history is required. OAuth files must be created again through sign-in. The blank installation does not include the previous History library.

No paid generation was run to prepare this export. One obsolete credential-bearing database diagnostic was excluded, and legacy signed media URLs in scenePrompts.js were replaced with environment references in this release copy. This does not rotate previously exposed credentials or remove secrets from unrelated older repositories.
