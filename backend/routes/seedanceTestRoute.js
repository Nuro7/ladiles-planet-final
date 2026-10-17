/**
 * Public route — Seedance 2.0 smoke test
 *
 * POST /api/seedance-test/generate
 *   multipart/form-data:
 *     bride       : image file (required)
 *     dress       : image file (required)
 *     presetId    : "1" or "2"  (optional, mutually exclusive with prompt)
 *     prompt      : free-text prompt (optional)
 *     aspectRatio : "16:9" | "9:16" | "1:1" | ... (optional, default 16:9)
 *
 * GET /api/seedance-test/presets
 *   Returns the available preset prompts (for the UI to display labels).
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const seedanceService = require('../services/seedanceService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }, // Seedance allows up to 30MB per image
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
        cb(null, true);
    }
});

router.get('/presets', (_req, res) => {
    res.json({
        success: true,
        model: seedanceService.MODEL_ID,
        supportedAspectRatios: seedanceService.SUPPORTED_ASPECT_RATIOS,
        presets: Object.values(seedanceService.PRESETS).map(p => ({
            id: p.id,
            label: p.label,
            aspect_ratio: p.aspect_ratio
        }))
    });
});

router.post(
    '/generate',
    upload.fields([
        { name: 'bride', maxCount: 1 },
        { name: 'dress', maxCount: 1 }
    ]),
    async (req, res) => {
        // Long-running endpoint — generation can take 3-5 minutes
        req.setTimeout(15 * 60 * 1000);
        res.setTimeout(15 * 60 * 1000);
        try {
            const bride = req.files?.bride?.[0];
            const dress = req.files?.dress?.[0];
            if (!bride || !dress) {
                return res.status(400).json({ success: false, error: 'Both bride and dress images are required' });
            }

            const presetIdRaw = req.body.presetId;
            const presetId = presetIdRaw ? Number(presetIdRaw) : null;
            const customPrompt = req.body.prompt || '';
            const aspectRatio = req.body.aspectRatio || '16:9';

            if (!presetId && !customPrompt.trim()) {
                return res.status(400).json({ success: false, error: 'Either presetId or prompt is required' });
            }

            console.log(`🎬 [seedance-test] Starting — preset:${presetId || 'custom'} ratio:${aspectRatio}`);

            const result = await seedanceService.generateReferenceVideo({
                brideBuffer: bride.buffer,
                brideFilename: bride.originalname,
                dressBuffer: dress.buffer,
                dressFilename: dress.originalname,
                presetId,
                customPrompt,
                aspectRatio,
                onProgress: ({ status, elapsedSec, message }) => {
                    console.log(`   [${elapsedSec.toFixed(1)}s] ${status}: ${message}`);
                }
            });

            console.log(`✅ [seedance-test] Done in ${result.totalSec.toFixed(1)}s — ${result.videoUrl}`);

            res.json({
                success: true,
                data: {
                    videoUrl: result.videoUrl,
                    totalSec: result.totalSec,
                    aspectRatio: result.aspectRatio,
                    seed: result.seed
                }
            });
        } catch (err) {
            // Stringify deeply so the validation details are not truncated as [Object]
            const fullBody = err.body ? JSON.stringify(err.body, null, 2) : null;
            console.error('❌ [seedance-test] Error:', err.message);
            if (fullBody) console.error('   Full body:\n', fullBody);
            if (err.status) console.error('   Status:', err.status);
            res.status(500).json({
                success: false,
                error: err.message || 'Generation failed',
                details: err.body || null
            });
        }
    }
);

module.exports = router;
