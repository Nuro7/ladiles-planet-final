const path=require('node:path');
const {spawnSync}=require('node:child_process');
const media=require('../services/studioMediaService');
const entries=[['DWWL5FJDEaH',5,6.5],['DYbvLPzOXKG',6,3.8],['DTiV1CIk1tX',7,5],['DZr_y90vFSK',8,7.5],['DOs1F0xkoJX',9,5],['DNlDu8JvP_2',10,7.4],['Dc5Ja4HRcVt',11,6.5]];
for(const [id,n,t] of entries){
 const filter=(n===8||n===11?'':'transpose=2,')+'scale=480:640:force_original_aspect_ratio=increase,crop=480:640';
 const r=spawnSync(media.binary(),['-hide_banner','-nostdin','-ss',String(t),'-i',path.join(__dirname,'../assets/ultra-instagram-intake',id+'.mp4'),'-frames:v','1','-vf',filter,'-q:v','2','-y',path.join(__dirname,'../../frontend/public/template-previews',`ultra-reel-0${n}.jpg`)],{encoding:'utf8',windowsHide:true});
 if(r.status!==0)throw Error(r.stderr);
 console.log('Prepared source preview #'+n);
}
