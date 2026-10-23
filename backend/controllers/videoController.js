
const videoService         = require('../services/videoService');
const aiWorkflowService    = require('../services/aiWorkflowService');
const sessionService       = require('../services/sessionService');
const connectionManager    = require('../websocket/connectionManager');
const { listScenarios, previewEnhancement } = require('../services/bridalScenarioPrompts');
const higgsfieldAPIService = require('../services/higgsfieldAPIService');
const geminiOrchestrator   = require('../services/geminiOrchestratorService');
const { randomUUID }       = require('crypto');

class VideoController {
    async generateVideo(req, res) {
        console.log('\n🎯 ========================================');
        console.log('📥 RECEIVED REQUEST AT /api/videos/generate');
        console.log('========================================');
        console.log('⏰ Time:', new Date().toISOString());
        console.log('🌐 Method:', req.method);
        console.log('📦 Files received:', req.files ? Object.keys(req.files) : 'NONE');
        console.log('📋 Body:', req.body);
        console.log('========================================\n');

        try {
            const {
                jewelleryStyle,
                appearanceMode,
                background,
                makeup,
                showBranding,
                brideImageUrl,
                brideId,
                generationMode,
                wornDressImageUrl,
                weddingType,
                outfitType,       // 'dress' | 'combination' — controls VTON mode
                enableSound,      // boolean — run add-sound step
                videoDuration,    // number — 5 | 10 | 15 (default 15, Kling v3)
                scenario,         // string — 'stage_entry' | 'mandap_moment' | 'sangeet_dance' | 'sofa_pose' | 'reception_walk' | 'custom'
                customPrompt,     // string — required when scenario === 'custom' (user-typed prompt)
                resolution,       // string — '480p' | '720p' | '1080p' (Higgsfield)
                mode,             // 'fast' | 'std'
                model,            // 'kling-3.0' | 'seedance-2.0-fast' | etc
                multiShot,        // boolean
                sceneDescription
            } = req.body;

            if (generationMode === 'vton') {
                const hasDressFile = req.files?.dressImage;
                const hasDressUrl  = !!req.body?.dressImageUrl;
                if (!hasDressFile && !hasDressUrl) {
                    console.log('❌ Validation failed: Missing dress image file/URL for VTON');
                    return res.status(400).json({
                        success: false,
                        error: 'Dress image (file or URL) is required for Virtual Try-On'
                    });
                }
            } else if (generationMode === 'worn_dress') {
                if (!req.files?.wornDressImage && !wornDressImageUrl) {
                    console.log('❌ Validation failed: Missing worn dress image');
                    return res.status(400).json({
                        success: false,
                        error: 'Worn dress image (file or URL) is required for Worn Dress Mode'
                    });
                }
            }

            if (!req.files?.brideImage && !brideImageUrl) {
                console.log('❌ Validation failed: Missing bride identity image');
                return res.status(400).json({
                    success: false,
                    error: 'Bride identity image is required for consistency'
                });
            }


            console.log('✅ Validation passed - preparing images');

            const images = {
                brideImage: req.files?.brideImage ? req.files.brideImage[0] : null,
                brideImageUrl: brideImageUrl || null,
                brideId: brideId || null,
                dressImage: req.files?.dressImage ? req.files.dressImage[0] : null,
                dressImageUrl: req.body?.dressImageUrl || null,        // gallery-picked dress URL
                wornDressImage: req.files?.wornDressImage ? req.files.wornDressImage[0] : null,
                wornDressImageUrl: wornDressImageUrl || null,
                jewelleryImage: req.files?.jewelleryImage ? req.files.jewelleryImage[0] : null,
                logo: req.files?.logo ? req.files.logo[0] : null
            };

            const options = {
                jewelleryStyle,
                appearanceMode,
                background,
                makeup           : makeup || 'minimal',
                showBranding     : showBranding === 'true',
                generationMode   : generationMode || 'vton',
                weddingType      : weddingType    || 'bride_only',
                outfitType       : outfitType     || 'dress',
                enableSound      : enableSound !== 'false' && enableSound !== false,
                videoDuration    : Number(videoDuration) || 15,
                scenario         : scenario || 'stage_entry',   // Higgsfield default scenario
                customPrompt     : customPrompt || '',           // Optional custom prompt
                resolution       : resolution || '720p',
                mode             : mode || 'fast',
                model            : model || 'kling-3.0',
                multiShot        : multiShot !== 'false' && multiShot !== false,
                sceneDescription
            };


            console.log('🚀 Calling videoService.generateVideo...');
            const result = await videoService.generateVideo(images, options);

            console.log('✅ Video service completed successfully');
            res.status(201).json({
                success: true,
                data: result,
                message: 'Video generated successfully'
            });
        } catch (error) {
            console.error('❌ ❌ ❌ VIDEO GENERATION ERROR:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate video'
            });
        }
    }

    /**
     * GET /api/videos/session/:sessionId
     * Frontend polls this to get pipeline status without WebSocket.
     */
    async getSessionStatus(req, res) {
        const { sessionId } = req.params;
        const session = sessionService.get(sessionId);

        if (!session) {
            return res.status(404).json({
                success : false,
                error   : `Session not found: ${sessionId}`
            });
        }

        res.json({
            success  : true,
            data     : session
        });
    }

    /**
     * POST /api/videos/kling-callback
     * Kling calls this when a task completes (omni-video, add-sound, etc.)
     * Set KLING_CALLBACK_URL=https://your-domain.com/api/videos/kling-callback in .env
     */
    async klingCallback(req, res) {
        // Acknowledge immediately — Kling expects 200 fast
        res.status(200).json({ received: true });

        try {
            const body = req.body;
            const taskStatus  = body?.data?.task_status;
            const sessionId   = body?.data?.external_task_id; // set by us when submitting
            const videoUrl    = body?.data?.task_result?.videos?.[0]?.url;

            console.log(`\n[KlingCallback] task_status: ${taskStatus} | session: ${sessionId}`);

            if (!sessionId) {
                console.warn('[KlingCallback] No external_task_id — cannot match session');
                return;
            }

            if (taskStatus === 'succeed' && videoUrl) {
                console.log(`[KlingCallback] ✅ Video ready: ${videoUrl.slice(0, 60)}...`);

                // Update session immediately
                sessionService.complete(sessionId, {
                    success      : true,
                    sessionId,
                    videoUrl,
                    allShotUrls  : [videoUrl],
                    duration     : 15,
                    aspectRatio  : '16:9',
                    createdAt    : new Date().toISOString(),
                    viaCallback  : true
                });

                // Push WebSocket notification — frontend gets video instantly
                connectionManager.notify(sessionId, {
                    status      : 'completed',
                    message     : '✨ Cinematic Bridal Video Ready!',
                    progress    : 100,
                    videoUrl,
                    allShotUrls : [videoUrl]
                });

            } else if (taskStatus === 'failed') {
                const reason = body?.data?.task_status_msg || 'unknown';
                console.error(`[KlingCallback] ❌ Task failed: ${reason}`);
                sessionService.fail(sessionId, reason);
                connectionManager.notify(sessionId, {
                    status  : 'error',
                    message : `Pipeline failed: ${reason}`,
                    progress: 0
                });
            }
        } catch (err) {
            console.error('[KlingCallback] Handler error:', err.message);
        }
    }

    async startAIWorkflow(req, res) {
        const sessionId = randomUUID();
        console.log(`\n🎯 Start AI Workflow [${sessionId}]`);

        try {
            const {
                clientImageUrl,
                dressImageUrl,
                wornDressImageUrl,
                weddingType,
                outfitType,
                extendClips,
                enableSound,
                customDetails
            } = req.body;

            const payload = {
                sessionId,
                clientImageUrl,
                dressImageUrl,
                wornDressImageUrl,
                customDetails: {
                    weddingType  : weddingType || 'bride_only',
                    outfitType   : outfitType  || 'dress',
                    extendClips  : extendClips  === true || extendClips  === 'true',
                    enableSound  : enableSound  !== false && enableSound !== 'false',
                    ...customDetails
                }
            };

            // Use fire-and-forget — returns immediately with sessionId
            aiWorkflowService.initiateWorkflow(payload);

            res.status(202).json({
                success  : true,
                sessionId,
                status   : 'started',
                message  : 'Pipeline started. Poll GET /api/videos/session/:sessionId for status.'
            });
        } catch (error) {
            console.error(`❌ Workflow Error [${sessionId}]:`, error);
            res.status(500).json({
                success : false,
                sessionId,
                error   : error.message || 'AI Workflow failed'
            });
        }
    }


    async getAllVideos(req, res) {
        try {
            const { type } = req.query; // 'generated' or 'uploaded'
            const videos = await videoService.getAllVideos(type);
            res.json({
                success: true,
                data: videos,
                count: videos.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async uploadVideo(req, res) {
        console.log('\n🎯 ========================================');
        console.log('📥 RECEIVED REQUEST AT /api/videos/upload');
        console.log('========================================');
        console.log('⏰ Time:', new Date().toISOString());
        console.log('📦 File received:', req.file ? req.file.originalname : 'NONE');
        console.log('📋 Body:', req.body);
        console.log('========================================\n');

        try {
            if (!req.file) {
                console.log('❌ Validation failed: No video file provided');
                return res.status(400).json({
                    success: false,
                    error: 'Video file is required'
                });
            }

            const { title, description } = req.body;

            if (!title) {
                console.log('❌ Validation failed: Missing title');
                return res.status(400).json({
                    success: false,
                    error: 'Video title is required'
                });
            }

            console.log('✅ Validation passed - uploading video');

            const videoData = {
                title,
                description: description || '',
                type: 'uploaded'
            };

            const result = await videoService.uploadVideo(req.file, videoData);

            console.log('✅ Video uploaded successfully');
            res.status(201).json({
                success: true,
                data: result,
                message: 'Video uploaded successfully'
            });
        } catch (error) {
            console.error('❌ VIDEO UPLOAD ERROR:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to upload video'
            });
        }
    }

    async getVideoById(req, res) {
        try {
            const { id } = req.params;
            const video = await videoService.getVideoById(id);
            res.json({
                success: true,
                data: video
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message
            });
        }
    }

    async saveVideo(req, res) {
        try {
            const videoData = req.body;
            const video = await videoService.saveVideo(videoData);
            res.status(201).json({
                success: true,
                data: video,
                message: 'Video saved to gallery'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /api/videos/scenarios
     * Returns all preset bridal scenarios for the frontend to render buttons.
     * Frontend uses this to know what scenario IDs to send back when generating.
     */
    async getScenarios(req, res) {
        try {
            const scenarios = listScenarios();
            res.json({
                success: true,
                data   : scenarios,
                customSupported: true,
                customHint: "Pass scenario='custom' with a customPrompt field to use a user-typed prompt instead of a preset."
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/videos/balance
     * Returns current Higgsfield account balance + plan info.
     * Frontend uses this to display credits remaining on the staff dashboard.
     */
    async getProviderBalance(req, res) {
        const higgsfieldMCPClient = require('../services/higgsfieldMCPClient');
        let mcpErr, restErr;

        // Prefer MCP/OAuth balance (consumer subscription credits)
        // — that's the pool that actually gets charged for our generations.
        try {
            const balance = await require('../services/studioBalanceCache').get();
            return res.json({ success: true, data: balance });
        } catch (e) { mcpErr = e; }

        // Fallback to REST API balance if OAuth is degraded
        try {
            const balance = await higgsfieldAPIService.getBalance();
            return res.json({ success: true, data: balance });
        } catch (e) { restErr = e; }

        // Both failed — return a clean "unknown" state plus a reconnect hint
        // so the UI shows "—" instead of a raw error, and tells the user how
        // to recover. 200 keeps the studio working; the badge can show the hint.
        console.warn(`[Balance] Both providers failed → MCP: ${mcpErr?.message} | REST: ${restErr?.message}`);
        return res.json({
            success: true,
            data: {
                credits           : null,
                subscription_plan_type : 'unknown',
                _degraded         : true,
                _hint             : 'Higgsfield session may have expired. Reconnect at /api/higgsfield-oauth/start to refresh.'
            }
        });
    }

    /**
     * POST /api/videos/extend
     * Generate a continuation clip that visually starts from the last frame
     * of a previously generated video. Frontend captures the last frame in
     * canvas and uploads it as `lastFrameImage` (multipart) along with a
     * continuation prompt + duration. We submit a single-image start_image
     * generation to Higgsfield and return the new sessionId.
     *
     * Body (multipart): {
     *   lastFrameImage  : File          (required — captured last frame)
     *   prompt          : string        (required — what should happen next)
     *   duration        : number        (optional — default 5)
     *   resolution      : string        (optional — default '720p')
     *   model           : string        (optional — default 'seedance-2.0-fast')
     *   parentVideoUrl  : string        (optional — for history linking)
     * }
     */
    async extendVideo(req, res) {
        try {
            const storageService  = require('../services/storageService');
            const higgsfieldMCP   = require('../services/higgsfieldMCPClient');
            const sessionService  = require('../services/sessionService');
            const videoRepository = require('../repositories/videoRepositoryDrizzle');
            const connectionManager = require('../websocket/connectionManager');
            const cdnDownloader   = require('../utils/cdnDownloader');
            const { randomUUID }  = require('crypto');

            const file = req.files?.lastFrameImage?.[0];
            if (!file) {
                return res.status(400).json({ success: false, error: 'lastFrameImage file is required' });
            }

            const { prompt, duration, resolution, model, mode, parentVideoUrl } = req.body;
            if (!prompt || String(prompt).trim().length < 5) {
                return res.status(400).json({ success: false, error: 'prompt is required (min 5 chars)' });
            }

            const sessionId = randomUUID();
            console.log(`\n🎞️  ════════════════════════════════════════`);
            console.log(`🎞️  [${sessionId}] VIDEO EXTEND REQUEST`);
            console.log(`🎞️  Model: ${model || 'seedance-2.0-fast'} · ${duration || 5}s · ${resolution || '720p'}`);
            console.log(`🎞️  Prompt: ${String(prompt).slice(0, 120)}...`);
            console.log(`🎞️  ════════════════════════════════════════\n`);

            // 1) Upload the captured last frame to Supabase
            const ext = (file.mimetype || 'image/jpeg').split('/')[1] || 'jpg';
            const upload = await storageService.uploadImage(
                process.env.SUPABASE_BUCKET_NAME,
                `extends/${sessionId}/last-frame.${ext}`,
                file.buffer,
                file.mimetype
            );
            const startFrameUrl = upload.publicUrl;
            console.log(`🖼️  Last frame uploaded: ${startFrameUrl}`);

            // 2) Create a session for progress tracking
            sessionService.create(sessionId, {
                status  : 'started',
                message : 'Extending video...',
                kind    : 'extend',
            });

            // Return sessionId immediately — pipeline runs in background
            res.status(201).json({
                success: true,
                data: {
                    sessionId,
                    status: 'started',
                    message: 'Extend pipeline started. Poll session for progress.',
                    startFrameUrl,
                }
            });

            // 3) Fire-and-forget pipeline
            setImmediate(async () => {
                try {
                    // Look up the parent video's bride + dress URLs so we can
                    // pass them as identity-lock references to the extend call.
                    // Without this, the model only sees the last frame and the
                    // face drifts across the extension.
                    let parentBrideUrl = null, parentDressUrl = null, parentRecord = null;
                    try {
                        const allVids = await videoRepository.findAll();
                        parentRecord = allVids.find(v => v.video_url === parentVideoUrl);
                        if (parentRecord) {
                            parentBrideUrl = parentRecord.bride_image_url || null;
                            parentDressUrl = parentRecord.dress_image_url || null;
                            console.log(`[${sessionId}] 🔍 Parent found: bride=${!!parentBrideUrl} dress=${!!parentDressUrl}`);
                        } else {
                            console.warn(`[${sessionId}] ⚠️  Parent video not in DB — extending with last frame only (identity may drift)`);
                        }
                    } catch (lookupErr) {
                        console.warn(`[${sessionId}] ⚠️  Parent lookup failed: ${lookupErr.message}`);
                    }

                    sessionService.update(sessionId, { status: 'generating', progress: 30, message: 'AI extending your video...' });
                    connectionManager.notify(sessionId, { status: 'progress', progress: 30, message: 'AI extending your video...' });

                    const result = await higgsfieldMCP.extendVideo({
                        startFrameUrl,
                        brideImageUrl: parentBrideUrl,    // ← identity lock
                        dressImageUrl: parentDressUrl,    // ← outfit lock
                        prompt   : String(prompt),
                        sessionId,
                        model    : model      || 'seedance-2.0-fast',
                        duration : Number(duration) || 5,
                        resolution: resolution || '720p',
                        mode     : mode       || 'fast',
                    });

                    // 4) Concat parent video + extension into ONE seamless MP4 so
                    //    the result plays as a single continuous clip in the studio.
                    let mergedUrl = result.videoUrl;
                    if (parentVideoUrl) {
                        try {
                            sessionService.update(sessionId, { status: 'stitching', progress: 80, message: 'Stitching with original video...' });
                            connectionManager.notify(sessionId, { status: 'progress', progress: 80, message: 'Stitching with original video...' });

                            const { concatVideos } = require('../services/videoConcatService');
                            const fs = require('fs');
                            const localMerged = await concatVideos([parentVideoUrl, result.videoUrl]);

                            // Upload merged file to Supabase via storage service
                            const buf = fs.readFileSync(localMerged);
                            const upload = await storageService.uploadVideo(
                                process.env.SUPABASE_BUCKET_NAME,
                                `extends/${sessionId}/merged.mp4`,
                                buf,
                                'video/mp4'
                            );
                            mergedUrl = upload.publicUrl;
                            console.log(`[${sessionId}] 🔗 Merged video → ${mergedUrl.slice(-60)}`);
                            try { fs.unlinkSync(localMerged); } catch {}
                        } catch (concatErr) {
                            console.warn(`[${sessionId}] ⚠️  Concat failed (${concatErr.message}) — returning extension alone`);
                            mergedUrl = result.videoUrl;
                        }
                    }

                    const finalResult = {
                        success         : true,
                        sessionId,
                        videoUrl        : mergedUrl,             // ← merged plays as one
                        extensionUrl    : result.videoUrl,       // ← raw extension clip
                        duration        : result.duration,
                        resolution      : result.resolution,
                        model           : result.model,
                        kind            : 'extend',
                        parentVideoUrl  : parentVideoUrl || null,
                        merged          : mergedUrl !== result.videoUrl,
                        createdAt       : result.generatedAt,
                    };

                    sessionService.complete(sessionId, finalResult);
                    connectionManager.notify(sessionId, {
                        status: 'progress', progress: 100,
                        message: '✨ Extended video ready!',
                        videoUrl: mergedUrl,
                    });

                    // Save the merged version to history so it shows up correctly
                    try {
                        await videoRepository.create({
                            type          : 'generated',
                            video_url     : mergedUrl,
                            thumbnail_url : parentRecord?.thumbnail_url || startFrameUrl,
                            bride_image_url: parentBrideUrl || startFrameUrl,
                            dress_image_url: parentDressUrl || null,
                            duration      : (parentRecord?.duration || 0) + result.duration,
                            aspect_ratio  : '16:9',
                            quality       : result.resolution,
                            metadata      : {
                                sessionId,
                                kind            : 'extend',
                                parentVideoUrl  : parentVideoUrl || null,
                                extensionClipUrl: result.videoUrl,
                                merged          : mergedUrl !== result.videoUrl,
                                model           : result.model,
                                provider        : 'higgsfield',
                                generatedAt     : result.generatedAt,
                                promptUsed      : String(prompt).slice(0, 500),
                            }
                        });
                        console.log(`[${sessionId}] 💾 Merged extension saved to history`);
                    } catch (saveErr) {
                        console.warn(`[${sessionId}] ⚠️  History save failed: ${saveErr.message}`);
                    }
                    console.log(`[${sessionId}] 🎉 EXTEND COMPLETE → ${mergedUrl.slice(0, 60)}...\n`);
                } catch (err) {
                    console.error(`[${sessionId}] ❌ Extend failed:`, err.message);
                    sessionService.fail(sessionId, err.message);
                    connectionManager.notify(sessionId, { status: 'error', progress: 0, message: err.message });
                }
            });

        } catch (err) {
            console.error('❌ Extend endpoint error:', err);
            res.status(500).json({ success: false, error: err.message || 'Failed to start extend' });
        }
    }

    /**
     * POST /api/videos/generate-smart
     * NATURAL LANGUAGE → Gemini orchestrator → Higgsfield generation
     *
     * Body: {
     *   userPrompt    : "make me a 15s sangeet dance video in 4K",
     *   brideImage    : <file>,
     *   dressImage    : <file>,
     *   confirmFirst  : (optional) boolean — if true, return Gemini's plan
     *                   without generating yet (preview mode)
     * }
     */
    async generateSmartVideo(req, res) {
        console.log('\n🧠 ========================================');
        console.log('📥 SMART GENERATE — natural language → Gemini → Higgsfield');
        console.log('========================================');
        console.log('⏰', new Date().toISOString());
        console.log('📋 User prompt:', req.body?.userPrompt);
        console.log('📦 Files:', req.files ? Object.keys(req.files) : 'NONE');
        console.log('========================================\n');

        try {
            const { userPrompt, confirmFirst, brideImageUrl } = req.body;

            if (!userPrompt || userPrompt.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    error: 'userPrompt is required (at least 3 characters)'
                });
            }

            if (!req.files?.brideImage && !brideImageUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Bride image is required'
                });
            }
            if (!req.files?.dressImage && !req.body?.dressImageUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Dress image is required'
                });
            }

            // 1. Let Gemini parse the user's natural language → settings
            const plan = await geminiOrchestrator.parseUserRequest(userPrompt);

            // 2. Calculate estimated cost upfront
            const estimatedCredits = higgsfieldAPIService.calculateCredits({
                duration   : plan.duration,
                resolution : plan.resolution,
                mode       : plan.mode,
                multiShot  : plan.multiShot,
                sound      : plan.sound
            });
            const estimatedCostINR = Math.round(estimatedCredits * 3.25);

            // 3. If confirmFirst flag → return plan without generating (preview mode)
            if (confirmFirst === 'true' || confirmFirst === true) {
                return res.json({
                    success: true,
                    mode: 'preview',
                    plan,
                    estimate: {
                        credits : estimatedCredits,
                        costINR : estimatedCostINR
                    },
                    message: 'Plan generated. Send the same request without confirmFirst flag to execute.'
                });
            }

            // 4. Otherwise → generate the video using the Gemini-chosen settings
            //    Reuse the existing generateVideo flow by mutating req.body
            req.body.scenario     = plan.scenario;
            req.body.customPrompt = plan.customPrompt;
            req.body.model        = plan.model;
            req.body.videoDuration= plan.duration;
            req.body.resolution   = plan.resolution;
            req.body.mode         = plan.mode;
            req.body.multiShot    = plan.multiShot;
            req.body.enableSound  = plan.sound;
            req.body.generationMode = 'vton';

            // Attach Gemini's reasoning to the response for transparency
            req.body._geminiPlan = plan;

            return await this.generateVideo(req, res);

        } catch (err) {
            console.error('❌ Smart generate error:', err);
            res.status(500).json({
                success : false,
                error   : err.message || 'Smart generate failed'
            });
        }
    }

    /**
     * POST /api/videos/enhance-prompt
     * Preview the AI-enhanced version of a user's typed custom prompt.
     * Returns: { original, enhanced, negativePrompt }
     */
    async enhancePrompt(req, res) {
        try {
            const { userPrompt } = req.body;
            if (!userPrompt || userPrompt.trim().length < 3) {
                return res.status(400).json({ success: false, error: 'userPrompt must be at least 3 chars' });
            }
            const data = previewEnhancement(userPrompt);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * POST /api/videos/expand-prompt
     * Take simple user keywords (e.g. "bride rotating scene") and expand them
     * into a rich cinematic wedding scene prompt via Gemini. Falls back to a
     * deterministic template if Gemini isn't available.
     *
     * Body: { userPrompt: string, kind?: 'video' | 'image' }
     * Returns: { expanded, source: 'gemini' | 'template', fallback? }
     */
    async expandPrompt(req, res) {
        try {
            const { userPrompt, kind = 'video' } = req.body;
            if (!userPrompt || userPrompt.trim().length < 2) {
                return res.status(400).json({ success: false, error: 'userPrompt must be at least 2 chars' });
            }
            const data = await geminiOrchestrator.expandSimplePrompt(userPrompt, { kind });
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * POST /api/videos/calculate-cost
     * Live credit estimator — used by frontend to show cost in real-time
     * as user changes duration/resolution/mode sliders.
     */
    async calculateCost(req, res) {
        try {
            const { duration, resolution, mode, multiShot, sound, model } = req.body;
            const settings = {
                model      : model || 'seedance-2.0-fast',
                duration   : Number(duration) || 5,
                resolution : resolution || '720p',
                mode       : mode || 'fast',
                multiShot  : multiShot !== false && multiShot !== 'false',
                sound      : sound !== false && sound !== 'false'
            };

            // Try REAL cost from the AI engine first (uses get_cost preflight — no credits spent)
            let credits, source = 'formula';
            try {
                const higgsfieldMCPClient = require('../services/higgsfieldMCPClient');
                const real = await higgsfieldMCPClient.getRealCost(settings);
                credits = real.credits;
                source = 'engine';
            } catch (err) {
                // Fallback to the local formula (offline / not authenticated / unknown model).
                // Log WHY so a wrong model_id (e.g. Grok) is visible instead of silently
                // showing an estimate that won't match Higgsfield's real price.
                console.warn(`⚠️  [calculateCost] real-cost preflight failed for model=${settings.model} → using formula estimate. Reason: ${err.message}`);
                credits = higgsfieldAPIService.calculateCredits(settings);
                source = 'formula';
            }

            const costINR = Math.round(credits * 3.25);
            const costUSD = Math.round(credits * 0.039 * 100) / 100;
            res.json({
                success: true,
                data: { credits, costINR, costUSD, source }
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async deleteVideo(req, res) {
        try {
            const { id } = req.params;
            await videoService.deleteVideo(id);
            res.json({
                success: true,
                message: 'Video deleted successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    async syncFromHiggsfield(req, res) {
        try {
            const higgsfieldMCP   = require('../services/higgsfieldMCPClient');
            const videoRepository = require('../repositories/videoRepositoryDrizzle');

            const generations = await higgsfieldMCP.fetchGenerationHistory(100);
            let newCount = 0;

            for (const gen of generations) {
                // Dedup #1: by Higgsfield generation ID
                if (gen.id && await videoRepository.findByJobId(gen.id)) continue;

                const videoUrl = gen.results?.rawUrl   || gen.results?.url   || gen.results?.video_url
                              || gen.result?.rawUrl    || gen.result?.url
                              || gen.video_url         || gen.url;
                if (!videoUrl) continue; // skip pending/incomplete generations

                // Dedup #2: by URL path (stable across re-signed tokens) — catches old records without jobId
                const urlPath = videoUrl.split('?')[0];
                if (await videoRepository.findByUrlPrefix(urlPath)) continue;

                const thumbUrl = gen.results?.thumbnailUrl || gen.results?.thumbnail_url
                              || gen.thumbnail_url || videoUrl;

                await videoRepository.create({
                    type         : 'generated',
                    video_url    : videoUrl,
                    thumbnail_url: thumbUrl,
                    metadata     : { source: 'higgsfield_sync', jobId: gen.id, model: gen.model,
                                     createdAt: gen.createdAt, ...(gen.params || {}) },
                });
                newCount++;
            }

            if (newCount > 0) console.log(`[Sync] Videos: inserted ${newCount} new from Higgsfield`);
            res.json({ success: true, fetched: generations.length, synced: newCount });
        } catch (err) {
            console.warn('[Sync] Video sync failed (non-fatal):', err.message);
            res.json({ success: false, error: err.message, synced: 0 });
        }
    }

    // Diagnostic — HEAD-checks every stored media URL and reports which are expired/dead
    async checkUrls(req, res) {
        try {
            const axios           = require('axios');
            const videoRepository = require('../repositories/videoRepositoryDrizzle');

            const all = await videoRepository.findAll();
            const expiredItems = [];
            let okCount = 0;

            await Promise.all(all.map(async (item) => {
                const url = item.video_url;
                if (!url) {
                    expiredItems.push({ id: item.id, type: item.type, status: 'no_url', url: null });
                    return;
                }
                try {
                    const r = await axios.head(url, { timeout: 8000, validateStatus: null });
                    if (r.status === 200) okCount++;
                    else expiredItems.push({ id: item.id, type: item.type, status: r.status, url });
                } catch (e) {
                    expiredItems.push({ id: item.id, type: item.type, status: e.code || 'error', url });
                }
            }));

            console.log(`[URL Check] ${all.length} total · ${okCount} ok · ${expiredItems.length} expired`);
            expiredItems.forEach(it => console.log(`[URL Check] EXPIRED: ${it.id} (${it.status}) ${it.url || '(no url)'}`));

            res.json({ success: true, total: all.length, ok: okCount, expired: expiredItems.length, expiredItems });
        } catch (err) {
            console.error('[URL Check] failed:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Fix — re-fetches fresh signed URLs from Higgsfield and updates expired records
    async refreshUrls(req, res) {
        try {
            const axios           = require('axios');
            const higgsfieldMCP   = require('../services/higgsfieldMCPClient');
            const videoRepository = require('../repositories/videoRepositoryDrizzle');

            // Build jobId -> fresh URL map from live Higgsfield history (videos + images)
            const [videos, images] = await Promise.all([
                higgsfieldMCP.fetchGenerationHistory(100),
                higgsfieldMCP.fetchImageGenerationHistory(100),
            ]);
            const freshMap = {};
            for (const it of [...videos, ...images]) {
                const url = it.results?.rawUrl || it.results?.url || it.results?.video_url || it.results?.image_url;
                const thumb = it.results?.thumbnailUrl || url;
                if (it.id && url) freshMap[it.id] = { url, thumb };
            }

            const all = await videoRepository.findAll();
            let refreshed = 0, stillBroken = 0;

            for (const item of all) {
                // Check if current URL is alive
                let alive = false;
                if (item.video_url) {
                    try {
                        const r = await axios.head(item.video_url, { timeout: 8000, validateStatus: null });
                        alive = r.status === 200;
                    } catch { alive = false; }
                }
                if (alive) continue;

                // Expired — try to find a fresh URL by jobId
                const jobId = item.metadata?.jobId;
                const fresh = jobId && freshMap[jobId];
                if (fresh) {
                    await videoRepository.updateUrl(item.id, fresh.url, fresh.thumb);
                    refreshed++;
                } else {
                    stillBroken++;
                }
            }

            console.log(`[URL Refresh] refreshed ${refreshed} · still broken ${stillBroken}`);
            res.json({ success: true, refreshed, stillBroken, liveGenerations: Object.keys(freshMap).length });
        } catch (err) {
            console.error('[URL Refresh] failed:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // One-time cleanup — removes duplicate history rows.
    // Two records are the same generation if their URL path (before '?') matches,
    // OR their metadata.jobId matches. Keeps the newest, deletes the rest.
    async dedupHistory(req, res) {
        try {
            const videoRepository = require('../repositories/videoRepositoryDrizzle');
            const all = await videoRepository.findAll();

            // Sort newest-first so the first occurrence we keep is the freshest
            all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

            const seen = new Set();
            let removed = 0;

            for (const item of all) {
                const jobId = item.metadata?.jobId;
                const urlPath = (item.video_url || '').split('?')[0];
                const key = jobId ? `job:${jobId}` : `url:${urlPath}`;
                // Also block by url path even when jobId present, so a jobId row and a
                // jobId-less row of the same image collapse together
                const altKey = `url:${urlPath}`;

                if (seen.has(key) || seen.has(altKey)) {
                    try { await videoRepository.delete(item.id); removed++; } catch {}
                    continue;
                }
                seen.add(key);
                seen.add(altKey);
            }

            console.log(`[Dedup] removed ${removed} duplicate rows (${all.length} → ${all.length - removed})`);
            res.json({ success: true, total: all.length, removed, remaining: all.length - removed });
        } catch (err) {
            console.error('[Dedup] failed:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Clean rebuild — wipes all generated/image rows, then re-syncs fresh from Higgsfield.
    // Guarantees zero duplicates because every real generation lives in Higgsfield and
    // gets re-pulled with proper jobId + URL-path dedup. Nothing is lost.
    async rebuildHistory(req, res) {
        try {
            const videoRepository = require('../repositories/videoRepositoryDrizzle');
            const higgsfieldMCP   = require('../services/higgsfieldMCPClient');

            // 1. Delete all generated + image_generated rows (keep user uploads)
            const all = await videoRepository.findAll();
            let deleted = 0;
            for (const item of all) {
                if (item.type === 'generated' || item.type === 'image_generated') {
                    try { await videoRepository.delete(item.id); deleted++; } catch {}
                }
            }

            // 2. Re-sync videos from Higgsfield (dedup by jobId + URL path)
            const seenV = new Set();
            const videos = await higgsfieldMCP.fetchGenerationHistory(100);
            let videoCount = 0;
            for (const gen of videos) {
                const url = gen.results?.rawUrl || gen.results?.url || gen.results?.video_url;
                if (!url) continue;
                const path = url.split('?')[0];
                if (seenV.has(path)) continue;
                seenV.add(path);
                await videoRepository.create({
                    type: 'generated', video_url: url,
                    thumbnail_url: gen.results?.thumbnailUrl || url,
                    metadata: { source: 'higgsfield_sync', jobId: gen.id, model: gen.model, createdAt: gen.createdAt },
                });
                videoCount++;
            }

            // 3. Re-sync images from Higgsfield
            const seenI = new Set();
            const images = await higgsfieldMCP.fetchImageGenerationHistory(100);
            let imageCount = 0;
            for (const item of images) {
                const url = item.results?.rawUrl || item.results?.url || item.results?.image_url;
                if (!url) continue;
                const path = url.split('?')[0];
                if (seenI.has(path)) continue;
                seenI.add(path);
                await videoRepository.create({
                    type: 'image_generated', video_url: url,
                    thumbnail_url: item.results?.thumbnailUrl || item.results?.minUrl || url,
                    metadata: { source: 'higgsfield_sync', jobId: item.id, model: item.model, createdAt: item.createdAt },
                });
                imageCount++;
            }

            console.log(`[Rebuild] deleted ${deleted} · re-synced ${videoCount} videos + ${imageCount} images`);
            res.json({ success: true, deleted, videos: videoCount, images: imageCount });
        } catch (err) {
            console.error('[Rebuild] failed:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new VideoController();
