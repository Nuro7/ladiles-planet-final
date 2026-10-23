function createWorkQueue({ concurrency = 1, maxPending = 32 } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || !Number.isInteger(maxPending) || maxPending < 0) throw new Error('Invalid queue limits.');
  let active = 0;
  const pending = [];
  function pump() {
    while (active < concurrency && pending.length) {
      const { work, resolve, reject } = pending.shift();
      active++;
      Promise.resolve().then(work).then(resolve, reject).finally(() => { active--; pump(); });
    }
  }
  function run(work) {
    if (active >= concurrency && pending.length >= maxPending) {
      const error = new Error('The server is busy. Wait for current work to finish before trying again.');
      error.code = 'SERVER_BUSY'; error.status = 503;
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => { pending.push({ work, resolve, reject }); pump(); });
  }
  return { run, status: () => ({ active, pending: pending.length, concurrency }) };
}
module.exports = { createWorkQueue };
