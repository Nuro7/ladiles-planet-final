const express = require('express');
const cors = require('cors');
require('dotenv').config();

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
const seedanceTestRoute = require('./routes/seedanceTestRoute');
const higgsfieldOAuthRoutes = require('./routes/higgsfieldOAuthRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const { protect } = require('./middleware/authMiddleware');

const app = express();

// Middleware
const corsOptions = {
    origin: [
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:3001', 'http://127.0.0.1:3001',
        'http://localhost:3002', 'http://127.0.0.1:3002',
        'http://localhost:3003', 'http://127.0.0.1:3003'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.get('/', (req, res) => {
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

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
            supabase: 'Connected',
            s3: 'Configured'
        }
    });
});

// API Routes
console.log('📌 Registering API routes...');
app.use('/api/auth', authRoutes);
console.log('  ✅ /api/auth');

// Public test route (no auth) — Seedance 2.0 smoke test
app.use('/api/seedance-test', seedanceTestRoute);
console.log('  ✅ /api/seedance-test (Public)');

// Higgsfield OAuth — Path B (uses consumer subscription credits, not API billing)
// Public because the OAuth callback must be reachable without our auth middleware
app.use('/api/higgsfield-oauth', higgsfieldOAuthRoutes);
console.log('  ✅ /api/higgsfield-oauth (Public — OAuth flow)');

// Pricing — public read-only endpoint
app.use('/api/pricing', pricingRoutes);
console.log('  ✅ /api/pricing (Public)');

// Protected Routes
app.use('/api/users', protect, userRoutes);
console.log('  ✅ /api/users (Protected)');
app.use('/api/storage', protect, storageRoutes);
console.log('  ✅ /api/storage (Protected)');
// TEMP for /studio testing — make videos public; re-add `protect` once auth flow added to studio
app.use('/api/videos', videoRoutes);
console.log('  ✅ /api/videos (Public for studio testing)');
app.use('/api/images', imageRoutes);
console.log('  ✅ /api/images (Public for image studio)');
// TEMP for /studio gallery — make brides/dresses public; re-add `protect` once auth flow added
app.use('/api/dresses', dressRoutes);
console.log('  ✅ /api/dresses (Public for studio gallery)');
app.use('/api/brides', brideRoutes);
console.log('  ✅ /api/brides (Public for studio gallery)');

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

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 API endpoint: http://localhost:${PORT}`);
    console.log(`🏗️  Architecture: Service-Repository Pattern`);
    console.log(`💾 Database: Supabase`);
    console.log(`📦 Storage: Supabase S3`);
    console.log(`✨ Ready to handle requests!`);
});
