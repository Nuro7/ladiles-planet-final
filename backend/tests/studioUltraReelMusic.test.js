const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const {spawnSync}=require('node:child_process');
const media=require('../services/studioMediaService');
test('each reel soundtrack finishes a local ten-second landscape clip without a provider generation',async()=>{
  const dir=path.join(__dirname,'../data/ultra-reel-verification');
  await fs.mkdir(dir,{recursive:true});
  const silent=path.join(dir,'synthetic-silent-10s.mp4');
  await media.run(['-f','lavfi','-i','color=c=black:s=320x180:r=24','-t','10','-an','-c:v','libx264','-pix_fmt','yuv420p','-y',silent]);
  for(const scene of require('../services/studioUltraReelTemplates')){
    const recipe=scene.subjects.solo;
    const result=await media.finishVideo(silent,recipe,`verification-only-${scene.id}`);
    const probe=spawnSync(media.binary(),['-hide_banner','-i',result.file,'-t','0.1','-f','null','-'],{encoding:'utf8',windowsHide:true});
    assert.equal(probe.status,0);
    assert.match(probe.stderr,/Duration: 00:00:10\.00/);
    assert.match(probe.stderr,/Video:[^\n]*320x180/);
    assert.match(probe.stderr,/Audio: aac/);
  }
});
