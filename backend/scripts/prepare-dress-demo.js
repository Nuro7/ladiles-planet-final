// Retrieve only the previously approved demo inputs; no generation is submitted.
require('dotenv').config({ quiet: true });
const fs = require('node:fs/promises');
const path = require('node:path');
const media = require('../services/studioMediaService');
async function main() {
  const jobs = JSON.parse(await fs.readFile(path.join(__dirname, '../data/studio-experiences.json'), 'utf8'));
  const previous = jobs.find(job => job.id === '3915ac3e-3166-42f0-bd1d-aee3b2379d3b');
  if (!previous?.assets?.dressViews?.length) throw new Error('Previous demo dress references are missing.');
  const directory = path.join(__dirname, '../data/dress-demo-inputs');
  await fs.mkdir(directory, {recursive:true});
  const bride = await media.remoteImage(previous.assets.brideUrl, 'bride');
  await fs.writeFile(path.join(directory, 'bride.jpg'), bride.buffer);
  for (let i=0;i<previous.assets.dressViews.length;i++) {
    const photo = await media.remoteImage(previous.assets.dressViews[i].url, 'dress-view-'+i);
    await fs.writeFile(path.join(directory, 'dress-view-'+i+'.jpg'), photo.buffer);
  }
  console.log(JSON.stringify({directory,dressViews:previous.assets.dressViews.length}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
