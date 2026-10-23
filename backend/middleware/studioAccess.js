const { protect } = require('./authMiddleware');

// Authentication is mandatory unless a local-only development override is explicit.
async function studioAccess(req, res, next) {
  if (req.user?.id) return next();
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_LOCAL_DEV_AUTH === 'true' && local
      && !req.headers['x-forwarded-for'] && !req.headers.forwarded) {
    req.user = { id: 'local-development', role: 'admin', is_active: true };
    return next();
  }
  return protect(req, res, next);
}
module.exports = studioAccess;
