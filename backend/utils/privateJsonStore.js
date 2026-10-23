const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Single-instance store. Encryption key lives in the hosting secret manager,
// never beside the encrypted files or in a source archive.
function privateJsonStore(directory, encodedKey) {
  const key = encodedKey ? Buffer.from(encodedKey, 'base64') : null;
  if (key && (key.length !== 32 || key.toString('base64') !== encodedKey)) {
    throw new Error('HIGGSFIELD_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  const fileFor = name => {
    if (path.basename(name) !== name) throw new Error('Invalid private store name.');
    return path.join(directory, name);
  };
  function write(name, value) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    let serialized = JSON.stringify(value);
    if (key) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(name));
      const data = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
      serialized = JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
    }
    const target = fileFor(name), temp = target + '.' + crypto.randomUUID() + '.tmp';
    let fd;
    try {
      fd = fs.openSync(temp, 'wx', 0o600);
      fs.writeFileSync(fd, serialized);
      fs.fsyncSync(fd);
      fs.closeSync(fd); fd = undefined;
      fs.renameSync(temp, target);
      fs.chmodSync(target, 0o600);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }
  function read(name) {
    let raw;
    try { raw = fs.readFileSync(fileFor(name), 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    try {
      const envelope = JSON.parse(raw);
      if (envelope.version === 1 && envelope.iv && envelope.tag && envelope.data) {
        if (!key) throw new Error('Encryption key required.');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
        decipher.setAAD(Buffer.from(name));
        decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
        return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
      }
      // Upgrade existing local state when the owner configures encryption.
      if (key) write(name, envelope);
      return envelope;
    } catch {
      throw new Error('Private connection state could not be opened. Check the encryption key or restore the backup; state was not overwritten.');
    }
  }
  function remove(name) {
    try { fs.unlinkSync(fileFor(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { read, write, remove };
}
module.exports = { privateJsonStore };
