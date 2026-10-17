# Export security review

Original frontend .env was already tracked in its old Git history. Original backend database source/config/test files contained hardcoded connection strings; scenePrompts.js contained signed private media URLs. This fresh export does not include old Git history or those credentials.

Sanitized replacement backend/db/index.js and backend/drizzle.config.js require DATABASE_URL from the environment. scenePrompts.js is included with signed URL values emptied: legacy wedding-reference constants need fresh authorized assets before enabling those legacy routes. The diagnostic test-db-connection.js was not needed for the app and remains excluded. Do not rerun the export script over the sanitized source without reapplying/reviewing these substitutions.

The owner/developer should privately inspect the original repositories' credential exposure and rotate affected database passwords or other privileged credentials when appropriate. The agent has not changed or revoked live credentials. Do not publish originals just because an ignore file exists.

EXPORT-REPORT.json records the original scan findings before these safe replacements. A regex scan is not a complete security audit. Review code and access with the developer before public hosting.
