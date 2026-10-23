const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/production').validateProduction();
if (process.env.NODE_ENV === 'production') process.umask(0o077);

// Import middleware
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const userRoutes = require('./routes/userRoutes');
const storageRoutes = require('./routes/storageRoutes');
const videoRoutes = require('./routes/videoRoutes');
const imageRoutes = require('./routes/imageRoutes');
const dressRoutes = require('./routes/dressRoutes');
const authRoutes = require('./routes/authRoutes');
const brideRoutes = require('./routes/brideRoutes');
const higgsfieldOAuthRoutes = require('./routes/higgsfieldOAuthRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const landingVideoRoutes = require('./routes/landingVideoRoutes');
const { protect } = require('./middleware/authMiddleware');
const studioAccess = require('./middleware/studioAccess');
const ownerAccess = require('./middleware/ownerAccess');
const security = require('./middleware/security');
const runtime = require('./services/runtimeService');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUSTED_PROXY_CIDRS) app.set('trust proxy', process.env.TRUSTED_PROXY_CIDRS.split(',').map(v => v.trim()));
app.use(security.headers);
app.use(runtime.middleware);

// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(v => v.trim()) : process.env.NODE_ENV === 'production' ? [] : [
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:3001', 'http://127.0.0.1:3001',
        'http://localhost:3002', 'http://127.0.0.1:3002',
        'http://localhost:3003', 'http://127.0.0.1:3003'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use('/api', security.apiLimit);
app.use('/api', (req, res, next) => {
    if (req.is('multipart/form-data')) {
        const size = Number(req.headers['content-length']);
        if (!Number.isFinite(size) || size <= 0) return res.status(411).json({success:false,error:'Upload requires Content-Length.'});
        if (size > 120 * 1024 * 1024) return res.status(413).json({success:false,error:'Total upload must be under 120 MB.'});
    }
    next();
});
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb', parameterLimit: 100 }));
app.use(requestLogger);

// Routes
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Ladies Planet API',
        status: 'Server is running successfully',
        version: '2.0.0',
        architecture: 'Service-Repository Pattern',
        features: {
            supabase: 'Configured',
            s3Storage: 'Configured',
            patterns: ['Repository', 'Service', 'Controller']
        },
        timestamp: new Date().toISOString()
    });
});

// Public landing-page clips (Google Drive proxy; replaces the Vercel-only frontend/api/video.js)
app.use('/api/video', landingVideoRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
            supabase: process.env.SUPABASE_URL ? 'Configured; connectivity not checked' : 'Not configured',
            s3: process.env.SUPABASE_S3_ENDPOINT ? 'Configured; connectivity not checked' : 'Not configured'
        }
    });
});

// Process/data-volume readiness, not a promise that external providers are online.
app.get('/api/ready', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const ready = await runtime.readiness();
    res.status(ready ? 200 : 503).json({ status: ready ? 'READY' : 'NOT_READY' });
});
app.get('/api/operations/status', studioAccess, ownerAccess, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { supabaseAdmin } = require('./config/supabase');
        const { error } = await supabaseAdmin.from('users').select('id').limit(1).abortSignal(AbortSignal.timeout(5000));
        res.json({ success: true, data: {
            database: error ? 'unavailable' : 'reachable',
            persistentDisk: await runtime.readiness() ? 'writable-with-headroom' : 'needs-attention',
            higgsfield: require('./services/higgsfieldOAuthService').getConnectionStatus(),
            generations: runtime.generations.status(), media: runtime.media.status(),
        } });
    } catch { res.status(503).json({ success: false, error: 'A dependency needs owner attention.' }); }
});

// API Routes
console.log('📌 Registering API routes...');
app.use('/api/auth', security.authLimit, authRoutes);
console.log('  ✅ /api/auth');

// Public test route (no auth) — Seedance 2.0 smoke test
app.use('/api/seedance-test', (req, res) => res.status(404).json({ success: false, error: 'Route not available.' }));
console.log('  /api/seedance-test disabled');

// Higgsfield OAuth — Path B (uses consumer subscription credits, not API billing)
// Public because the OAuth callback must be reachable without our auth middleware
app.use('/api/higgsfield-oauth', higgsfieldOAuthRoutes);
console.log('  ✅ /api/higgsfield-oauth (Public — OAuth flow)');

// Pricing — public read-only endpoint
app.use('/api/pricing', studioAccess, security.configLimit, pricingRoutes);
console.log('  /api/pricing (Authenticated)');

// Protected Routes
app.use('/api/users', protect, ownerAccess, userRoutes);
console.log('  ✅ /api/users (Protected)');
app.use('/api/storage', protect, storageRoutes);
console.log('  ✅ /api/storage (Protected)');
// All generation/history/media routes are authenticated before their handlers.
app.use('/api/videos', require('./middleware/mediaAccess').access, (req, res, next) => ['GET','HEAD','OPTIONS'].includes(req.method) ? next() : security.mutationLimit(req,res,next), videoRoutes);
console.log('  /api/videos (Authenticated)');
app.use('/api/images', studioAccess, imageRoutes);
console.log('  /api/images (Authenticated)');
// TEMP for /studio gallery — make brides/dresses public; re-add `protect` once auth flow added
app.use('/api/dresses', studioAccess, dressRoutes);
console.log('  /api/dresses (Authenticated)');
app.use('/api/brides', studioAccess, brideRoutes);
console.log('  /api/brides (Authenticated)');

if (process.env.NODE_ENV === 'production') {
    const path = require('node:path');
    const dist = path.join(__dirname, '../frontend/dist');
    // PWA: revalidate the service worker, manifest and app shell; hashed assets never change.
    const noCache = /(^|\/)(sw\.js|manifest\.webmanifest|index\.html)$/;
    app.use(express.static(dist, { dotfiles: 'deny', setHeaders(res, file) {
        if (noCache.test(file.replace(/\\/g, '/'))) res.setHeader('Cache-Control', 'no-cache');
        else if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } }));
    app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => res.sendFile(path.join(dist, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } }));
}
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5050;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

if (require.main === module) {
 const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 API endpoint: http://localhost:${PORT}`);
    console.log(`🏗️  Architecture: Service-Repository Pattern`);
    console.log(`💾 Database: Supabase`);
    console.log(`📦 Storage: Supabase S3`);
    console.log(`✨ Ready to handle requests!`);
});
 runtime.installShutdown(server);
}
module.exports = app;
