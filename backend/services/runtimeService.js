const fs = require('node:fs/promises');
const path = require('node:path');
const { createWorkQueue } = require('../utils/workQueue');
function limit(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1 || value > 32) throw new Error(`Invalid ${name}; use an integer from 1 to 32.`);
  return value;
}
const media = createWorkQueue({ concurrency: limit('MEDIA_CONCURRENCY', 1) });
const generations = createWorkQueue({ concurrency: limit('GENERATION_CONCURRENCY', 2) });
const tasks = new Set();
let draining = false;
function track(work) {
  const task = Promise.resolve().then(work);
  tasks.add(task);
  task.then(() => tasks.delete(task), () => tasks.delete(task));
  return task;
}
async function middleware(req, res, next) {
  if (draining && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    res.set('Retry-After', '30');
    return res.status(503).json({ success: false, error: 'Server maintenance is in progress. Please try again shortly.' });
  }
  if (process.env.NODE_ENV === 'production' && !['GET','HEAD','OPTIONS'].includes(req.method)
      && /^\/api\/(videos|images)(?:\/|$)/.test(req.path) && !await readiness()) {
    return res.status(503).json({success:false,error:'Server storage needs owner attention. No new work was accepted.'});
  }
  next();
}
async function readiness() {
  if (draining) return false;
  const directory = path.join(__dirname, '..', 'data');
  try {
    await fs.mkdir(directory, { recursive: true });
    const file = path.join(directory, '.ready-' + require('node:crypto').randomUUID());
    await fs.writeFile(file, 'ok', { mode: 0o600, flag: 'wx' });
    await fs.unlink(file);
    const disk = await fs.statfs(directory);
    return Number(disk.bavail) * Number(disk.bsize) >= Number(process.env.MIN_FREE_DISK_MB || 512) * 1024 * 1024;
  } catch { return false; }
}
function installShutdown(server) {
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true; draining = true;
    console.log('[Runtime] Draining requests and background work.');
    const deadline = setTimeout(() => process.exit(1), Number(process.env.SHUTDOWN_TIMEOUT_MS || 300000));
    const closed = new Promise(resolve => server.close(resolve));
    try {
      await closed;
      while (tasks.size || media.status().active || media.status().pending) {
        await Promise.race([Promise.allSettled([...tasks]), new Promise(resolve => setTimeout(resolve, 100))]);
        if (!tasks.size) await new Promise(resolve => setTimeout(resolve, 100));
      }
      await require('../db').client.end({ timeout: 5 });
      clearTimeout(deadline);
      process.exit(0);
    } catch { clearTimeout(deadline); process.exit(1); }
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
module.exports = { media, generations, track, middleware, readiness, installShutdown };
