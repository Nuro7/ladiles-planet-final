const path = require('node:path');
const { createHash } = require('node:crypto');
const { createStore } = require('../utils/studioStore');
const flow = require('./googleFlowMcpService');
const media = require('./studioMediaService');
const store = createStore(process.env.DRESS_FLOW_STORE || path.join(__dirname, '../data/dress-flow-sync.json'), {});
const active = new Set();
let seeded = false;
const verified = new Map();
function titleKey(name) { return name.replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase(); }
async function verifyAndRepair(entry) {
  const project = await flow.currentProject();
  if (project !== entry.projectUrl) throw new Error('This dress belongs to another Flow project. Open its project or sync the dress again.');
  const stamp = entry.projectUrl + ':' + entry.assetNames.join('|');
  if ((verified.get(stamp) || 0) > Date.now()) return entry;
  const assets = await flow.referenceAssets(entry.projectUrl, entry.assetNames);
  const missing = [];
  const names = entry.assetNames.map((name, index) => {
    const matches = assets.filter(asset => titleKey(asset.name) === titleKey(name));
    if (matches.length > 1) throw new Error('A dress reference has duplicate names in Flow. Rename the duplicate before generating.');
    if (!matches.length) { missing.push(index); return name; }
    return matches[0].name;
  });
  if (missing.length) {
    const refresh = require('./storageService').refreshUrl;
    const views = await Promise.all(entry.views.map(async view => ({...view,url:await refresh(view.url)})));
    const files = await Promise.all(missing.map(index => index === 0
      ? media.contactSheet(views.map(view=>view.url),'Dress view',{hero:true,heroIndex:Math.max(0,views.findIndex(view=>view.angle==='front'))})
      : media.remoteImage(views[index-1].url,'dress-view-'+(index-1))));
    const replacements = await flow.importAssets(files, entry.projectUrl);
    if (replacements.length !== missing.length) throw new Error('Flow did not confirm the repaired dress references. No generation was submitted.');
    missing.forEach((index, i) => { names[index] = replacements[i]; });
  }
  await store.update(entries=>{entries[entry.key].assetNames=names;return entries;});
  verified.set(entry.projectUrl + ':' + names.join('|'), Date.now()+60000);
  return {...entry,assetNames:names};
}
function key(views) {
  return createHash('sha256').update(JSON.stringify(views.map(v => [v.url.split('?')[0], v.angle]))).digest('hex');
}
function visible(entry) {
  return { key: entry.key, status: entry.status, message: entry.message, syncedAt: entry.syncedAt || null, count: entry.assetNames?.length || 0 };
}
async function enqueue(views, name, kind = 'gallery') {
  const id = key(views);
  const existing = (await store.read())[id];
  if (existing && (kind !== 'gallery' || existing.kind === 'gallery')) {
    if (['queued','syncing'].includes(existing.status)) start(id);
    return visible(existing);
  }
  await store.update(entries => {
    if (!entries[id]) entries[id] = {key:id, views, name, kind, status:'queued', message:'Waiting to sync to Flow', createdAt:new Date().toISOString()};
    else if (kind === 'gallery') entries[id].kind = 'gallery';
    return entries;
  });
  const entry = (await store.read())[id];
  if (['queued','syncing'].includes(entry.status)) start(id);
  return visible(entry);
}
function start(id) {
  if (active.has(id)) return;
  active.add(id);
  work(id).catch(error => store.update(entries => {
    entries[id] = {...entries[id],status:'attention',message:error.message};return entries;
  })).catch(error=>console.error('[Dress sync] State could not be saved:',error.message)).finally(()=>active.delete(id));
}
async function work(id) {
  let entry = (await store.read())[id];
  const projectUrl = await flow.currentProject();
  const recoverId = entry.projectUrl === projectUrl ? entry.jobId : undefined;
  await store.update(entries=>{entries[id]={...entries[id],status:'syncing',message:'Uploading dress references to Flow',projectUrl};return entries;});
  const hero = Math.max(0, entry.views.findIndex(v=>v.angle==='front'));
  const [sheet, photos] = await Promise.all([
    media.contactSheet(entry.views.map(v=>v.url),'Dress view',{hero:true,heroIndex:hero}),
    Promise.all(entry.views.map((v,i)=>media.remoteImage(v.url,'dress-view-'+i))),
  ]);
  const names = await flow.importAssets([sheet,...photos],projectUrl,async jobId=>{
    await store.update(entries=>{entries[id].jobId=jobId;return entries;});
  },recoverId);
  if (names?.length !== entry.views.length+1) throw new Error('Flow did not confirm every dress reference. Retry sync; nothing was generated.');
  await store.update(entries=>{entries[id]={...entries[id],status:'ready',message:'Ready in Flow',assetNames:names,syncedAt:new Date().toISOString()};return entries;});
}
async function retry(id) {
  if (!(await store.read())[id]) throw new Error('Dress sync not found.');
  await store.update(entries=>{entries[id].status='queued';entries[id].message='Waiting to sync to Flow';return entries;});
  start(id);return visible((await store.read())[id]);
}
async function get(id) { return (await store.read())[id]; }
async function bundle(id, wait = false) {
  let entry = await get(id);
  if (!entry) throw new Error('Choose a saved dress.');
  if (wait) {
    if (['queued','syncing'].includes(entry.status)) start(id);
    for (let i=0;i<180 && ['queued','syncing'].includes(entry.status);i++) {
      await new Promise(resolve=>setTimeout(resolve,2000));entry=await get(id);
    }
  }
  if (entry.status !== 'ready') throw new Error('Dress references are not ready in Flow. Wait for syncing or retry in Dress Gallery.');
  if (wait) entry = await verifyAndRepair(entry);
  return {...entry, sheet:{assetName:entry.assetNames[0],projectUrl:entry.projectUrl},
    photos:entry.views.map((view,i)=>({...view,assetName:entry.assetNames[i+1],projectUrl:entry.projectUrl}))};
}
async function recent() {
  if (!seeded) {
    const fs = require('node:fs/promises');
    let jobs=[];
    try { jobs=JSON.parse(await fs.readFile(path.join(__dirname,'../data/studio-experiences.json'),'utf8')); } catch(error) { if(error.code!=='ENOENT') throw error; }
    await store.update(entries=>{
      for (const job of jobs.slice(-20)) {
        const views=job.assets?.dressViews;
        if(job.dressId || !views?.length || views.some(v=>!v.url)) continue;
        const id=key(views);
        if(!entries[id])entries[id]={key:id,views,name:job.dressName || 'Recent dress · '+job.createdAt.slice(0,10),kind:'recent',status:'queued',message:'Not synced yet · select to sync',createdAt:job.createdAt};
      }
      return entries;
    });
    seeded=true;
  }
  return Promise.all(Object.values(await store.read()).filter(e=>e.kind==='recent').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20).map(async e=>({
    id:'recent:'+e.key,name:e.name,category:'Recent upload',sku:'',isAvailable:true,flowSync:visible(e),
    imageUrl:await require('./storageService').refreshUrl(e.views[0].url),
    images:await Promise.all(e.views.map(async v=>({...v,url:await require('./storageService').refreshUrl(v.url)}))),
  })));
}
module.exports = {enqueue,retry,get,bundle,recent,key};
