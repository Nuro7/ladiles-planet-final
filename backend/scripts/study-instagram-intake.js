const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const sharp = require('sharp');
const media = require('../services/studioMediaService');
const ids = ['Db8JnGgymiN','Db3COrStkZt','C7opA5Tv7__','DaDX64Oxd67','DbDYe6GyUfF','DeBHeHxIAAD','Dd5Y1efox5_','DSbtINCAeTe','Dds2f4ookEO','DeLZ8J8o09X'];
function ff(args) {
  const result=spawnSync(media.binary(),['-hide_banner','-nostdin',...args],{encoding:'utf8',windowsHide:true,maxBuffer:8e6});
  if(result.status!==0)throw Error(result.stderr);
  return result.stderr;
}
async function main(){
 for(const [i,id] of ids.entries()){
  const source=path.join(__dirname,'../assets/instagram-intake',id+'.mp4');
  if(!fs.existsSync(source)){console.log('MISSING '+id);continue;}
  const root=path.join(__dirname,'../assets/budget-speed-batch-'+(i+10));fs.mkdirSync(root,{recursive:true});
  const info=ff(['-i',source,'-f','null','-']);
  const dm=info.match(/Duration: (\d+):(\d+):(\d+\.\d+)/),sz=info.match(/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/);
  const duration=+dm[1]*3600+ +dm[2]*60+ +dm[3],width=+sz[1],height=+sz[2];
  const cutInfo=ff(['-i',source,'-vf',"select='gt(scene,0.22)',showinfo",'-an','-f','null','-']);
  const starts=[0,...[...cutInfo.matchAll(/pts_time:([\d.]+)/g)].map(m=>+m[1]).filter(t=>t<duration-.3)];
  ff(['-i',source,'-vf','fps=1,scale=200:-2','-q:v','3','-y',path.join(root,'study-%03d.jpg')]);
  const frames=fs.readdirSync(root).filter(n=>/^study-\d+\.jpg$/.test(n)).sort();
  for(let begin=0;begin<frames.length;begin+=30){
   const subset=frames.slice(begin,begin+30),h=Math.round(200*height/width),layers=[];
   for(const [j,name]of subset.entries()){
    const left=j%6*200,top=Math.floor(j/6)*(h+24);
    layers.push({input:await sharp(path.join(root,name)).resize(200,h).toBuffer(),left,top});
    layers.push({input:Buffer.from(`<svg width="200" height="24"><rect width="200" height="24" fill="#111"/><text x="6" y="18" fill="white" font-size="15">${begin+j}s</text></svg>`),left,top:top+h});
   }
   await sharp({create:{width:1200,height:Math.ceil(subset.length/6)*(h+24),channels:3,background:'#111'}}).composite(layers).jpeg({quality:85}).toFile(path.join(root,'contact-'+(Math.floor(begin/30)+1)+'.jpg'));
  }
  for(const [j,t]of starts.entries())ff(['-ss',String(t+.1),'-i',source,'-frames:v','1','-y',path.join(root,'source-shot-'+String(j+1).padStart(2,'0')+'.jpg')]);
  await media.extractTemplateMusic(source,path.join(root,'music.m4a'));
  console.log(JSON.stringify({id,number:i+10,duration,width,height,starts}));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
