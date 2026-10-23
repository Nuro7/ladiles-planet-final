const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { privateJsonStore } = require('../utils/privateJsonStore');
const { createWorkQueue } = require('../utils/workQueue');
const key = Buffer.alloc(32, 9).toString('base64');

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-hosting-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
test('OAuth secrets survive restart encrypted and cannot be opened with another key or filename', t => {
  const dir = temporary(t), store = privateJsonStore(dir, key);
  const tokens = { access_token: 'sensitive-access', refresh_token: 'sensitive-refresh' };
  store.write('tokens.json', tokens);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, 'tokens.json'), 'utf8'), /sensitive/);
  assert.deepEqual(privateJsonStore(dir, key).read('tokens.json'), tokens);
  assert.throws(() => privateJsonStore(dir, Buffer.alloc(32, 2).toString('base64')).read('tokens.json'), /not overwritten/);
  fs.copyFileSync(path.join(dir, 'tokens.json'), path.join(dir, 'other.json'));
  assert.throws(() => store.read('other.json'), /not overwritten/);
  assert.throws(() => store.write('../escape', {}), /Invalid/);
});
test('legacy secrets migrate to encryption; corrupt state fails closed without erasing it', t => {
  const dir = temporary(t), file = path.join(dir, 'tokens.json');
  fs.writeFileSync(file, JSON.stringify({ access_token:'legacy-token' }));
  const store = privateJsonStore(dir, key);
  assert.equal(store.read('tokens.json').access_token, 'legacy-token');
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /legacy-token/);
  fs.writeFileSync(file, 'corrupt');
  assert.throws(() => store.read('tokens.json'), /not overwritten/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'corrupt');
});
test('bounded queue limits concurrency, rejects overflow and continues after failure', async () => {
  const queue = createWorkQueue({ concurrency:1, maxPending:1 });
  let release, started = [];
  const first = queue.run(async () => { started.push(1); await new Promise(r => { release = r; }); throw new Error('failed'); });
  const failed = assert.rejects(first, /failed/);
  const second = queue.run(async () => { started.push(2); return 2; });
  await assert.rejects(queue.run(() => 3), { code:'SERVER_BUSY' });
  assert.deepEqual(started, [1]);
  release();
  await failed;
  assert.equal(await second, 2);
  assert.deepEqual(started, [1,2]);
});
test('two OAuth attempts have independent state, survive restart, and cannot be replayed', async t => {
  const axios = require('axios'), previous = axios.post;
  const { HiggsfieldOAuthService } = require('../services/higgsfieldOAuthService');
  const dir = temporary(t), store = privateJsonStore(dir, key);
  store.write('higgsfield-oauth-client.json', { client_id:'test-client' });
  axios.post = async () => ({ data:{ access_token:'test-access', refresh_token:'test-refresh', expires_in:3600 } });
  t.after(() => { axios.post = previous; });
  const oauth = new HiggsfieldOAuthService({ directory:dir, encryptionKey:key });
  const [first, second] = await Promise.all([oauth.buildAuthorizeUrl('owner'), oauth.buildAuthorizeUrl('owner')]);
  const a = new URL(first).searchParams.get('state'), b = new URL(second).searchParams.get('state');
  assert.notEqual(a,b);
  const restarted = new HiggsfieldOAuthService({ directory:dir, encryptionKey:key });
  await restarted.handleCallback({code:'first',state:a});
  await assert.rejects(restarted.handleCallback({code:'replay',state:a}), /No pending/);
  await restarted.handleCallback({code:'second',state:b});
  assert.equal(await restarted.getAccessToken(), 'test-access');
});
test('disconnect during refresh cannot resurrect the revoked connection', async t => {
  const axios = require('axios'), previous = axios.post;
  const { HiggsfieldOAuthService } = require('../services/higgsfieldOAuthService');
  const dir = temporary(t), store = privateJsonStore(dir, key);
  store.write('higgsfield-oauth-client.json', {client_id:'test-client'});
  store.write('higgsfield-oauth-tokens.json', {access_token:'expired', refresh_token:'refresh', expires_at:1});
  let respond;
  axios.post = () => new Promise(r => { respond = r; });
  t.after(() => { axios.post = previous; });
  const oauth = new HiggsfieldOAuthService({directory:dir,encryptionKey:key});
  const refreshing = oauth.getAccessToken();
  while (!respond) await new Promise(r => setImmediate(r));
  oauth.disconnect();
  respond({data:{access_token:'new-token',expires_in:3600}});
  await assert.rejects(refreshing, /Connection changed/);
  assert.equal(store.read('higgsfield-oauth-tokens.json'), null);
});
test('production rejects missing encryption key, unsafe callback and invalid resource limits', () => {
  const { validateProduction } = require('../config/production');
  const env = { NODE_ENV:'production',FRONTEND_URL:'https://studio.example.com',SUPABASE_URL:'https://example.supabase.co',SUPABASE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private',HIGGSFIELD_OWNER_USER_ID:'owner',MEDIA_SESSION_SECRET:'x'.repeat(32),HIGGSFIELD_OAUTH_REDIRECT_URI:'https://studio.example.com/api/higgsfield-oauth/callback',HIGGSFIELD_TOKEN_ENCRYPTION_KEY:key,SUPABASE_BUCKET_NAME:'private' };
  env.DATABASE_URL='postgresql://test:test@db.example.com:5432/test';
  assert.doesNotThrow(() => validateProduction(env));
  assert.throws(() => validateProduction({...env,DATABASE_URL:''}), /DATABASE_URL/);
  assert.throws(() => validateProduction({...env,HIGGSFIELD_TOKEN_ENCRYPTION_KEY:''}), /ENCRYPTION_KEY/);
  assert.throws(() => validateProduction({...env,HIGGSFIELD_OAUTH_REDIRECT_URI:'https://studio.example.com/incorrect'}), /callback/);
  assert.throws(() => validateProduction({...env,MEDIA_CONCURRENCY:'0'}), /MEDIA_CONCURRENCY/);
});
