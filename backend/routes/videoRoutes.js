const express = require('express');
const router = express.Router();
const multer = require('multer');
const videoController = require('../controllers/videoController');
router.use('/studio', require('./studioVideoRoutes'));
const ownerAccess = require('../middleware/ownerAccess');
router.use(['/sync-higgsfield','/refresh-urls','/dedup','/rebuild','/check-urls'], ownerAccess);

// Multer config for image uploads (video generation)
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB for images
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Multer config for video uploads (boutique owner uploads)
const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB for videos
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
            return cb(new Error('Only video files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Video generation route (with images)
router.post('/generate',
    imageUpload.fields([
        { name: 'brideImage', maxCount: 1 },
        { name: 'dressImage', maxCount: 1 },
        { name: 'wornDressImage', maxCount: 1 }, // Added this
        { name: 'jewelleryImage', maxCount: 1 },
        { name: 'logo', maxCount: 1 }
    ]),
    videoController.generateVideo.bind(videoController)
);

// Extend an existing video — uses its last frame as start_image for a new clip
router.post('/extend',
    imageUpload.fields([{ name: 'lastFrameImage', maxCount: 1 }]),
    videoController.extendVideo.bind(videoController)
);

// New AI Workflow route
router.post('/workflow',
    videoController.startAIWorkflow.bind(videoController)
);

// Video upload route (boutique owner uploads)
router.post('/upload',
    videoUpload.single('video'),
    videoController.uploadVideo.bind(videoController)
);

// Session status — pipeline progress polling (must be before /:id catch-all)
router.get('/session/:sessionId', videoController.getSessionStatus.bind(videoController));

// Kling webhook callback — called by Kling when a task completes
router.post('/kling-callback', videoController.klingCallback.bind(videoController));

// Higgsfield scenarios — frontend uses this to render preset buttons
router.get('/scenarios', videoController.getScenarios.bind(videoController));

// Higgsfield account balance — for staff dashboard credit display
router.get('/provider/balance', videoController.getProviderBalance.bind(videoController));

// Live cost calculator — frontend calls this when user changes settings to show real-time cost
router.post('/calculate-cost', videoController.calculateCost.bind(videoController));

// Prompt enhancer — shows AI-enhanced version of user's custom prompt
router.post('/enhance-prompt', videoController.enhancePrompt.bind(videoController));
router.post('/expand-prompt',  videoController.expandPrompt.bind(videoController));

// 🧠 SMART GENERATE — natural language → Gemini decides settings → Higgsfield generates
// Body: { userPrompt: "make a 15s sangeet video in 4K", brideImage, dressImage, confirmFirst? }
router.post('/generate-smart',
    imageUpload.fields([
        { name: 'brideImage', maxCount: 1 },
        { name: 'dressImage', maxCount: 1 }
    ]),
    videoController.generateSmartVideo.bind(videoController)
);

// 🧠 Parse-only endpoint — lets frontend show "what Gemini plans" before user confirms
// Body: { userPrompt: "..." }
router.post('/parse-prompt', async (req, res) => {
    try {
        const geminiOrchestrator = require('../services/geminiOrchestratorService');
        const higgsfieldAPIService = require('../services/higgsfieldAPIService');

        const { userPrompt } = req.body;
        if (!userPrompt) return res.status(400).json({ success: false, error: 'userPrompt is required' });

        const plan = await geminiOrchestrator.parseUserRequest(userPrompt);
        const credits = higgsfieldAPIService.calculateCredits(plan);
        const costINR = Math.round(credits * 3.25);

        res.json({
            success: true,
            data: { plan, estimate: { credits, costINR } }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Other routes
router.get('/', videoController.getAllVideos.bind(videoController));
router.post('/sync-higgsfield', videoController.syncFromHiggsfield.bind(videoController));
router.get('/check-urls', videoController.checkUrls.bind(videoController));
router.post('/refresh-urls', videoController.refreshUrls.bind(videoController));
// GET aliases so they can be triggered from the browser address bar (no console needed)
router.post('/dedup', videoController.dedupHistory.bind(videoController));
router.post('/rebuild', videoController.rebuildHistory.bind(videoController));
router.get('/:id', videoController.getVideoById.bind(videoController));
router.post('/save', videoController.saveVideo.bind(videoController));
router.delete('/:id', videoController.deleteVideo.bind(videoController));

module.exports = router;

