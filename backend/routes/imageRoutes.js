/**
 * imageRoutes.js — bridal fashion image generation routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageController = require('../controllers/imageController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files'), false);
        cb(null, true);
    }
});

// GET  /api/images/poses           → list pose presets
router.get('/poses', imageController.getPoses.bind(imageController));

// POST /api/images/enhance-prompt  → preview enhanced custom pose prompt
router.post('/enhance-prompt', imageController.enhancePrompt.bind(imageController));

// POST /api/images/expand-prompt   → Gemini-powered keyword expansion
router.post('/expand-prompt',  imageController.expandPrompt.bind(imageController));

// POST /api/images/calculate-cost  → preflight cost preview
router.post('/calculate-cost', imageController.calculateCost.bind(imageController));

// POST /api/images/generate        → generate bridal fashion poster
router.post(
    '/generate',
    upload.fields([
        { name: 'brideImage', maxCount: 1 },
        { name: 'dressImage', maxCount: 1 },
    ]),
    imageController.generateImage.bind(imageController)
);

// POST /api/images/save-composited → upload logo-composited variant
router.post(
    '/save-composited',
    upload.fields([{ name: 'image', maxCount: 1 }]),
    imageController.saveComposited.bind(imageController)
);

// GET  /api/images                 → list generated images (for history panel)
router.get('/', imageController.getAllImages.bind(imageController));
// POST /api/images/sync-higgsfield → pull media library from Higgsfield into local DB
router.post('/sync-higgsfield', imageController.syncFromHiggsfield.bind(imageController));

// GET  /api/images/logo            → CORS-friendly proxy for the Ladies Planet
//                                    logo so the frontend canvas can compose it
//                                    onto generated images without taint errors.
//                                    Netlify doesn't send Access-Control-Allow-Origin.
const axios = require('axios');
const LOGO_REMOTE = 'https://ladiesplanet.netlify.app/resources/img/logo%20white.png';
let _logoCache = null;
router.get('/logo', async (req, res) => {
    try {
        if (!_logoCache) {
            const r = await axios.get(LOGO_REMOTE, { responseType: 'arraybuffer', timeout: 10000 });
            _logoCache = Buffer.from(r.data);
        }
        res.set('Content-Type', 'image/png');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(_logoCache);
    } catch (err) {
        res.status(502).json({ success: false, error: 'Logo fetch failed: ' + err.message });
    }
});

// GET /api/images/download?url=...&name=...
// Proxies a remote image/video and serves it with Content-Disposition: attachment
// so the browser downloads it directly (no new tab). Works for cross-origin CDN
// URLs where the HTML5 `download` attribute is ignored by the browser.
router.get('/download', async (req, res) => {
    const fileUrl = decodeURIComponent(req.query.url || '');
    const name = (req.query.name || 'ladies-planet').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!fileUrl || !/^https?:\/\//.test(fileUrl)) {
        return res.status(400).json({ success: false, error: 'Invalid url' });
    }
    try {
        const upstream = await axios.get(fileUrl, { responseType: 'stream', timeout: 30000 });
        const ext = (upstream.headers['content-type'] || '').includes('video') ? 'mp4'
                  : (fileUrl.split('?')[0].split('.').pop() || 'jpg').slice(0, 4);
        res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${name}.${ext}"`);
        upstream.data.pipe(res);
    } catch (err) {
        res.status(502).json({ success: false, error: 'Download failed: ' + err.message });
    }
});

module.exports = router;
