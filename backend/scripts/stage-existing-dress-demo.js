// No generation: select previously uploaded assets by their exact verified titles.
require('dotenv').config({quiet:true});
const fs=require('node:fs/promises'),path=require('node:path');
const flow=require('../services/googleFlowMcpService');
const config=require('../services/studioVideoConfig');
async function main(){
  await flow.ensureWorker();
  const token=(await fs.readFile(path.join(flow.home(),'token'),'utf8')).trim();
  async function call(method,body){const r=await fetch('http://127.0.0.1:8787/api/'+method,{method:'POST',headers:{'content-type':'application/json','x-flow-token':token},body:JSON.stringify(body)});const x=await r.json();if(!r.ok)throw Error(x.error||method+' failed');return x;}
  const assets=await call('assets',{});
  const names=Array.from({length:6},(_,i)=>{
    const stem='fm-bfb5b203-ref'+(i+1);
    const matches=assets.filter(a=>a.name===stem||a.name===stem+'.jpg'||a.name===stem+'.mp4');
    if(matches.length!==1)throw Error('Reference '+(i+1)+' must match exactly one saved asset.');
    return matches[0].name;
  });
  const options=config.resolve({tier:'budget',generationMode:'balance',scene:'sculpted-romance',subjectMode:'solo'});
  const roles=['BRIDE_IDENTITY: current bride, identity only','DRESS_REFERENCE: large front and supporting views of one garment','same garment, full front','same garment, stitching close-up','same garment, side view','video: cinematography inspiration only, never identity or garment'];
  const result=await call('generate',{project:'LadiesPlanet',scenes:[{prompt:options.prompt+'\nATTACHED INGREDIENT MAPPING\n'+roles.map((role,i)=>'Image '+(i+1)+': '+role+'.').join('\n'),type:'video',model:process.env.FLOW_MCP_MODEL||'Omni 1.1 Flash',duration:10,resolution:'720p',aspect_ratio:'16:9',variants:1,retries:0,max_credits:40,prepare_only:true,reference_images:names.map(name=>'asset:'+name)}]});
  console.log(JSON.stringify({jobId:result.jobs?.[0]?.id,names}));
  process.exit();
}
main().catch(e=>{console.error(e.message);process.exit(1)});
