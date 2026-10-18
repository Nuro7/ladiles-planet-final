const names = {grok_video_v15:'Grok Imagine 1.5',wan3_0_prime:'Wan 3.0 Prime',seedance_2_5:'Seedance 2.5',hf_mult_motion_control:'Genjutsu',gpt_image_2:'GPT Image 2',seedance_2_0:'Seedance 2.0',gemini_omni_flash_1_1:'Gemini Omni Flash 1.1'};
const count = text => typeof text === 'string' && text.length ? Array.from(text).length : null;
function metadata({model,mode,prompt,template,resolution,duration,aspectRatio,source}) {
  const title = typeof prompt === 'string' ? prompt.split(/\r?\n/).find(line=>line.trim())?.replace(/^PROJECT(?: TITLE)?\s*:\s*/i,'').trim() : null;
  return {model: model ? names[model] || model : null, modelId:model || null, mode:mode || null,
    template:template || title || null,promptCharacters:count(prompt),
    promptLimit:model === 'wan3_0_prime' ? '5,000 (observed MCP limit; website differs)' : 'Not verified',
    resolution:resolution || null,duration:duration || null,aspectRatio:aspectRatio || null,source:source || null};
}
let cached=null, cachedAt=0;
async function importedMetadata() {
  if(cached && Date.now()-cachedAt<60000)return cached;
  const mcp=require('./higgsfieldMCPClient');
  const response=await mcp._mcpCall('show_generations',{type:'video',size:100});
  cached=new Map(require('./higgsfieldJobState').itemsFrom(response).map(job=>{
    const params=job.params || {};
    return [job.id,metadata({model:job.model,mode:params.mode,prompt:params.prompt || job.prompt,resolution:params.resolution || job.resolution,duration:params.duration || job.duration,aspectRatio:params.aspect_ratio || job.aspect_ratio,source:'Higgsfield job record'})];
  }));cachedAt=Date.now();return cached;
}
module.exports={metadata,importedMetadata};
