# Hosting and acceptance guide

## Ownership and access

Client should own GitHub, hosting, domain, Supabase and Higgsfield billing. Give the developer a collaborator role, not sole ownership. Obtain production secrets privately. Never put Supabase service-role keys or OAuth tokens in frontend variables.

## Production work required

- Deploy frontend build (npm ci && npm run build; output frontend/dist) and a continuously running Node backend (npm ci && npm start). Use a reverse proxy/TLS or separate API domain. Static hosting alone does not run this backend.
- Configure HOST=0.0.0.0 behind the host's proxy where required. server.js currently defaults to 127.0.0.1 and has a localhost CORS allowlist: update it for the exact production frontend origin.
- For a separate frontend origin set VITE_API_URL to the complete backend /api URL at build time, for example https://api.example.com/api. Configure SPA fallback routing.
- Set NODE_ENV=production and verify real staff authentication. Local-development access bypass must never be publicly deployed with NODE_ENV=development.
- Review Supabase migrations/bootstrap SQL before running anything. Do not blindly rerun schema files on an existing client database. Check policies, storage access and backups.
- Restore referenced assets from the manifest. Verify all fs.readFileSync startup paths. Template prompts are included, binary assets are not. Configure stable asset locations rather than Windows absolute paths.
- Persist backend/data securely. OAuth client/tokens/pending state and application stores currently live there. Use restricted permissions, encrypted backups and a deliberate migration path. Do not use ephemeral disk for production history or tokens.
- Configure HIGGSFIELD_OAUTH_REDIRECT_URI to the hosted HTTPS /api/higgsfield-oauth/callback URL and reconnect the client-owned Higgsfield account. Existing localhost OAuth registration is not automatically transferable.
- Keep HIGGSFIELD_SPEND_ENABLED=false initially. A clicked Generate with a valid quote is still per-request approval; false alone is NOT a universal spending lock. Do not click Generate during unapproved testing.
- Verify FFmpeg availability. Long generation polling and background workers currently run in the Node process; in-memory quotes, upload caches and running jobs do not survive restarts. Use a single instance for initial staging; durable queue/database coordination is needed before multi-instance scaling.
- Custom uploaded-reference staging currently uses an in-memory ID map with a 24-hour lifetime. Restart clears it; users must re-upload. Production durable staging/cleanup is pending.
- Local owner showcase routes return no films in production. Migrate approved showcase films into authenticated production history if the client needs them.
- Required optional legacy tools/integrations are not bundled in this fresh export. Inspect runtime imports before removing packages or enabling old providers. No Google Flow browser worker is needed for the active Studio MCP route.

## Prompt and model caveats

Wan Prime MCP rejected a 19,208-character prompt with an explicit 5,000-character limit, while website history contains longer successful prompts. The platform now validates the observed MCP limit. Do not claim a universal provider limit or bypass it silently. Royal Red Bride has the owner's exact 4,764-character replacement. Several other older prompts remain longer and will be blocked for Wan; review with owner approval. Seedance Edit follows source video duration/aspect rather than output controls. No model's quality or identity accuracy is guaranteed by a prior test on another model.

## Checks before handover

Run npm run build in frontend. Targeted backend checks:

```powershell
node --test tests/higgsfieldSubmission.test.js tests/studioPromptValidation.test.js tests/studioPresetQuote.test.js tests/studioHiggsfieldRouting.test.js tests/higgsfieldJobState.test.js
```

The broad legacy test suite contains outdated Google Flow expectations; investigate failures rather than assuming all tests represent the active routing. Test login/authorization, dress and bride upload, template sources, price-only quotation, declined preset handling, provider rejection, timeout/no-duplicate submission, job-ID persistence, restart/recovery, player/downloads and hover metadata. Only after explicit owner approval run one paid end-to-end generation. Staging acceptance is required before client production access.

## Known release status

Frontend build and targeted routing/error tests passed in the original workspace. This clean export has not been deployed or fully exercised on a new machine; it requires media restoration and private environment setup. Browser visual verification was unavailable in the agent's current Work settings. Billing-plan/top-up dashboard was discussed but not implemented. Existing failed jobs were not regenerated. No uptime or never-fail guarantee is appropriate for an external generation service.
