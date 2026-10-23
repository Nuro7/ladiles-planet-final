const fs=require('node:fs/promises');
const path=require('node:path');
const media=require('../services/studioMediaService');
async function main(){
  const downloads='C:/Users/MOHD MINHAJ/Downloads';
  const candidates=(await fs.readdir(downloads)).filter(name=>name.startsWith('A vision of grace, love, and endless beauty') && name.endsWith('.mp4'));
  if(candidates.length!==1)throw new Error('Expected one exact owner-supplied source video.');
  const source=path.join(downloads,candidates[0]),root=path.join(__dirname,'../assets/ultra-fast-luxury-01');
  await fs.mkdir(root,{recursive:true});
  const diagnostic=await media.run(['-i',source,'-frames:v','1','-f','null','-']);
  await media.run(['-i',source,'-t','10','-vn','-c:a','aac','-b:a','192k','-y',path.join(root,'music.m4a')]);
  await media.validateTrack(path.join(root,'music.m4a'));
  await media.run(['-ss','1.5','-i',source,'-frames:v','1','-vf','scale=480:-2','-y',path.join(root,'template-thumbnail.jpg')]);
  await media.run(['-i',source,'-t','10','-vf','fps=1,scale=240:-2,tile=5x2','-frames:v','1','-y',path.join(root,'scene-review.jpg')]);
  console.log(JSON.stringify({source,root,streams:diagnostic.split('\n').filter(line=>/Duration:|Stream.*Audio:|Stream.*Video:/.test(line)).map(line=>line.trim())},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
