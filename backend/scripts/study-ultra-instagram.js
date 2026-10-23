const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const sharp = require('sharp');
const media = require('../services/studioMediaService');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['DeZcHoTMK5g','DbvjZykMGHn','Db5aUYYqmCm'];
function ff(args) {
  const r = spawnSync(media.binary(), ['-hide_banner','-nostdin',...args], {encoding:'utf8',windowsHide:true,maxBuffer:8e6});
  if(r.status!==0) throw Error(r.stderr);
  return r.stderr;
}
(async()=>{
  for(const id of ids){
    const root=path.join(__dirname,'../assets/ultra-instagram-intake',id);
    fs.mkdirSync(root,{recursive:true});
    const source=root+'.mp4';
    const info=ff(['-i',source,'-t','10','-f','null','-']);
    const cuts=ff(['-i',source,'-t','10','-vf',"select='gt(scene,0.15)',showinfo",'-an','-f','null','-']);
    const starts=[0,...[...cuts.matchAll(/pts_time:([\d.]+)/g)].map(m=>+m[1]).filter(t=>t<10)];
    const cutLayers=[];
    for(const [j,t] of starts.entries()){
      const target=path.join(root,`cut-${j}.jpg`);
      ff(['-ss',String(Math.min(t+.045,9.98)),'-i',source,'-frames:v','1','-vf','scale=220:-2','-y',target]);
      const left=j%6*220,top=Math.floor(j/6)*250;
      cutLayers.push({input:await sharp(target).resize(220,220,{fit:'contain',background:'#111'}).toBuffer(),left,top});
      cutLayers.push({input:Buffer.from(`<svg width="220" height="30"><rect width="220" height="30" fill="#111"/><text x="8" y="22" fill="white" font-size="18">${t.toFixed(3)}s</text></svg>`),left,top:top+220});
    }
    await sharp({create:{width:1320,height:Math.ceil(starts.length/6)*250,channels:3,background:'#111'}}).composite(cutLayers).jpeg({quality:90}).toFile(path.join(root,'cuts.jpg'));
    ff(['-i',source,'-t','10','-vf','fps=4,scale=240:-2','-q:v','3','-y',path.join(root,'frame-%03d.jpg')]);
    const names=fs.readdirSync(root).filter(n=>/^frame-\d+\.jpg$/.test(n)).sort();
    for(let b=0;b<names.length;b+=20){
      const layers=[];
      for(const [j,n] of names.slice(b,b+20).entries()){
        const left=j%5*240,top=Math.floor(j/5)*270;
        layers.push({input:await sharp(path.join(root,n)).resize(240,240,{fit:'contain',background:'#111'}).toBuffer(),left,top});
        layers.push({input:Buffer.from(`<svg width="240" height="30"><rect width="240" height="30" fill="#111"/><text x="8" y="22" fill="white" font-size="18">${(b+j)/4}s</text></svg>`),left,top:top+240});
      }
      await sharp({create:{width:1200,height:1080,channels:3,background:'#111'}}).composite(layers).jpeg({quality:90}).toFile(path.join(root,`contact-${b/20+1}.jpg`));
    }
    ff(['-i',source,'-t','10','-map','0:a:0','-vn','-c:a','aac','-y',path.join(root,'music.m4a')]);
    console.log(JSON.stringify({id,starts,info:info.split('\n').filter(l=>/Duration:|Video:|Audio:|rotation/.test(l))}));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
