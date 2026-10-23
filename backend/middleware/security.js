const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const limiter = (limit, windowMs = 60000) => rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please wait before trying again.' } });
module.exports = { headers: helmet({ contentSecurityPolicy: { directives: {
  defaultSrc:["'self'"], scriptSrc:["'self'"], styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],
  fontSrc:["'self'",'https://fonts.gstatic.com','data:'], imgSrc:["'self'",'data:','blob:','https:'],
  mediaSrc:["'self'",'blob:','https:'], connectSrc:["'self'",'https://*.supabase.co','wss://*.supabase.co'],
  objectSrc:["'none'"], frameAncestors:["'none'"]
} } }), apiLimit: limiter(600), authLimit: limiter(15, 15 * 60000),
  mutationLimit: limiter(30), configLimit: limiter(30) };
