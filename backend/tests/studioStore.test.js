const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createStore } = require('../utils/studioStore');
test('Concurrent updates serialize without losing data, and reads are isolated', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lp-store-test-'));
  const file = path.join(dir, 'state.json');
  const store = createStore(file, { count: 0 });
  await Promise.all(Array.from({ length: 15 }, () => store.update(value => ({ count: value.count + 1 }))));
  assert.equal((await store.read()).count, 15);
  const clone = await store.read(); clone.count = 100;
  assert.equal((await store.read()).count, 15);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).count, 15);
});

test('optional metadata backup restores the previous valid snapshot after corruption', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'lp-store-backup-'));
  const file = path.join(dir, 'mapping.json');
  const store = createStore(file, {}, { backup:true });
  await store.update(() => ({ bride:'Remia' }));
  await store.update(value => ({ ...value, version:2 }));
  await writeFile(file, 'corrupt');
  assert.deepEqual(await createStore(file, {}, { backup:true }).read(), { bride:'Remia' });
});
