/**
 * imageController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Image generation endpoints — bridal fashion posters via local Google Flow MCP.
 *
 * Mirrors the video-generation flow but for still images using Nano Banana,
 * Nano Banana Pro, and ChatGPT Image. Reuses the `videos` table with
 * type='image_generated' so the History panel can show both kinds.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const storageService     = require('../services/storageService');
const imageEngine      = require('../services/studioHiggsfieldImageService');
const videoRepository    = require('../repositories/videoRepositoryDrizzle');
const brideRepository    = require('../repositories/brideRepository');
const dressRepository    = require('../repositories/dressRepository');
const { listPoses, getPose, previewEnhancement } =
    require('../services/bridalImagePrompts');
const { randomUUID }     = require('crypto');

// USD↔INR + credit→USD rate (kept close to the video controller for parity)
const CREDIT_TO_USD = 0.04;
const USD_TO_INR    = 84;

// Auto-naming helper (matches videoService.js _autoName)
const _autoName = (kind) => {
    const d = new Date();
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${kind} · ${date}, ${time}`;
};

async function _autoSaveBride(imageUrl) {
    try {
        const suffix = Math.random().toString(36).slice(2, 6);
        const name = `${_autoName('Bride')} #${suffix}`;
        const bride = await brideRepository.createBride({ name, status: 'active' });
        await brideRepository.createBrideImage({
            brideId: bride.id, imageUrl, imageType: 'identity', angle: 'front',
        });
        console.log(`💾 [Gallery] Bride auto-saved: "${name}"`);
    } catch (e) {
        console.warn(`⚠️  [Gallery] Bride auto-save skipped: ${e.message}`);
    }
}

async function _autoSaveDress(imageUrl) {
    try {
        const suffix = Math.random().toString(36).slice(2, 6);
        await dressRepository.create({
            id           : randomUUID(),
            name         : `${_autoName('Dress')} #${suffix}`,
            sku          : `AUTO-${Date.now().toString(36).toUpperCase()}-${suffix.toUpperCase()}`,
            image_url    : imageUrl,
            thumbnail_url: imageUrl,
            is_available : true,
            category     : 'auto-saved',
        });
        console.log(`💾 [Gallery] Dress auto-saved`);
    } catch (e) {
        console.warn(`⚠️  [Gallery] Dress auto-save skipped: ${e.message}`);
    }
}

class ImageController {

    // GET /api/images/poses — list pose presets for the studio sidebar
    async getPoses(req, res) {
        try {
            const poses = listPoses();
            res.json({
                success: true,
                data   : poses,
                customSupported: true,
                customHint: "Pass pose='custom' with a customPrompt field to use a user-typed pose direction.",
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/images/enhance-prompt — preview the enhanced version of a user-typed pose
    async enhancePrompt(req, res) {
        try {
            const { userPrompt } = req.body;
            res.json({ success: true, data: previewEnhancement(userPrompt) });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/images/expand-prompt — Gemini-powered keyword → rich pose direction
    async expandPrompt(req, res) {
        try {
            const { userPrompt } = req.body;
            if (!userPrompt || userPrompt.trim().length < 2) {
                return res.status(400).json({ success: false, error: 'userPrompt must be at least 2 chars' });
            }
            const gemini = require('../services/geminiOrchestratorService');
            const data = await gemini.expandSimplePrompt(userPrompt, { kind: 'image' });
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/images/calculate-cost — preflight cost preview
    async calculateCost(req, res) {
        try {
            return res.json({ success: true, data: {
                credits: null, costINR: null, costUSD: null, source: 'higgsfield-mcp',
                message: 'GPT Image 2 · Medium · 2K. The exact Higgsfield credit quote is checked before generation; paid creation remains paused for owner approval.',
            } });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/images/generate
    //
    // Body (multipart): {
    //   brideImage      File (or brideImageUrl)
    //   dressImage      File (or dressImageUrl) — optional
    //   pose            'front_portrait' | 'side_profile' | ... | 'custom'
    //   customPrompt    string — required when pose === 'custom'
    //   model           fixed server-side to GPT Image 2
    //   aspectRatio     '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
    //   quality         'low' | 'medium' | 'high'  (gpt only)
    //   resolution      '1k' | '2k' | '4k'
    // }
    async generateImage(req, res) {
        try {
            const file = req.files?.brideImage?.[0];
            const dressFile = req.files?.dressImage?.[0];
            const { brideImageUrl, dressImageUrl,
                    pose = 'front_portrait', customPrompt = '',
                    aspectRatio = '3:4' } = req.body;
            const model = 'chatgpt-image', quality = 'medium', resolution = '2k';

            if (!file && !brideImageUrl) {
                return res.status(400).json({ success: false, error: 'Bride image (file or URL) is required' });
            }

            const sessionId = randomUUID();
            console.log(`\n🖼️  ════════════════════════════════════════`);
            console.log(`🖼️  [${sessionId}] IMAGE GENERATION REQUEST`);
            console.log(`🖼️  Model: ${model} · Pose: ${pose} · ${aspectRatio} · res: ${resolution}`);
            console.log(`🖼️  ════════════════════════════════════════\n`);

            // Upload bride
            let brideUrl = brideImageUrl;
            let brideWasFresh = false;
            if (!brideUrl && file) {
                const r = await storageService.uploadImage(
                    process.env.SUPABASE_BUCKET_NAME,
                    `images/${sessionId}/bride.${(file.mimetype || 'image/jpeg').split('/')[1]}`,
                    file.buffer, file.mimetype
                );
                brideUrl = r.publicUrl;
                brideWasFresh = true;
            }

            // Upload dress (optional)
            let dressUrl = dressImageUrl;
            let dressWasFresh = false;
            if (!dressUrl && dressFile) {
                const r = await storageService.uploadImage(
                    process.env.SUPABASE_BUCKET_NAME,
                    `images/${sessionId}/dress.${(dressFile.mimetype || 'image/jpeg').split('/')[1]}`,
                    dressFile.buffer, dressFile.mimetype
                );
                dressUrl = r.publicUrl;
                dressWasFresh = true;
            }

            // Resolve prompt from pose preset (or custom)
            if (pose === 'custom' && (!customPrompt || customPrompt.trim().length < 5)) {
                return res.status(400).json({ success: false, error: 'Custom pose needs a customPrompt with at least 5 characters' });
            }
            const poseCfg = getPose(customPrompt.trim().length >= 5 ? 'custom' : pose, customPrompt);

            // Auto-save uploaded assets to the gallery (fire-and-forget,
            // matches the videoService behaviour)
            if (brideWasFresh) _autoSaveBride(brideUrl);
            if (dressWasFresh) _autoSaveDress(dressUrl);

            // Synchronous generation — image models return quickly enough that we
            // don't need a session-poll dance. If it ever needs to be async,
            // wrap this in setImmediate + sessionService.
            const result = await imageEngine.generateImage({
                brideImageUrl: brideUrl,
                dressImageUrl: dressUrl,
                prompt       : poseCfg.prompt + (poseCfg.negativePrompt ? '\nAvoid: ' + poseCfg.negativePrompt : ''),
                sessionId,
                model,
                aspectRatio,
                quality,
                resolution,
            });

            // Persist to history (reuses videos table with type='image_generated')
            try {
                await videoRepository.create({
                    type            : 'image_generated',
                    video_url       : result.imageUrl,   // image URL stored here for parity
                    thumbnail_url   : result.imageUrl,
                    bride_image_url : brideUrl,
                    dress_image_url : dressUrl || null,
                    duration        : null,
                    aspect_ratio    : result.aspectRatio,
                    quality         : result.resolution,
                    metadata: {
                        sessionId,
                        jobId       : result.jobId || null,  // Higgsfield generation ID — prevents sync duplicates
                        kind        : 'image',
                        model       : result.model,
                        provider    : 'higgsfield-mcp',
                        pose,
                        poseLabel   : poseCfg.poseLabel,
                        generatedAt : result.generatedAt,
                    },
                });
                console.log(`[${sessionId}] 💾 Image saved to history`);
            } catch (e) {
                console.warn(`[${sessionId}] ⚠️  History save failed: ${e.message}`);
            }

            res.status(201).json({
                success: true,
                data: {
                    sessionId,
                    imageUrl     : result.imageUrl,
                    brideImageUrl: brideUrl,
                    dressImageUrl: dressUrl || null,
                    model        : result.model,
                    aspectRatio  : result.aspectRatio,
                    resolution   : result.resolution,
                    pose,
                    poseLabel    : poseCfg.poseLabel,
                    generatedAt  : result.generatedAt,
                },
            });
        } catch (err) {
            console.error('❌ Image generation error:', err.message);
            res.status(500).json({ success: false, error: err.message || 'Failed to generate image' });
        }
    }

    // GET /api/images — list generated images for the studio history panel
    async getAllImages(req, res) {
        try {
            const items = await videoRepository.findAll({ type: 'image_generated' });
            await Promise.all(items.map(async item => {
                item.video_url = await storageService.refreshUrl(item.video_url);
                item.thumbnail_url = await storageService.refreshUrl(item.thumbnail_url);
            }));
            res.json({ success: true, data: items, count: items.length });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/images/save-composited
    // Used by the frontend to upload a logo-composited version of a generated
    // image and link it to the original history record.
    async saveComposited(req, res) {
        try {
            const file = req.files?.image?.[0];
            const { originalImageUrl } = req.body;
            if (!file) return res.status(400).json({ success: false, error: 'image file required' });

            const id = randomUUID();
            const upload = await storageService.uploadImage(
                process.env.SUPABASE_BUCKET_NAME,
                `images/composited/${id}.jpg`,
                file.buffer,
                file.mimetype || 'image/jpeg'
            );

            res.json({
                success: true,
                data: {
                    url: upload.publicUrl,
                    originalImageUrl: originalImageUrl || null,
                },
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    async syncFromHiggsfield(req, res) {
        try {
            const higgsfieldMCP   = require('../services/higgsfieldMCPClient');
            const videoRepository = require('../repositories/videoRepositoryDrizzle');

            // Use fetchImageGenerationHistory — image generations are stored in show_generations
            // with type='image', NOT in show_medias (which is the reference media library)
            const items = await higgsfieldMCP.fetchImageGenerationHistory(100);
            let newCount = 0;

            for (const item of items) {
                // Dedup #1: by Higgsfield generation ID
                if (item.id && await videoRepository.findByJobId(item.id)) continue;

                const imageUrl = item.results?.rawUrl   || item.results?.url   || item.results?.image_url
                              || item.result?.rawUrl    || item.result?.url
                              || item.url               || item.image_url;
                if (!imageUrl) continue; // skip pending/incomplete generations

                // Dedup #2: by URL path (stable across re-signed tokens) — catches old records without jobId
                const urlPath = imageUrl.split('?')[0];
                if (await videoRepository.findByUrlPrefix(urlPath)) continue;

                const thumbUrl = item.results?.thumbnailUrl || item.results?.thumbnail_url
                              || item.thumbnail_url || imageUrl;

                await videoRepository.create({
                    type         : 'image_generated',
                    video_url    : imageUrl,
                    thumbnail_url: thumbUrl,
                    metadata     : { source: 'higgsfield_sync', jobId: item.id, model: item.model,
                                     createdAt: item.createdAt, ...(item.params || {}) },
                });
                newCount++;
            }

            if (newCount > 0) console.log(`[Sync] Images: inserted ${newCount} new from Higgsfield`);
            res.json({ success: true, fetched: items.length, synced: newCount });
        } catch (err) {
            console.warn('[Sync] Image sync failed (non-fatal):', err.message);
            res.json({ success: false, error: err.message, synced: 0 });
        }
    }
}

module.exports = new ImageController();
