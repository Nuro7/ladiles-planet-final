// Preparation only: never click Google's generation button.
require('dotenv').config({quiet:true});
const fs=require('node:fs/promises'),path=require('node:path');
const flow=require('../services/googleFlowMcpService');
const config=require('../services/studioVideoConfig');
const media=require('../services/studioMediaService');
async function main(){
  const dir=path.join(__dirname,'../data/dress-demo-inputs');
  const order=[6,0,4,7,1,2,3,5];
  // Actual previously supplied views: full front, blouse close-up, side, then all remaining views.
  const axios=require('axios'); const originalGet=axios.get;
  axios.get=async function(url,options){if(url.startsWith('demo:'))return {data:await fs.readFile(path.join(dir,url.slice(5)))};return originalGet.call(this,url,options);};
  const urls=order.map(index=>'demo:dress-view-'+index+'.jpg');
  const sheet=await media.contactSheet(urls,'Dress view',{hero:true,heroIndex:0});
  await fs.writeFile(path.join(dir,'dress-evidence.jpg'),sheet.buffer);
  const files=await Promise.all(['bride.jpg','dress-evidence.jpg','dress-view-6.jpg','dress-view-0.jpg','dress-view-4.jpg'].map(async name=>({originalname:name,buffer:await fs.readFile(path.join(dir,name))})));
  const options=config.resolve({tier:'budget',generationMode:'balance',scene:'sculpted-romance',subjectMode:'solo'});
  options.prompt+='\nATTACHED INGREDIENT MAPPING\nImage 1: BRIDE_IDENTITY: current uploaded bride, identity only.\nImage 2: DRESS_REFERENCE: large full-front view and all supporting views of ONE garment.\nImage 3: same garment, individual full front.\nImage 4: same garment, individual close-up for stitching.\nImage 5: same garment, individual side.\nAttached video: cinematic inspiration only, never a face or garment reference.';
  const result=await flow.generate({...options,prepareOnly:true,extendedReferences:true,recoverId:process.argv[2]},files,(_,message)=>console.log(message));
  console.log(JSON.stringify(result));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
