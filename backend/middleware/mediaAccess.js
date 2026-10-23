const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const studioAccess = require('./studioAccess');
const { supabaseAdmin } = require('../config/supabase');
const secret = process.env.MEDIA_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const cookieName = 'lp_media';
function issue(req, res) {
  if (!req.user?.id || req.user.id === 'local-development') return;
  const token = jwt.sign({ sub: req.user.id, purpose: 'studio-media' }, secret, { expiresIn: '10m', audience: 'lp-media', issuer: 'lp-backend', algorithm: 'HS256' });
  res.cookie(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/videos/studio', maxAge: 600000 });
}
async function access(req, res, next) {
  const mediaRead = ['GET', 'HEAD'].includes(req.method) && /^\/studio\/(media|showcase|template-thumbnail|template-environment)\//.test(req.path);
  const authenticate = () => studioAccess(req, res, () => { issue(req, res); next(); });
  if (!mediaRead || req.headers.authorization) return authenticate();
  try {
    const cookie = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='));
    if (!cookie) return authenticate();
    const claims = jwt.verify(cookie.slice(cookieName.length + 1), secret, { algorithms: ['HS256'], audience: 'lp-media', issuer: 'lp-backend' });
    if (claims.purpose !== 'studio-media') throw new Error('Invalid scope');
    const { data, error } = await supabaseAdmin.from('users').select('id,is_active,role').eq('id', claims.sub).single();
    if (error || !data?.is_active) throw new Error('Inactive user');
    req.user = data;
    return next();
  } catch { return res.status(401).json({ success: false, error: 'Media session expired. Refresh the studio.' }); }
}
module.exports = { access, issue };
