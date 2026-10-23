let cached, expires = 0, pending;
async function get() {
  if (cached && Date.now() < expires) return cached;
  if (!pending) pending = require('./higgsfieldMCPClient').getBalance().then(value => {
    cached = value; expires = Date.now() + 30000; return value;
  }).catch(error => { cached = null; expires = 0; throw error; }).finally(() => { pending = null; });
  return pending;
}
module.exports = { get };
