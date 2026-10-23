const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.NODE_ENV = 'test';
process.env.HIGGSFIELD_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.SUPABASE_BUCKET_NAME = 'test-bucket';
process.env.DATABASE_URL = 'postgresql://test:test@db.example.com:5432/test';
process.env.TRUSTED_PROXY_CIDRS = '127.0.0.1/32,::1/128';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_KEY = 'test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret';
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'lp-security-'));
process.env.STUDIO_EXPERIENCE_STORE = path.join(temp,'jobs.json');
process.env.STUDIO_TEMPLATE_STORE = path.join(temp,'templates.json');
process.env.SAVED_BRIDE_ROOT = path.join(temp,'brides');
process.env.DRESS_FLOW_STORE = path.join(temp,'dress.json');
const configPath = require.resolve('../config/supabase');
const staff = { id:'staff', is_active:true, role:'staff' };
const admin = { auth:{ getUser:async token => ({data:{user:token === 'valid' ? {id:'staff'} : null},error:null}) },
  from:() => ({select:() => ({eq:() => ({single:async() => ({data:staff,error:null})})})}) };
require.cache[configPath] = { id:configPath, filename:configPath, loaded:true, exports:{supabase:admin,supabaseAdmin:admin} };
const mcp = require('../services/higgsfieldMCPClient');
mcp.getBalance = async () => ({credits:10});
test('production config fails closed', () => {
  const {validateProduction} = require('../config/production');
  assert.throws(()=>validateProduction({}),/NODE_ENV/);
  assert.throws(()=>validateProduction({NODE_ENV:'production'}),/FRONTEND_URL/);
  const env={NODE_ENV:'production',FRONTEND_URL:'https://studio.example.com',SUPABASE_URL:'https://example.supabase.co',SUPABASE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'secret',HIGGSFIELD_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),SUPABASE_BUCKET_NAME:'test-bucket',HIGGSFIELD_OWNER_USER_ID:'owner',MEDIA_SESSION_SECRET:'x'.repeat(32),HIGGSFIELD_OAUTH_REDIRECT_URI:'https://studio.example.com/api/higgsfield-oauth/callback'};
  env.DATABASE_URL=process.env.DATABASE_URL;
  assert.doesNotThrow(()=>validateProduction(env));
  assert.throws(()=>validateProduction({...env,ALLOW_LOCAL_DEV_AUTH:'true'}),/forbidden/);
});
test('production serves SPA deep links but never exposes anonymous studio API', () => {
  const {execFileSync}=require('node:child_process');
  const script=`const app=require('./server'); const server=app.listen(0,'127.0.0.1',async()=>{try{const base='http://127.0.0.1:'+server.address().port;for(const [url,status] of [['/',200],['/studio/history',200],['/api/videos/studio/config',401]]){const r=await fetch(base+url);if(r.status!==status)throw new Error(url+': '+r.status);}console.log('PRODUCTION_BOOT_PASS');}catch(e){console.error(e.message);process.exitCode=1;}finally{server.close();}});`;
  const output=execFileSync(process.execPath,['-e',script],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:20000,
    env:{...process.env,NODE_ENV:'production',FRONTEND_URL:'https://studio.example.com',MEDIA_SESSION_SECRET:'test-only-secret-'.repeat(4),HIGGSFIELD_OWNER_USER_ID:'owner',HIGGSFIELD_OAUTH_REDIRECT_URI:'https://studio.example.com/api/higgsfield-oauth/callback',ALLOW_LOCAL_DEV_AUTH:'false'}});
  assert.match(output,/PRODUCTION_BOOT_PASS/);
});
test('remote media rejects private targets and insecure URLs', () => {
  const safe = require('../utils/safeRemoteMedia');
  for (const url of ['http://example.com/a','https://127.0.0.1/a','https://169.254.169.254/a','https://[::1]/a','https://localhost/a','https://user:secret@example.com/a']) assert.throws(()=>safe.validateUrl(url));
  for (const address of ['10.1.1.1','172.16.2.3','192.168.1.72','::1','fc00::1','::ffff:127.0.0.1']) assert.equal(safe.publicAddress(address),false);
  assert.doesNotThrow(()=>safe.validateUrl('https://cdn.example.com/a.mp4'));
});
test('API denies anonymous access, including proxied loopback; test spend route is absent', async t => {
  const app = require('../server');
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  for (const route of ['/api/users','/api/storage/list/test','/api/videos','/api/images','/api/dresses','/api/brides','/api/videos/studio/config','/api/videos/studio/media/test','/api/videos/studio/media/test/image','/api/videos/studio/template-thumbnail/test','/api/pricing','/api/operations/status']) {
    const response=await fetch(base+route,{headers:{'X-Forwarded-For':'8.8.8.8'}});
    assert.equal(response.status,401,route);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  }
  for (const route of ['/api/auth/register','/api/auth/sync','/api/videos/generate','/api/videos/studio/experiences','/api/higgsfield-oauth/disconnect']) assert.equal((await fetch(base+route,{method:'POST'})).status,401,route);
  assert.equal((await fetch(base+'/api/seedance-test',{method:'POST'})).status,404);
  assert.equal((await fetch(base+'/api/users',{headers:{Authorization:'Bearer invalid'}})).status,401);
  assert.equal((await fetch(base+'/api/users',{headers:{Authorization:'Bearer valid'}})).status,403);
  const cfg=await fetch(base+'/api/videos/studio/config',{headers:{Authorization:'Bearer valid'}});
  assert.equal(cfg.status,200);
  const cookie=cfg.headers.get('set-cookie').split(';')[0];
  assert.match(cfg.headers.get('set-cookie'),/HttpOnly/);
  const body=await cfg.json();
  const thumbnail=body.data.ultraFastScenes[0].subjects.solo.previewUrl;
  assert.equal((await fetch(base+thumbnail,{headers:{Cookie:cookie}})).status,200);
  assert.equal((await fetch(base+'/api/videos/studio/experiences',{method:'POST',headers:{Cookie:cookie}})).status,401);
  assert.equal((await fetch(base+thumbnail,{headers:{Cookie:'lp_media=forged'}})).status,401);
  const health=await (await fetch(base+'/api/health')).json();
  assert.notEqual(health.database.supabase,'Connected');
  const tooLarge=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({x:'x'.repeat(270000)})});
  assert.equal(tooLarge.status,413);
});
test('development bypass is explicit and cannot trust forwarded loopback', async () => {
  const access=require('../middleware/studioAccess');
  const previous=process.env.NODE_ENV;
  process.env.NODE_ENV='development'; process.env.ALLOW_LOCAL_DEV_AUTH='true';
  const req={socket:{remoteAddress:'127.0.0.1'},headers:{}};
  let allowed=false, status;
  const res={status(value){status=value;return this;},json(){return this;}};
  await access(req,res,()=>{allowed=true;});
  assert.equal(allowed,true);
  allowed=false;
  await access({socket:req.socket,headers:{'x-forwarded-for':'8.8.8.8'}},res,()=>{allowed=true;});
  assert.equal(allowed,false);assert.equal(status,401);
  process.env.NODE_ENV=previous;delete process.env.ALLOW_LOCAL_DEV_AUTH;
});
test('every published card is illustrated and Grok has no video references', async () => {
  const params=require('../services/studioHiggsfieldService').videoParams({tier:'ultrafast',prompt:'test',duration:10,resolution:'480p',aspectRatio:'16:9'},[{role:'video_references',value:'must-not-send'},{role:'image_references',value:'bride'}]);
  assert.deepEqual(params.medias,[{role:'image_references',value:'bride'}]);
  const config=await require('../services/studioTemplateService').publicConfig();
  for (const list of ['ultraFastScenes','imageScenes','flagshipScenes','budgetScenes','budgetSpeedScenes','premiumSpeedScenes','premiumBalanceScenes']) for (const scene of config[list]) for (const recipe of Object.values(scene.subjects)) if(recipe.available !== false) assert.match(recipe.previewUrl,/^\/api\/videos\/studio\/template-thumbnail\//);
  for (const scene of require('../services/studioUltraFastTemplates')) {
    assert.equal(scene.subjects.solo.sourceVideoPath || null,null);
    assert.equal(scene.subjects.solo.sourceVideoUrl || null,null);
  }
});
