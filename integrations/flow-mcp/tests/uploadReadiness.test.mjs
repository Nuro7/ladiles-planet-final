import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForNamedUploads } from '../dist/uploadReadiness.js';

test('completes when ready uploads never appear together in the virtual gallery', async () => {
  let time = 0, scans = 0;
  const result = await waitForNamedUploads(['bride.jpg', 'dress.png', 'scene.png'], async complete => {
    scans++;
    const pages = scans === 1 ? [[{ name: 'bride', ready: true }], [{ name: 'dress.png', ready: false }]]
      : [[{ name: 'dress.png', ready: true }], [{ name: 'scene.png', ready: true }]];
    for (const page of pages) if (complete(page)) return page;
    return pages.at(-1);
  }, 50, { now: () => time, pause: async () => { time += 5; } });
  assert.deepEqual(result.map(asset => asset.name), ['bride', 'dress.png', 'scene.png']);
  assert.equal(scans, 2);
});

test('unrelated completed tiles and incomplete named placeholders never verify an upload', async () => {
  let time = 0;
  await assert.rejects(waitForNamedUploads(['ref1.jpg'], async complete => {
    const tiles = [{ name: 'ref10.jpg', ready: true }, { name: 'ref1.jpg', ready: false }];
    complete(tiles); return tiles;
  }, 10, { now: () => time, pause: async () => { time += 5; } }), /Missing or still uploading: ref1.jpg.*No generation was submitted/);
});
