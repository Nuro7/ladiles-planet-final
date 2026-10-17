const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, rmdir } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const media = require('../services/studioMediaService');

test('Real FFmpeg processing converts a portrait clip to validated 1080p', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'ladies-planet-upscale-test-'));
  const input = path.join(fixture, 'portrait.mp4');
  let output;
  try {
    await media.run(['-f', 'lavfi', '-i', 'color=c=navy:s=360x640:r=10', '-t', '0.3',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', input]);
    await assert.rejects(media.requireFullHd(input), /1080p/);
    output = await media.fullHdOutput(input, 'test-' + randomUUID(), '9:16');
    assert.notEqual(output, input);
    const details = await media.run(['-i', output, '-frames:v', '1', '-f', 'null', '-']);
    assert.match(details, /1080x1920/);
    await media.requireFullHd(output);
    assert.equal(await media.fullHdOutput(output, 'unused', '9:16'), output);
  } finally {
    if (output) await rm(output, { force: true });
    await rm(input, { force: true });
    await rmdir(fixture);
  }
});
