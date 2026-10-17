require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const mcp = require('../services/higgsfieldMCPClient');
const storage = require('../services/storageService');
const service = require('../services/studioHiggsfieldService');
const root = path.resolve(__dirname, '../data/sculpted-360p-demo');
const recordPath = path.join(root, 'record.json');
fs.mkdirSync(root, { recursive: true });
const save = data => fs.writeFileSync(recordPath, JSON.stringify(data, null, 2));
async function main() {
  const action = process.argv[2] || 'prepare';
  if (action === 'prepare') {
    if (fs.existsSync(recordPath)) throw new Error('Demo record exists; inspect before creating another request.');
    const jobs = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/studio-experiences.json'), 'utf8'));
    const previous = [...jobs].reverse().find(job => job.assets?.brideUrl && job.assets?.dressUrl);
    const source = path.resolve(__dirname, '../assets/budget-balance-01/reference.mp4');
    const sourceUrl = await service.sourceVideo({ sourceVideoPath: source }, 'sculpted-360p-demo');
    const urls = [
      ['video_references', 'video', sourceUrl],
      ['image_references', 'image', await storage.refreshUrl(previous.assets.brideUrl)],
      ...await Promise.all((previous.assets.dressViews || [{ url: previous.assets.dressUrl }]).map(async view => ['image_references', 'image', await storage.refreshUrl(view.url)])),
    ];
    const jewellery = await storage.uploadImage(process.env.SUPABASE_BUCKET_NAME,
      'experiences/sculpted-360p-demo/ornaments.png', fs.readFileSync(path.resolve(__dirname, '../assets/global/bridal-ornaments-reference.png')), 'image/png');
    urls.push(['image_references', 'image', jewellery.publicUrl]);
    const medias = [];
    for (const [role, type, url] of urls) {
      const result = await mcp._mcpCall('media_import_url', { url, type });
      if (result.error) throw new Error(result.error);
      const id = result.media_id || result.id || result.media?.id;
      if (!id) throw new Error('Reference upload unconfirmed.');
      medias.push({ role, value: id });
    }
    const prompt = fs.readFileSync(path.resolve(__dirname, '../assets/budget-balance-01/prompt.txt'), 'utf8').trim();
    const params = { model:'gemini_omni_flash_1_1', mode:'edit', resolution:'360p',
      prompt, medias, count:1, use_unlim:false };
    const quote = await mcp._mcpCall('generate_video', { params:{...params,get_cost:true} });
    const record = { template:'Sculpted Romance', sourceDurationSeconds:20.361043,
      sourcePath:source, preparedAt:new Date().toISOString(), params, quote, status:'prepared' };
    save(record);
    console.log(JSON.stringify({action,referenceCount:medias.length,promptCharacters:prompt.length,quote}));
    return;
  }
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  if (action === 'compact-rejected-prompt') {
    if (record.jobId || !record.response?.error?.includes('string_too_long')) throw new Error('Requires an explicit pre-job prompt-length rejection.');
    record.rejectedAttempt = {submittedAt:record.submittedAt,response:record.response};
    record.params.prompt=record.params.prompt.replace(/^=+\s*$/gm,'').replace(/\s+/g,' ').trim();
    if(record.params.prompt.length>20000)throw new Error('Still over the provider prompt limit.');
    record.quote=await mcp._mcpCall('generate_video',{params:{...record.params,get_cost:true}});
    record.status='prepared';delete record.response;delete record.submittedAt;
    save(record);
    console.log(JSON.stringify({status:record.status,promptCharacters:record.params.prompt.length,quote:record.quote}));
    return;
  }
  if (action === 'submit') {
    if (record.status !== 'prepared') throw new Error('Submission already attempted; inspect existing job, never resubmit blindly.');
    const cost = service.quotedCredits(record.quote);
    record.status='submission_attempted'; record.submittedAt=new Date().toISOString(); save(record);
    const response = await mcp._mcpCall('generate_video', { params:record.params });
    record.response=response;
    const first=response.results?.[0];
    record.jobId=first?.id || response.job_id || response.id;
    record.quotedCredits=cost;
    record.status=record.jobId?'submitted':'submission_unconfirmed'; save(record);
    console.log(JSON.stringify({status:record.status,jobId:record.jobId,quotedCredits:cost,response}));
    return;
  }
  if (action === 'status') {
    if (!record.jobId) throw new Error('No confirmed job ID.');
    const response=await mcp._mcpCall('job_status',{jobId:record.jobId});
    const generation=response.generation;
    record.lastStatusResponse=response;record.lastCheckedAt=new Date().toISOString();
    if(generation)record.status=generation.status;
    if(generation?.status==='completed' && !record.completedObservedAt)record.completedObservedAt=record.lastCheckedAt;
    save(record);
    console.log(JSON.stringify({status:record.status,jobId:record.jobId,elapsedSeconds:(Date.now()-Date.parse(record.submittedAt))/1000,response}));
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
