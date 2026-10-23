# Hosting hardening validation — 22 October 2026

## What passed

- Backend reliability/media/submission tests: 25 passed, 0 failed. Includes encrypted OAuth persistence, wrong-key and corruption rejection, concurrent pending OAuth states, callback replay rejection, disconnect-during-refresh, queue overflow/concurrency, production config, production spending pause, owned media archival, metadata-store recovery, real FFmpeg 1080p conversion, soundtrack merging and the existing video-finishing worker tests.
- HTTP security tests: 6 passed, 0 failed. Includes production SPA deep links, anonymous API/media/archived-image denial, owner-status denial, body-size limits, media-cookie scoping, development-bypass isolation and existing template/reference safety checks. These ran with localhost access outside the restricted sandbox; provider calls are mocked.
- Frontend: production build succeeded; all 17 frontend tests passed. No frontend interface redesign was made.
- Syntax checks passed for 13 modified/new runtime modules.
- Docker Compose configuration validates using placeholder settings and a temporary test env file. No real credentials were used for that check.

Run the focused backend checks again from backend with `npm run test:hosting`. On Windows, if the sandbox temp directory refuses atomic renames, set TEMP and TMP to an existing workspace-local test directory. Local HTTP tests need loopback access.

## What did not pass / was not verified

- A broader backend regression run, before the final media archival additions, reported 121 tests, 76 passed and 45 failed. The failures include outdated Flow/template/model assertions, removed test dependencies, incomplete mocks, and sandbox loopback/Node test-runner transport failures. This is NOT a clean full-suite result, and the new focused checks do not replace full acceptance. Do not delete assertions merely to turn this green; review each against the current Higgsfield-only product requirements.
- Docker's Linux engine is not running on this machine. The Docker image was not built or booted here. In particular, verify the image includes the finishing worker, vendor files, licensed required assets and correct Linux native dependencies.
- No live cloud deployment, public-domain OAuth callback, token refresh against Higgsfield, permission/policy changes in Supabase, credential rotation, off-server backup, restore drill, load test, or paid generation was performed.
- Existing customer/history files were not migrated or rewritten. Old expiring media URLs and Windows paths require a reviewed migration; new results archive independently of provider delivery URLs.
- QR upload remains disabled in production until an expiring, scoped upload-session implementation is built and tested.
- Deployment remains single boutique/single instance. In-memory queues are bounded but not distributed/durable brokers. Saved provider IDs support safe manual recovery; unexpected shutdowns can still interrupt work.

## Release gate

Use LONG-TERM-OPERATIONS.md for the manual steps. Keep production spending disabled until the actual HTTPS deployment passes account, private-media, upload, database/storage and owner-approved generation/recovery checks. Verify current account terms permit the intended staff usage. Resolve current-product test regressions before claiming production readiness.

Keep backend, frontend, Dockerfile and deploy files together in a private, versioned release record. The current folder has separate backend/frontend Git repositories and substantial pre-existing uncommitted changes; this hardening task did not commit, reset or discard them. Ensure deployment files and all required assets are included in the private release backup too.
