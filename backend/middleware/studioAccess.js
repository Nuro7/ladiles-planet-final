const { supabaseAdmin } = require('../config/supabase');

// Local development stays usable. Production uses real authentication, independently
// of the legacy middleware's development bypass.
async function studioAccess(req, res, next) {
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if (process.env.NODE_ENV !== 'production' && local) return next();
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ success: false, error: 'Sign in to use the studio.' });
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ success: false, error: 'Your session expired. Sign in again.' });
    const { data: staff } = await supabaseAdmin.from('users').select('id,is_active,role').eq('id', data.user.id).single();
    if (!staff?.is_active) return res.status(403).json({ success: false, error: 'A boutique staff account is required.' });
    req.user = { ...data.user, ...staff };
    next();
  } catch { res.status(503).json({ success: false, error: 'Could not verify your session. Try again.' }); }
}
module.exports = studioAccess;
