// Reuse existing media to verify prompt routing without pressing Generate.
require('dotenv').config({quiet:true});
const fs=require('node:fs/promises'),path=require('node:path');
const flow=require('../services/googleFlowMcpService');
const config=require('../services/studioVideoConfig');
async function main(){
  await flow.ensureWorker();
  const jobs=JSON.parse(await fs.readFile(path.join(flow.home(),'jobs.json'),'utf8'));
  const previous=jobs.filter(j=>j.status==='done'&&j.submittedAt&&j.attachedAssetNames?.length===6).at(-1);
  if(!previous)throw Error('No verified prior six-reference video to check.');
  const token=(await fs.readFile(path.join(flow.home(),'token'),'utf8')).trim();
  const options=config.resolve({tier:'budget',generationMode:'balance',scene:'sculpted-romance',subjectMode:'solo'});
  const roles=['BRIDE_IDENTITY: current uploaded bride, identity only','DRESS_REFERENCE: saved dress sheet, garment only','dress front, garment only','dress detail, garment only','dress side, garment only','motion video: camera and setting only, never identity or wardrobe'];
  const response=await fetch('http://127.0.0.1:8787/api/generate',{method:'POST',headers:{'content-type':'application/json','x-flow-token':token},body:JSON.stringify({project:'LadiesPlanet',scenes:[{prompt:options.prompt+'\n'+roles.map((role,i)=>'Image '+(i+1)+': '+role+'.').join('\n'),type:'video',model:process.env.FLOW_MCP_MODEL||'Omni 1.1 Flash',duration:10,resolution:'720p',aspect_ratio:'16:9',variants:1,retries:0,max_credits:40,prepare_only:true,identity_reference_indices:[1],reference_images:previous.attachedAssetNames.map(name=>'asset:'+name)}]})});
  const result=await response.json();if(!response.ok)throw Error(result.error);
  console.log(JSON.stringify({jobId:result.jobs?.[0]?.id,generationSubmitted:false}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
