const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const media=require('../services/studioMediaService');
const downloads='C:/Users/MOHD MINHAJ/Downloads';
const clips=[
 {folder:'budget-speed-01',prefix:'❤️',name:'reference.mp4'},
 {folder:'budget-speed-dream-03',prefix:'The moment they dreamed',name:'reference.mp4'},
 {folder:'budget-speed-batch-4',prefix:'Happy Married Life Jimmy',times:[[0,1.1],[2.1,1.2],[4.9,1.2],[9,3.9],[15.4,2.6]]},
 {folder:'budget-speed-batch-5',prefix:'Beautiful dream',times:[[0,2],[3.5,5.4],[13.5,2.6]]},
 {folder:'budget-speed-batch-6',prefix:'Forever together',times:[[.2,1.6],[1.8,1.7],[4.8,6.7]]},
 {folder:'budget-speed-batch-7',prefix:'Two hearts, one beautiful beginning',times:[[0,.85],[1.1,.6],[2.6,.7],[8.1,1.85],[11.1,1.75],[17.9,2.4],[22.8,1.85]]},
 {folder:'budget-speed-batch-8',prefix:'“𝗧𝗼 𝗳𝗼𝗿𝗲𝘃𝗲𝗿”',times:[[0,2],[6.1,2],[16.1,2],[22.7,4]]},
 {folder:'budget-speed-batch-9',prefix:'wedding reel❤️',rotate:true,times:[[0,2],[8.8,2],[15,2],[27.8,2],[46.3,2]]},
];
function ff(args){const r=spawnSync(media.binary(),['-hide_banner','-nostdin',...args],{encoding:'utf8',windowsHide:true,maxBuffer:4e6});if(r.status!==0)throw Error(r.stderr);}
async function main(){
 for(const clip of clips){
 const root=path.join(__dirname,'../assets',clip.folder);
 const matches=fs.readdirSync(downloads).filter(n=>n.startsWith(clip.prefix)&&n.endsWith('.mp4'));
 const name=matches.find(n=>n.endsWith('(1).mp4'))||matches[0];if(!name){console.log('MISSING '+clip.folder);continue;}
 const source=path.join(downloads,name);fs.copyFileSync(source,path.join(root,'original.mp4'));
 if(!clip.times){ff(['-i',source,'-t','10','-an','-c:v','libx264','-preset','veryfast','-crf','20','-y',path.join(root,'reference.mp4')]);continue;}
 const segments=[];const portrait=!['budget-speed-batch-7','budget-speed-batch-8'].includes(clip.folder);
 for(const [i,s]of clip.times.entries()){
 const output=path.join(root,'balance-part-'+i+'.mp4');segments.push(output);
 const filter=(clip.rotate?'transpose=2,':'')+(portrait?'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2':'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2')+',setsar=1';
 ff(['-ss',String(s[0]),'-i',source,'-t',String(s[1]),'-an','-vf',filter,'-r','24','-c:v','libx264','-preset','veryfast','-crf','20','-y',output]);
 }
 ff([...segments.flatMap(f=>['-i',f]),'-filter_complex',segments.map((_,i)=>'['+i+':v]').join('')+'concat=n='+segments.length+':v=1:a=0[v]','-map','[v]','-c:v','libx264','-preset','veryfast','-crf','20','-y',path.join(root,'reference.mp4')]);
 console.log('Prepared '+clip.folder);
 }
 // Existing Balance fashion films also need a screenshot for Speed.
 for(const folder of ['budget-balance-01','budget-template-01']){
 const root=path.join(__dirname,'../assets',folder),source=path.join(root,'reference.mp4');
 if(fs.existsSync(source))ff(['-ss','1','-i',source,'-frames:v','1','-y',path.join(root,'template-thumbnail.jpg')]);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
