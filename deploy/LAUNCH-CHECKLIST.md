# Hosting handover — 22 October 2026

Latest hardening additions and verification are recorded in `LONG-TERM-OPERATIONS.md` and `HARDENING-VALIDATION.md`. They add OAuth encryption, bounded queues, private output archival, graceful shutdown, readiness checks and a single-instance Compose deployment. The older validation counts and Docker file-selection details below describe the previous pass.

## Launch decision: NOT YET approved

Code hardening is not a zero-bug or zero-failure guarantee. Do not publish the old ZIP. Use this updated source and complete the account/server checks below.

## Completed in code

- Removed unconditional mock-admin authentication. Missing NODE_ENV fails startup; explicit production requires essential security settings and HTTPS URLs. Local bypass is off by default, development-only, and rejects forwarded requests.
- Authenticated users must exist in the boutique users table and be active. Protected videos, images, dresses, brides, storage, configuration, thumbnails and generated media.
- Owner-only staff management, staff registration/sync, MCP connection management, destructive maintenance and template/default edits. Removed GET maintenance mutations.
- Seedance smoke-test route disabled. No anonymous paid-generation route.
- Helmet security headers, bounded JSON/form requests, request rate limits, 120 MB aggregate multipart ceiling, CORS allowlist from FRONTEND_URL. Only explicitly trusted proxy networks affect client IPs.
- Generated-video cookies are HTTP-only, Secure in production, SameSite Strict, ten-minute expiry, read-media-only scope. Active staff membership is checked again on media reads. Studio renews them; logout clears them. Use one same-origin HTTPS domain.
- Cached/single-flight MCP balance calls; concurrent token refresh is single-flight. OAuth state expires after ten minutes and is consumed before exchange. Removed callback error HTML interpolation and query strings from access logs.
- Private/local network remote-media downloads blocked, including DNS-resolved targets and redirects. HTTPS only. Google Drive landing proxy now allows only fixed existing marketing IDs, not arbitrary files.
- Template cards use scene-specific vector illustrations, not real people or extracted source photos. Source assets used for other models' motion/audio remain unchanged.
- Ultra Fast remains images-only: written shots plus customer photos. Source videos are not sent to Grok.
- Docker production image excludes tests, scripts, EXEs, logs, local secrets, OAuth files and old photographic card assets. Runtime uses non-root user; development watcher is excluded.
- Anonymous QR photo upload disabled in production pending a secure, expiring upload-session implementation.

## Owner/developer actions before internet exposure

- [ ] Rotate previously exposed database password, Supabase secret/service-role credentials and S3 credentials in their dashboards. Update server secrets. Never paste them in chat. Revoke old OAuth tokens if exposed and reconnect. Rotation, not deleting Git history alone, invalidates exposed credentials.
- [x] Read-only RLS/storage audit: all seven checked application tables have row security enabled, no public-schema policies were found for those tables, and the sole ladies-planet bucket is private. No qr-uploads bucket exists in this project. Recheck Security Advisor and any future policies before launch; application changes cannot revoke policies created later.
- [ ] Confirm owner UUID and approved active staff accounts; disable public Supabase signups. Create the first owner safely in Supabase, not by reopening registration.
- [ ] Configure all production environment values from backend/.env.example. Set NODE_ENV=production, HOST=0.0.0.0, PORT=5050, ALLOW_LOCAL_DEV_AUTH=false. Use a fresh random MEDIA_SESSION_SECRET (32+ characters). FRONTEND_URL is the exact HTTPS origin. HIGGSFIELD_OAUTH_REDIRECT_URI must match the publicly registered HTTPS callback.
- [ ] Choose one persistent Linux server/container instance, not Vercel/Lambda for this backend. Mount /app/backend/data with restrictive permissions, encrypted backups and a tested restore. Do not autoscale file-backed state across replicas. Quotes/upload caches are intentionally short-lived; restart requires re-quoting/re-uploading. Saved jobs survive but interrupted work requires safe recovery, not blind resubmission.
- [ ] Transfer required backend/data media/history and reviewed template assets over a secure channel if the hosted platform must show existing results. Do not distribute OAuth/token data in ZIPs or Git. Reconnect the owner account on the server instead.
- [ ] Point an owned domain at the server. Put Caddy/Nginx in front with TLS. Expose only 80/443; bind/publish backend port only to loopback. Use TRUSTED_PROXY_CIDRS=127.0.0.1/32,::1/128 only when the proxy actually connects over host loopback. Container deployments need their exact proxy network instead.
- [ ] Build using Dockerfile with the PUBLIC VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY build arguments. Never supply service-role keys as VITE variables. Backend serves the SPA and API on one origin; /studio direct navigation works. /api/video landing Drive function is not included in this image: use licensed static marketing clips or poster fallbacks.
- [ ] Configure provider rights, music rights and customer consent. Keep HIGGSFIELD_SPEND_ENABLED=false until owner-approved generation testing.
- [ ] Test signed-in owner/staff login, inactive-account denial, upload, private-media playback/seeking, logout, each intended model route, music finishing, database/storage access and one owner-approved end-to-end generation on the actual HTTPS deployment. No paid test was authorized by this hardening task.
- [ ] Add uptime/error/disk-space monitoring, daily backups, single-instance restart policy and spending alerts. An external provider can still expire sessions or fail; owner reconnection must be available.

## Current scope limitations

This is one boutique's shared staff workspace, not a multi-tenant SaaS. All active staff can view shared boutique history; owner-only controls protect account setup. Rate limits are in memory and reset on restart. Provider jobs are not automatically duplicated after uncertain submissions. No load test, independent penetration test, live RLS audit, Linux Docker build, hosting deployment, credential rotation or paid generation is implied by local automated tests. Google Flow browser-worker routes require their own persistent secured worker; the default production image does not ship that desktop worker. Legacy external callbacks are not public; do not enable them without signature verification.

## Verification results

- Frontend production build passes.
- Focused backend checks: 18 passed (production SPA boot/deep links, authentication/proxy isolation, owner access, scoped media cookie, body limit, SSRF rejection, eight-view garment evidence, image-only Grok routing, uncertain paid-submission handling, local music merge).
- Frontend checks: all 17 passed, including the office-only timer gate.
- Live localhost: health 200; anonymous config/media/dress/image/user requests 401; Seedance test route 404; frontend 200. Authentication is now required locally too.
- Complete dependency audits now report zero known vulnerabilities in backend and frontend. Removed nodemon entirely and use Node's built-in watch mode; this supersedes the earlier development-watcher warning.
- Full backend regression suite is NOT green: the bounded run reported 70 passing / 44 failing; one newly affected synthetic media fixture was then updated to a valid HTTPS test URL and passes, leaving 43 unresolved failures. These include old Flow/template/model expectations, missing legacy modules and incomplete mocks. They need triage, not blanket test deletion. Do not confuse focused security passes with a full platform acceptance pass.
- Docker CLI is installed but the Linux Docker engine is not running, so the production image could not be built here.
- Production UI defaults to client-friendly labels; office testing can still be explicitly enabled. All published template preview URLs now resolve to vector artwork; prompts and provider reference assets are not replaced by artwork.
- Existing Windows absolute paths in saved job metadata may need rebasing when moving history/media to Linux. Preserve original state backups and verify every historical file you intend to retain.

Useful official references: https://expressjs.com/advanced/best-practice-security/ and https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd
