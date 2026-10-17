# Owner: manual steps

1. Sign in to the GitHub account that you or your client controls. Create a NEW PRIVATE repository named ladies-planet. Leave README, license and .gitignore unchecked because this folder already contains them.
2. Install/open GitHub Desktop from its official website and sign in yourself. Keep passwords, verification codes and recovery codes private.
3. In GitHub Desktop choose File > Add Local Repository and select the developer-handover-2026-10-17 folder. It is already initialized on main, so do not create a second nested repository.
4. Review Changes. .env files, OAuth tokens, backend/data, node_modules and video files must not appear. Read handover/EXPORT-REPORT.json for excluded files that require developer review. A credential scan is a precaution, not proof that every file is safe.
5. Commit with the message Initial developer handover. Use Repository > Repository Settings > Remote to set the empty private repository's HTTPS URL, then push. Alternatively use Publish repository to create a PRIVATE repository directly instead of step 1. Do not do both and accidentally create duplicates.
6. On GitHub open Settings > Collaborators (or Collaborators and teams), invite the developer's GitHub username and have them accept.
7. Share the private repository URL, media manifest and DEVELOPER-GUIDE.md. Transfer required media through client-controlled private cloud storage. Share secrets via a password manager or hosting secrets interface, never Git.

No repository has been published by this preparation. Do not use git add . in the ORIGINAL frontend repository: it already tracks .env, and an ignore rule does not untrack a committed file. The handover folder uses a fresh history to avoid inheriting that exposure. Have the developer privately review the old repository's history and rotate any privileged credentials if they were previously committed/pushed.
