module.exports = function ownerAccess(req, res, next) {
  if (req.user?.id === 'local-development' && process.env.NODE_ENV === 'development') return next();
  if (req.user?.id && req.user.id === process.env.HIGGSFIELD_OWNER_USER_ID) return next();
  return res.status(403).json({ success: false, error: 'Only the platform owner can perform this action.' });
};
