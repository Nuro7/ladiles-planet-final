const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const root = require('node:fs').mkdtempSync(path.join(os.tmpdir(),'lp-archive-'));
process.env.STUDIO_MEDIA_ROOT = root;
const remote = require('../utils/safeRemoteMedia');
const media = require('../services/studioMediaService');
test.after(() => fs.rm(root,{recursive:true,force:true}));

test('new image history keeps original bytes independently of the provider URL', async () => {
  const bytes = await require('sharp')({create:{width:20,height:20,channels:3,background:'white'}}).png().toBuffer();
  const original = remote.get;
  remote.get = async () => ({data:bytes});
  try {
    const file = await media.saveGeneratedImage('https://example.com/temporary.png','image-test');
    assert.equal(path.dirname(file),root);
    assert.deepEqual(await fs.readFile(file),bytes);
    await assert.rejects(media.saveGeneratedImage('https://example.com/image','../escape'), /Invalid/);
  } finally {remote.get=original;}
});
test('video without music is archived and served by the protected media route', async () => {
  const original=remote.get;
  const bytes=Buffer.from('downloaded-video-bytes');
  remote.get=async()=>({data:bytes});
  try {
    const result=await media.finishVideo('https://example.com/expiring.mp4',{},'video-test');
    assert.equal(result.url,'/api/videos/studio/media/video-test');
    assert.deepEqual(await fs.readFile(result.file),bytes);
    await assert.rejects(media.finishVideo('http://example.com/video',{},'video-test'),/invalid media URL/);
    remote.get=async()=>{throw new Error('download failed');};
    await assert.rejects(media.finishVideo('https://example.com/expired.mp4',{},'failed-test'),/download failed/);
  } finally {remote.get=original;}
});
