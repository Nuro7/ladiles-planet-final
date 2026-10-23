function validateProduction(env = process.env) {
  if (!['development', 'test', 'production'].includes(env.NODE_ENV)) throw new Error('Set NODE_ENV explicitly to development, test or production.');
  if (env.NODE_ENV !== 'production') return;
  const required = ['FRONTEND_URL', 'SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'HIGGSFIELD_OWNER_USER_ID', 'MEDIA_SESSION_SECRET', 'HIGGSFIELD_OAUTH_REDIRECT_URI', 'HIGGSFIELD_TOKEN_ENCRYPTION_KEY', 'SUPABASE_BUCKET_NAME'];
  for (const key of required) if (!env[key]) throw new Error(`Production requires ${key}.`);
  if (!env.DATABASE_URL && !(env.SUPABASE_PROJECT_ID && env.SUPABASE_DB_PASSWORD)) throw new Error('Production requires DATABASE_URL or Supabase database project/password settings.');
  if (env.DATABASE_URL && !['postgres:', 'postgresql:'].includes(new URL(env.DATABASE_URL).protocol)) throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  if (env.MEDIA_SESSION_SECRET.length < 32) throw new Error('MEDIA_SESSION_SECRET must contain at least 32 random characters.');
  if (env.ALLOW_LOCAL_DEV_AUTH === 'true') throw new Error('Local authentication bypass is forbidden in production.');
  for (const value of env.FRONTEND_URL.split(',')) if (new URL(value.trim()).protocol !== 'https:') throw new Error('Production FRONTEND_URL must use HTTPS.');
  if (new URL(env.HIGGSFIELD_OAUTH_REDIRECT_URI).protocol !== 'https:') throw new Error('Production OAuth redirect must use HTTPS.');
  const key = Buffer.from(env.HIGGSFIELD_TOKEN_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32 || key.toString('base64') !== env.HIGGSFIELD_TOKEN_ENCRYPTION_KEY) throw new Error('HIGGSFIELD_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  const callback = new URL(env.HIGGSFIELD_OAUTH_REDIRECT_URI);
  if (callback.pathname !== '/api/higgsfield-oauth/callback' || callback.search || callback.hash || callback.username || callback.password) throw new Error('Production OAuth redirect must use the exact callback path without credentials, query or fragment.');
  for (const name of ['MEDIA_CONCURRENCY', 'GENERATION_CONCURRENCY', 'FFMPEG_THREADS']) {
    if (env[name] && (!Number.isInteger(Number(env[name])) || Number(env[name]) < 1 || Number(env[name]) > 32)) throw new Error(`Invalid ${name}; use an integer from 1 to 32.`);
  }
  for (const [name, minimum] of [['MIN_FREE_DISK_MB', 128], ['SHUTDOWN_TIMEOUT_MS', 1000]]) {
    if (env[name] && (!Number.isInteger(Number(env[name])) || Number(env[name]) < minimum)) throw new Error(`Invalid ${name}.`);
  }
}
module.exports = { validateProduction };
