# Ladies Planet — developer handover

This is a fresh source export from the working local project on 17 October 2026. It has no previous Git history, live environment files, OAuth tokens or customer records. It is not a production-ready deployment bundle until the media and production configuration below are completed.

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

Open http://127.0.0.1:3002/studio/cinematic. Vite proxies /api to the backend on port 5050. Production must provide its own API routing and HTTPS.

## Current models

Quick: Wan 3.0 Prime, locked 480p. Premium: Wan Prime (default) or Seedance 2.5 Edit. Flagship: Genjutsu. Custom: Wan Prime (default) or Seedance Edit. Images: GPT Image 2 medium, 1K/2K. All active Studio routes use Higgsfield MCP/OAuth. Legacy provider code remains present and is not the active tier route.

Model routing lives in backend/services/studioGenerationRoute.js, studioModels.js and studioHiggsfieldService.js. Exact user-approved Royal Red Bride prompt lives in backend/assets/royal-red-garden/prompt-wan-v3.txt. Do not silently rewrite approved prompts.

## Media and records

handover/MEDIA-MANIFEST.json lists excluded media with relative paths, sizes and SHA-256 checksums. The separate ladies-planet-media-handover-2026-10-17.zip contains these files; extract it into this repository root to restore their relative paths before starting. studioVideoConfig.js reads some assets during startup. Transfer the archive privately, not in ordinary Git. Source media remains in the original local project.

backend/data is deliberately excluded because it mixes user data, OAuth credentials, local videos and template overrides. Do not copy it wholesale or commit it. The developer must arrange an approved, selective migration of studio-templates.json, studio-experiences.json, completed videos and related records if the existing history is required. OAuth files must be created again through sign-in. The blank installation does not include the previous History library.

No paid generation was run to prepare this export.
