# Ladies Planet: deployment and long-term operation

This is the existing custom application, running on one Linux server for one boutique. The owner connects one Higgsfield account and active staff use the shared boutique workspace. No production deployment or paid generation is performed by these changes. No source archive contains runtime records or working credentials.

## Changes made in this hardening pass

- OAuth client secrets, access/refresh tokens and pending authorizations are encrypted with AES-256-GCM when HIGGSFIELD_TOKEN_ENCRYPTION_KEY is set. Production refuses to start without a valid key. Existing plaintext connection files upgrade when read with a configured key. Corrupt/wrong-key files fail closed without overwriting the original. Save the key separately: a lost key requires reconnecting, not bypassing decryption.
- Independent, expiring OAuth states support overlapping owner login attempts. Client registration and refresh are single-flight. Disconnecting during refresh cannot recreate the disconnected token file. Owner-only connection controls remain in place. Higgsfield passwords are never collected by Ladies Planet.
- Generation and video-processing queues bound local concurrency. These queues are in memory; existing creation records and confirmed provider IDs remain on disk. Restart marks interrupted work for recovery. This is NOT a distributed job broker, nor a guarantee that every crash window can be resolved automatically. Never blindly resubmit a job whose provider acceptance is uncertain.
- Shutdown refuses new writes and gives active HTTP requests and tracked studio work up to five minutes to drain. Docker grants six minutes; a hard stop may still interrupt long provider jobs. Saved IDs are used for recovery, never automatic paid resubmission.
- /api/health is liveness; /api/ready checks local data-volume write access, disk headroom and maintenance state. It does not check the external provider or assert that the database is reachable. /api/operations/status is owner-only and checks database access, connection metadata and queue counts without generating media or returning tokens.
- The Docker image includes required video-finishing code and vendor files, uses the installed FFmpeg binary, and takes an exclusive flock on the persistent data volume. Do not scale this file-backed deployment to multiple hosts/replicas.
- New completed images and videos are downloaded into the private persistent media directory before they are marked ready. Image delivery uses the authenticated media route, just like video. Old history is not automatically backfilled; expiring old links and Windows paths require review during transfer. A local owned copy still needs off-server backup.
- In production the owner's HIGGSFIELD_SPEND_ENABLED=false switch blocks new studio generation even when a user already holds an approved quote. Read-only recovery of existing provider jobs is separate from submitting a new paid job.

## Manual launch steps

