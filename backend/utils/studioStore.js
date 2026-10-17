const { mkdir, readFile, writeFile, rename } = require('node:fs/promises');
const path = require('node:path');

// One serialized writer per store prevents overlapping uploads/jobs from losing updates.
function createStore(file, initial, options = {}) {
  let value = structuredClone(initial);
  let queue = Promise.resolve();
  const loaded = readFile(file, 'utf8').then(raw => { value = JSON.parse(raw); }).catch(async error => {
    if (options.backup) {
      try { value = JSON.parse(await readFile(file + '.bak', 'utf8')); return; }
      catch (backupError) { if (backupError.code !== 'ENOENT') throw backupError; }
    }
    if (error.code !== 'ENOENT') throw error;
  });
  async function read() { await loaded; return structuredClone(value); }
  async function update(change) {
    queue = queue.catch(() => {}).then(async () => {
      await loaded;
      const next = await change(structuredClone(value));
      await mkdir(path.dirname(file), { recursive: true });
      const temp = file + '.tmp';
      if (options.backup) await writeFile(file + '.bak', JSON.stringify(value, null, 2), { mode: 0o600 });
      await writeFile(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
      for (let attempt = 0; ; attempt++) {
        try { await rename(temp, file); break; }
        catch (error) {
          if (attempt >= 5 || !['EACCES', 'EPERM'].includes(error.code)) throw error;
          await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
        }
      }
      value = next;
      return structuredClone(value);
    });
    return queue;
  }
  return { read, update };
}
module.exports = { createStore };
