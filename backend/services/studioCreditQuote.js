const { randomUUID } = require('node:crypto');
const templates = require('./studioTemplateService');
const mcp = require('./higgsfieldMCPClient');
const { videoParams, importReference, quotedCredits, sourceVideo } = require('./studioHiggsfieldService');
const quotes = new Map();
const signature = (o, output) => JSON.stringify([o.tier,o.model,o.templateId,o.imageTemplateId,o.duration,o.resolution,o.imageResolution,o.aspectRatio,o.generationMode,o.sourceUploadId,o.sound,o.enableThinking,o.prompt,output]);
async function create(body) {
  const options = await templates.resolve(body), output = body.outputType || 'both';
  require('./studioPromptValidation').validateVideoPrompt(options, output);
  const costs = {};
  if (output !== 'image') {
    const medias = [];
    if (options.generationMode === 'balance') {
      const url = await sourceVideo(options, 'quote-' + options.templateId);
      if (!url) throw new Error('This video mode needs a saved source video before quoting credits.');
      const mediaId = await importReference(url, 'video');
      medias.push({ role:'video_references', value:mediaId });
    }
    const params = { ...videoParams(options, medias), get_cost: true };
    costs.video = quotedCredits(await mcp._submitVideoJob(params, 'studio-credit-quote'));
  }
  if (output !== 'video') costs.image = quotedCredits(await mcp._mcpCall('generate_image', { params:{model:'gpt_image_2',resolution:options.imageResolution || '2k',quality:'medium',aspect_ratio: options.tier === 'custom' ? options.aspectRatio : (options.imageSubjectMode || options.subjectMode) === 'couple' ? '4:3' : '3:4',count:1,get_cost:true} }));
  const id=randomUUID(), expiresAt=Date.now()+120000;
  for(const [key,value] of quotes) if(value.expiresAt<Date.now()) quotes.delete(key);
  quotes.set(id,{costs,expiresAt,signature:signature(options,output)});
  return {id,credits:Object.values(costs).reduce((sum,value)=>sum+value,0),costs,expiresAt};
}
function consume(id,options,output) {
  const quote=quotes.get(id);
  if(!quote || quote.expiresAt<Date.now() || quote.signature!==signature(options,output)) throw new Error('Credit quote expired or settings changed. Refresh the quote before generating.');
  quotes.delete(id);
  return quote.costs;
}
module.exports={create,consume};