1. Choose a Linux host with Docker Engine and Compose. Start with at least 2 CPU cores and 4 GB RAM, then measure real FFmpeg memory/CPU before selecting a production size. This is a starting configuration, not a capacity guarantee. Keep enough disk for original templates, customer media, working copies and backups; 40 GB free is a sensible initial allowance.
2. Own the domain and point its DNS at the host. Permit ports 80/443 publicly; restrict SSH to trusted operators. Do not expose PostgreSQL or port 5050 publicly. Caddy provisions HTTPS. If 172.29.0.0/24 conflicts with another network, change Compose addresses and TRUSTED_PROXY_CIDRS together.
3. Copy deploy/production.env.example to deploy/production.env. Enter real Supabase public and service-role keys, private bucket name, verified database URL and owner UUID. Disable public staff self-registration in Supabase. Keep RLS and bucket policies private and review them before launch.
4. Generate TWO independent secrets locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`: one for MEDIA_SESSION_SECRET and another for HIGGSFIELD_TOKEN_ENCRYPTION_KEY. Put them in the server secret file, protect it with chmod 600, and keep recovery copies in a password manager. Do not paste secrets into chat. Rotate any credentials previously exposed in logs, source, screenshots or handover archives through their provider dashboards.
5. From the project root run `docker compose --env-file deploy/production.env -f deploy/compose.yaml config --quiet`, then `docker compose --env-file deploy/production.env -f deploy/compose.yaml up -d --build`. Do not print the full Compose config: it contains secrets. Save the image ID and source revision for rollback. Build-time VITE variables are public Supabase identifiers only.
6. Keep one app instance. The app-data named volume contains private records, job state, OAuth files and local media. Never use `docker compose down -v` on this deployment. Existing history is not imported automatically. Transfer reviewed records/media securely; absolute Windows paths need a separately reviewed rebase when moving to Linux. Reconnect Higgsfield on the public domain instead of distributing tokens.
7. Sign into Ladies Planet as the owner, then Connect Higgsfield and authorize on Higgsfield's own domain. The public callback must match its OAuth registration. A localhost OAuth client is not evidence that public redirect registration works. Test connect, refresh, disconnect and reconnect on the real domain. Session revocation can still require manual reconnection.
8. Check owner/staff permissions, inactive-user denial, uploads, history, downloads, video seeking and logout. Inspect authenticated operations status. Then explicitly enable HIGGSFIELD_SPEND_ENABLED and approve small real jobs covering each intended generation mode. Test a restart after a confirmed provider ID and recover without submitting a second paid job. Real generations spend credits.
9. QR capture remains disabled in production pending a signed, expiring, size-limited upload-session flow. Do not bypass the production guard to enable it. Multi-boutique billing, isolated tokens and customer records require additional design and tests; this release is one shared boutique only.

## Backups and disaster recovery

The database, remote object bucket and Docker app-data volume are THREE separate backup targets. Supabase database backups do not replace media backups. Configure daily encrypted off-server backups for all three, and protect the encryption key separately. Keep at least 7 daily and 4 weekly recovery points. Check success/failure notifications every day.

For a consistent file-volume snapshot, use a maintenance window: stop app gracefully with Compose, snapshot/copy the app-data volume using your host's documented backup tooling, and restart app immediately. Proxy can stay running. Do not tar a live changing file tree and call it a verified consistent backup. A storage-provider snapshot must include both JSON records and referenced media. Do not expose backups through the frontend or public bucket.

Once a month restore into an isolated staging host with paid generation disabled. Restore database and media, configure secrets, verify expected records/files and open sample historical media. Never run staging against production databases/buckets. If secrets cannot be restored, reconnect the owner; do not discard customer history. Measure restore time before promising an uptime or recovery SLA.

## Recurring work

Daily: external uptime alert for /api/ready, database/provider connection failures, free disk, failed backups and generation spend. Container health status by itself does NOT restart an unhealthy running process; restart/repair alerts need an operator or hosting monitor. Docker restarts exited processes.

Weekly: check provider usage, failed/uncertain jobs, staff account changes, oldest unfinished jobs, disk growth and backup retention. Reconnect through owner controls if refresh fails. Store new originals, keep useful completed results and archive unused media only after a verified backup and reference check. No automatic customer-media deletion is introduced here.

Monthly: stage Node/dependency/OS/Caddy updates; run the regression suite, build and real-domain smoke tests; snapshot before rollout; retain the previous working image. Review provider model names, parameter limits and pricing. Revoke departed staff. Test restore and periodically rotate secrets using a planned procedure; changing the OAuth encryption key without re-encrypting or reconnecting breaks access to existing encrypted files.

## Availability and exit plan

Your custom source, domain and data can remain portable for years, but no implementation guarantees permanent service or unchanged Higgsfield availability. Keep source/lockfiles and required licensed assets in a private repository, keep deployment documentation current, and back up independently of the hosting account. Maintain billing/payment recovery and a second operator with documented access.

Higgsfield outages, revoked access, model retirement, changed prices or terms can interrupt generation while catalogue/history remain available. Keep provider-specific code behind the existing service layer; switching providers requires its own implementation and output-quality tests. Preserve downloaded completed outputs, not just expiring provider links. Do not promise permanent model availability or automatic provider failover that has not been built.

Hosting, database, domain, storage, monitoring and Higgsfield subscriptions are separate recurring bills. Resource limits bound concurrency, not total spend. Set provider/hosting billing alerts and use a maintenance window for releases. High availability across multiple app servers requires moving file state/locks/queues into shared transactional services first.

## Validation record

See the task's test report. Local tests do not confirm credential rotation, public OAuth registration, Linux image boot, cloud policy correctness, complete migration of old media, load capacity or paid model behavior. Those manual acceptance steps must be completed before public launch.
