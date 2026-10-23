const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
let fixtures=[];
const axiosId=require.resolve('axios');require.cache[axiosId]={id:axiosId,filename:axiosId,loaded:true,exports:{get:async url=>({data:fixtures[Number(new URL(url).pathname.slice(1))]})}};
const storageId=require.resolve('../services/storageService');require.cache[storageId]={id:storageId,filename:storageId,loaded:true,exports:{refreshUrl:async url=>url}};
const media=require('../services/studioMediaService');
test('Garment evidence sheet retains all eight views with a prominent selected hero',async()=>{
  fixtures=await Promise.all(['red','blue','green','yellow','purple','orange','pink','black'].map(background=>sharp({create:{width:120,height:160,channels:3,background}}).png().toBuffer()));
  const sheet=await media.contactSheet(fixtures.map((_,i)=>'https://fixtures.example/'+i),'Dress view',{hero:true,heroIndex:0});
  const info=await sharp(sheet.buffer).metadata();
  assert.equal(info.width,2160);assert.equal(info.height,1740);
  assert.equal(sheet.originalname,'dress-evidence.jpg');
  const pixel=await sharp(sheet.buffer).extract({left:480,top:840,width:1,height:1}).raw().toBuffer();
  assert.ok(pixel[0]>200&&pixel[1]<20&&pixel[2]<20,'Hero panel must retain the original red reference, not replace or recolour it.');
  await assert.rejects(media.contactSheet([],'Dress view',{hero:true}),/1 to 8/);
});
