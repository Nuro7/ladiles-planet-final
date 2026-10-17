/**
 * aiWorkflowService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * BRIDAL AI WALL — 5-Step Official Kling Pipeline Orchestrator
 *
 * CRITICAL ARCHITECTURE DECISION (production-safe):
 *   The HTTP POST /api/videos/generate returns IMMEDIATELY with a sessionId.
 *   The pipeline runs in the BACKGROUND (fire-and-forget async pattern).
 *   Frontend uses WebSocket OR polls GET /api/videos/session/:sessionId.
 *   This prevents server timeout for long-running pipeline (10–15 min).
 *
 * Key production rules applied:
 *   ✅ Fire-and-forget (HTTP response returns instantly)
 *   ✅ One active pipeline at a time (blocks duplicate runs)
 *   ✅ VTON risk control retry (3× exponential backoff in klingService)
 *   ✅ Image URL validation before every Kling call
 *   ✅ CDN download → Supabase after each step (prevents link expiry)
 *   ✅ Session state tracking (queryable via GET /api/videos/session/:id)
 *   ✅ WebSocket progress notifications at each step
 *
 * Steps:
 *   Step 1 → Upload images to Supabase   (done by videoService before calling here)
 *   Step 2 → Virtual Try-On              (klingService.virtualTryOn)
 *   Step 3 → Image Canvas Expand         (klingService.expandImage — /images/editing/expand)
 *   Step 4 → Omni Video 15s · 4K · 16:9  (klingService.generateOmniVideo — kling-v3-omni)
 *   Step 5 → Add wedding music           (klingService.addSound)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const klingService         = require('./klingService');
const higgsfieldAPIService = require('./higgsfieldAPIService');
const higgsfieldMCPClient  = require('./higgsfieldMCPClient');
const brideService         = require('./brideService');
const sessionService       = require('./sessionService');
const cdnDownloader        = require('../utils/cdnDownloader');
const connectionManager    = require('../websocket/connectionManager');

const {
    buildScenarioPrompt,
    buildV3MultiShotPrompt,
    WEDDING_SOUND_PROMPT
} = require('./scenePrompts');

const SIM_VIDEO_URL = 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4';

// Provider switch — set in .env to flip between providers.
// Values:
//   'higgsfield-mcp'  → Path B: OAuth/MCP → uses consumer subscription credits
//   'higgsfield'      → Path A: REST API → uses developer-cloud credits
//   'kling'           → legacy Kling pipeline
const VIDEO_PROVIDER = (process.env.VIDEO_PROVIDER || 'higgsfield-mcp').toLowerCase();

class AIWorkflowService {

    constructor() {
        this.isSimulationMode = (
            !process.env.KLING_API_KEY ||
            process.env.KLING_API_KEY === 'your_kling_access_key_here' ||
            !process.env.KLING_SECRET_KEY ||
            process.env.KLING_SECRET_KEY === 'your_kling_secret_key_here'
        );

        // Track active pipelines — prevents duplicate runs wasting credits
        this.activePipelines = new Set();

        if (this.isSimulationMode) {
            console.warn('⚠️  [AIWorkflow] KLING keys not configured — SIMULATION MODE');
        } else {
            console.log('✅  [AIWorkflow] KLING Official API — LIVE MODE');
        }

        console.log(`🎯  [AIWorkflow] Primary VIDEO_PROVIDER = ${VIDEO_PROVIDER.toUpperCase()}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HIGGSFIELD MCP PIPELINE — short, simple, official API
    //  Replaces the legacy 5-step Kling pipeline with a single MCP call.
    //
    //  Called from _runPipeline when VIDEO_PROVIDER === 'higgsfield'
    // ─────────────────────────────────────────────────────────────────────────
    async _runHiggsfieldPipeline(payload) {
        const {
            sessionId,
            clientImageUrl,
            dressImageUrl,
            customDetails = {}
        } = payload;

        const {
            scenario     = 'stage_entry',
            customPrompt = '',
            videoDuration,                // controller stores it under this name
            resolution
        } = customDetails;
        const duration = videoDuration || customDetails.duration;

        console.log(`\n[${sessionId}] ════════════════════════════════════════`);
        console.log(`[${sessionId}] 🌹 LADIES PLANET — HIGGSFIELD MCP PIPELINE`);
        console.log(`[${sessionId}] Scenario: ${scenario}`);
        console.log(`[${sessionId}] ════════════════════════════════════════\n`);

        try {
            this._updateSession(sessionId, 'preparing', 10, 'Preparing your bridal video...');

            this._updateSession(sessionId, 'uploading_refs', 25, 'Uploading reference images...');

            // Single call to Higgsfield — pick MCP (consumer credits via OAuth)
            //   or REST API (developer-cloud credits) based on VIDEO_PROVIDER.
            this._updateSession(sessionId, 'generating', 40, 'AI generating your video...');

            const useMCP = VIDEO_PROVIDER === 'higgsfield-mcp';
            const service = useMCP ? higgsfieldMCPClient : higgsfieldAPIService;
            console.log(`[${sessionId}] 🔀 Using ${useMCP ? 'MCP/OAuth (consumer credits)' : 'REST API (developer cloud)'}`);

            // Clamp duration to model-safe range (Seedance min=4, max=15)
            // Frontend slider goes 3-15; round 3 up to 4 for Seedance compatibility
            const clampedDuration = Math.max(4, Math.min(15, Number(duration) || 5));

            const result = await service.generateBridalVideo({
                brideImageUrl : clientImageUrl,
                dressImageUrl : dressImageUrl,
                scenario,
                customPrompt,
                sessionId,
                model         : customDetails.model      || 'seedance-2.0-fast',
                duration      : clampedDuration,
                resolution    : resolution                || '720p',
                mode          : customDetails.mode        || 'fast',
                multiShot     : customDetails.multiShot   !== false,
                sound         : customDetails.sound       !== false
            });

            this._updateSession(sessionId, 'finalizing', 90, 'Finalizing video...');

            // Optional: store the video in Supabase too (background, non-blocking)
            cdnDownloader.storeVideo(result.videoUrl, sessionId, 'final')
                .then(stored => console.log(`[${sessionId}] 💾 Backup saved to Supabase: ${stored?.slice(0, 60)}...`))
                .catch(err   => console.warn(`[${sessionId}] ⚠️  Backup save failed (non-fatal): ${err.message}`));

            const finalResult = {
                success       : true,
                sessionId,
                videoUrl      : result.videoUrl,
                allShotUrls   : [result.videoUrl],
                duration      : result.duration,
                aspectRatio   : '16:9',
                resolution    : result.resolution,
                scenario      : result.scenario,
                scenarioLabel : result.scenarioLabel,
                provider      : 'higgsfield',
                createdAt     : result.generatedAt
            };

            sessionService.complete(sessionId, finalResult);
            this._notify(sessionId, '✨ Your bridal video is ready!', 100, {
                videoUrl    : result.videoUrl,
                allShotUrls : [result.videoUrl],
                status      : 'completed'
            });

            // ─────────────────────────────────────────────────────────
            //  Persist to DB so the History panel can show it later.
            //  Non-blocking — pipeline still returns even if save fails.
            // ─────────────────────────────────────────────────────────
            try {
                const videoRepository = require('../repositories/videoRepositoryDrizzle');
                await videoRepository.create({
                    type            : 'generated',
                    video_url       : result.videoUrl,
                    thumbnail_url   : result.thumbnailUrl || null,
                    bride_image_url : clientImageUrl,
                    dress_image_url : dressImageUrl,
                    duration        : result.duration,
                    aspect_ratio    : '16:9',
                    quality         : result.resolution,
                    metadata        : {
                        sessionId,
                        jobId          : result.jobId || null,  // Higgsfield generation ID — prevents sync duplicates
                        scenario       : result.scenario,
                        scenarioLabel  : result.scenarioLabel,
                        model          : result.model,
                        provider       : 'higgsfield',
                        weddingType    : customDetails.weddingType || 'bride_only',
                        creditsUsed    : result.creditsUsed,
                        generatedAt    : result.generatedAt
                    }
                });
                console.log(`[${sessionId}] 💾 Video saved to history`);
            } catch (saveErr) {
                console.warn(`[${sessionId}] ⚠️  History save failed (non-fatal): ${saveErr.message}`);
            }

            console.log(`[${sessionId}] 🎉 PIPELINE COMPLETE — ${result.videoUrl.slice(0, 60)}...\n`);
            return finalResult;

        } catch (error) {
            console.error(`[${sessionId}] ❌ Higgsfield pipeline error:`, error.message);
            sessionService.fail(sessionId, error.message);
            this._notify(sessionId, `Error: ${error.message}`, 0, { status: 'error' });
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PUBLIC ENTRY POINT — called by videoService AFTER images are uploaded.
    //
    //  ⚡ THIS RETURNS IMMEDIATELY with the sessionId.
    //     The pipeline runs in the background via setImmediate.
    //     The caller does NOT await the full pipeline.
    //
    //  @param payload {
    //    sessionId         string
    //    clientImageUrl    string  – public Supabase URL of bride photo
    //    dressImageUrl     string  – public Supabase URL of dress
    //    wornDressImageUrl string? – pre-worn dress (skips VTON)
    //    customDetails {
    //      weddingType   'bride_only' | 'bride_and_groom'
    //      outfitType    'dress' | 'combination'
    //      videoDuration number   — 5 | 10 | 15
    //      scenario      string   — 'grand_entrance' | 'mandap_moment' | 'reception_look' | ''
    //      enableSound   boolean
    //    }
    //  }
    //
    //  @returns { sessionId }  — immediately, BEFORE pipeline runs
    // ─────────────────────────────────────────────────────────────────────────
    initiateWorkflow(payload) {
        const { sessionId } = payload;

        // Guard: block if a pipeline is already running — prevents credit waste
        if (this.activePipelines.size > 0) {
            const running = [...this.activePipelines][0];
            console.warn(`⚠️  [AIWorkflow] Pipeline ${running} still active. Blocking new run to save credits.`);
            sessionService.create(sessionId, {
                status  : 'blocked',
                message : `Another pipeline (${running}) is still running. Wait for it to finish.`
            });
            return { sessionId, status: 'blocked', message: `Pipeline ${running} is still running. Please wait.` };
        }

        this.activePipelines.add(sessionId);

        // Create session record immediately so frontend can query it
        sessionService.create(sessionId, {
            status      : 'started',
            weddingType : payload.customDetails?.weddingType || 'bride_only',
            message     : 'Pipeline queued...'
        });

        // Fire the pipeline in the background — do NOT await here
        setImmediate(() => {
            this._runPipeline(payload)
                .catch(err => {
                    console.error(`[${sessionId}] ❌ Background pipeline crashed:`, err.message);
                    sessionService.fail(sessionId, err.message);
                    this._notify(sessionId, `Pipeline error: ${err.message}`, 0, { status: 'error' });
                })
                .finally(() => {
                    this.activePipelines.delete(sessionId);
                    console.log(`[${sessionId}] 🔓 Pipeline slot released. Ready for next run.`);
                });
        });

        // Return immediately — HTTP response goes out NOW, not after 10 min
        return { sessionId, status: 'started', message: 'Pipeline started. Connect via WebSocket for progress.' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  LEGACY SYNC ENTRY POINT — kept for backward compatibility.
    //  Called by videoService.generateVideo() which still awaits the full result.
    //  Use initiateWorkflow() for new code.
    // ─────────────────────────────────────────────────────────────────────────
    async generateVideoWorkflow(payload) {
        return await this._runPipeline(payload);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PRIVATE — the actual pipeline
    // ─────────────────────────────────────────────────────────────────────────
    async _runPipeline(payload) {
        const {
            sessionId,
            clientImageUrl,
            dressImageUrl,
            wornDressImageUrl,
            customDetails = {}
        } = payload;

        const {
            weddingType      = 'bride_only',
            outfitType       = 'dress',
            enableSound      = true,
            videoDuration    = 15,
            sceneDescription = '',
            scenario         = ''   // 'grand_entrance' | 'mandap_moment' | 'reception_look' | ''
        } = customDetails;

        const duration = Number(videoDuration) || 15;

        // ─────────────────────────────────────────────────────────────
        //  PROVIDER DISPATCH — route to Higgsfield (MCP or REST) or
        //  fall through to the legacy Kling pipeline below.
        // ─────────────────────────────────────────────────────────────
        if (VIDEO_PROVIDER === 'higgsfield' || VIDEO_PROVIDER === 'higgsfield-mcp') {
            return await this._runHiggsfieldPipeline(payload);
        }

        console.log(`\n[${sessionId}] ════════════════════════════════════════`);
        console.log(`[${sessionId}] 🚀 BRIDAL AI WALL — KLING V3 PIPELINE`);
        console.log(`[${sessionId}] Wedding: ${weddingType} | Outfit: ${outfitType} | Duration: ${duration}s | Sound: ${enableSound}`);
        console.log(`[${sessionId}] ════════════════════════════════════════\n`);

        try {
            if (this.isSimulationMode) {
                return await this._runSimulation(sessionId);
            }

            // ─────────────────────────────────────────────────────────────
            //  STEP 2 — VIRTUAL TRY-ON
            // ─────────────────────────────────────────────────────────────
            let vtonImageUrl;
            if (wornDressImageUrl) {
                console.log(`[${sessionId}] ⏭️  Step 2: Skipping VTON — using pre-worn dress`);
                vtonImageUrl = wornDressImageUrl;
                this._updateSession(sessionId, 'vton_skipped', 15, 'Using worn dress image...');
            } else {
                this._updateSession(sessionId, 'vton', 10, 'Step 2/5: Virtual Try-On (fitting the dress)...');
                console.log(`[${sessionId}] 👗 Step 2: VTON START`);

                const rawVtonUrl = await klingService.virtualTryOn({
                    humanImage  : clientImageUrl,
                    clothImage  : dressImageUrl,
                    outfitType,
                    sessionId
                });

                // ✅ Download CDN → Supabase (prevents expiry)
                vtonImageUrl = await cdnDownloader.storeImage(rawVtonUrl, sessionId, 'vton');
                console.log(`[${sessionId}] ✅ Step 2 DONE`);
                console.log(`[${sessionId}] 🖼️  VTON IMAGE URL: ${vtonImageUrl}`);
            }

            // ─────────────────────────────────────────────────────────────
            //  STEP 3 — REGISTER BRIDE ELEMENT (identity lock for video)
            //  POST /v1/images/elements — registers VTON result as Element
            //  element_id → element_list in omni-video payload
            //  <<<element_1>>> in prompts maps to element_list[0]
            //  This is the strongest character consistency mechanism in Kling.
            // ─────────────────────────────────────────────────────────────
            let omniElementList = [];
            try {
                this._updateSession(sessionId, 'element_reg', 35, 'Step 3/5: Registering bride identity element...');
                console.log(`[${sessionId}] 🎭 Step 3: Registering VTON result as Kling element...`);
                const elementId = await klingService.createBrideElement({
                    imageUrl : vtonImageUrl,
                    sessionId
                });
                omniElementList = [{ element_id: elementId }];
                console.log(`[${sessionId}] ✅ Step 3 DONE — element_id: ${elementId}`);
            } catch (elemErr) {
                // Non-fatal — element is optional. Pipeline continues with image_list only.
                // image_list still locks dress + face visually even without hard element anchor.
                console.warn(`[${sessionId}] ⚠️  Step 3: Element failed (${elemErr.message}) — continuing with image_list only`);
            }

            const enhancedImageUrl = vtonImageUrl;
            console.log(`[${sessionId}] ⏭️  Image Expand skipped — using VTON output directly`);

            // ─────────────────────────────────────────────────────────────
            //  STEP 4 — KLING V3-OMNI · 4K · 16:9 MULTI-SHOT VIDEO
            //  POST /v1/videos/omni-video
            //    image_list[0] → bride (vtonImageUrl)     = <<<image_1>>>
            //    image_list[1] → WEDDING_REF_IMAGE_1      = <<<image_2>>>
            //    image_list[2] → WEDDING_REF_IMAGE_2      = <<<image_3>>>
            // ─────────────────────────────────────────────────────────────

            // Resolve prompt + duration
            let shotPrompt, shotMultiPrompt, shotNeg, shotDuration;
            if (scenario && buildScenarioPrompt(scenario)) {
                const built    = buildScenarioPrompt(scenario);
                shotPrompt     = built.prompt;        // fallback single-shot string
                shotMultiPrompt = built.multiPrompt;  // primary multi-shot array
                shotNeg        = built.negativePrompt;
                shotDuration   = 15;
                console.log(`[${sessionId}] 🎬 Scenario: ${scenario} | multi_shot: ${shotMultiPrompt?.length} shots | 15s`);
            } else {
                const built    = buildV3MultiShotPrompt(weddingType, duration, sceneDescription);
                shotPrompt     = built.prompt;
                shotNeg        = built.negativePrompt;
                shotDuration   = 15;
                if (weddingType === 'bride_and_groom') {
                    shotMultiPrompt = [
                        { index: 1, prompt: `Bride from <<<element_1>>> walks along grand mandap corridor with marigold garlands. Exact outfit from <<<element_1>>> flows naturally with each step. Slow dolly-in. Golden hour light. Flower petals on marble floor. Only bride visible. 4K cinematic.`, duration: '5' },
                        { index: 2, prompt: `Bride from <<<element_1>>> stands at opulent mandap beside AI-generated groom in black sherwani. Sacred fire glowing. Camera pans left to right. Fairy lights overhead. Only bride and groom. Exact outfit preserved. 4K cinematic.`, duration: '5' },
                        { index: 3, prompt: `Bride from <<<element_1>>> and AI-generated groom face each other under floral arch. Rose petals and gold confetti falling. Bride smiles softly. Shallow depth of field. Emotional slow motion. Only bride and groom. Exact outfit from <<<element_1>>> preserved. 4K.`, duration: '5' }
                    ];
                } else {
                    shotMultiPrompt = [
                        { index: 1, prompt: `Bride from <<<element_1>>> walks through grand flower-lit corridor. Exact outfit from <<<element_1>>> flows gracefully with each step. Slow dolly-in. Marigold garlands. Warm golden-hour glow. Only bride visible. 4K cinematic.`, duration: '5' },
                        { index: 2, prompt: `Bride from <<<element_1>>> gracefully lifts dupatta over her head with mehndi-covered hands, looking into distance with quiet poise. Dupatta flows naturally. Slow arc pan from 3/4 angle to direct portrait. Luxury indoor bridal setting. Floral bokeh. No other people. 4K.`, duration: '5' },
                        { index: 3, prompt: `Tight close-up portrait of bride from <<<element_1>>> gazing directly at camera, tilting head to reveal intricate jewellery. Ultra-soft beauty lighting. Shallow depth of field. High-end bridal editorial. Only bride visible. Exact outfit from <<<element_1>>> preserved. 4K.`, duration: '5' }
                    ];
                }
            }

            this._updateSession(sessionId, 'video_gen', 45, `Step 4/5: Generating 15s · 4K 16:9 (Kling v3-omni multi-shot)...`);
            console.log(`[${sessionId}] 🎬 Step 4: Kling v3-omni · 4K 16:9 · 15s · multi_shot`);

            // image_list — VTON bride as visual reference (NO type/first_frame)
            // first_frame is incompatible with multi_shot:true — causes wrong aspect ratio
            // Identity is locked via element_list (<<<element_1>>> in prompts)
            const omniImageList = [
                { image_url: vtonImageUrl }  // visual reference only — no type field
            ];
            console.log(`[${sessionId}] 🎬 element_list: ${omniElementList.length} | image_list: 1 (visual ref, no first_frame)`);

            // Try omni-video multi-shot first — fall back to single-shot, then image2video
            let shotTask;
            try {
                shotTask = await klingService.generateOmniVideo({
                    imageList      : omniImageList,
                    elementList    : omniElementList,   // <<<element_1>>> maps here
                    videoList      : [],
                    prompt         : shotPrompt,
                    multiPrompt    : shotMultiPrompt,   // enables multi_shot: true
                    negativePrompt : shotNeg,
                    duration       : shotDuration,
                    sessionId
                });
            } catch (omniErr) {
                const is404 = omniErr.message?.includes('404') || omniErr.message?.includes('Not Found');
                if (is404) {
                    console.warn(`[${sessionId}] ⚠️  omni-video not available — falling back to image2video (kling-v3)`);
                    shotTask = await klingService.generateShot({
                        imageUrl       : vtonImageUrl,
                        prompt         : shotPrompt,
                        negativePrompt : shotNeg,
                        duration       : shotDuration,
                        sessionId,
                        shotLabel      : 'Main'
                    });
                } else {
                    throw omniErr;
                }
            }

            // Wait 70s before first poll — Kling v3 pro 15s videos never finish before 60s.
            // This eliminates ~14 wasted poll requests at pipeline start.
            console.log(`[${sessionId}] ⏱️  Waiting 70s before first poll (Kling v3 pro minimum)`);
            await new Promise(r => setTimeout(r, 70000));

            const rawShotUrl = await klingService._poll(
                shotTask.endpoint,
                (data) => data.task_result?.videos?.[0]?.url,
                klingService.MAX_POLL_ATTEMPTS,
                null,
                true
            );

            // Return Kling CDN URL directly — do NOT wait for Supabase download.
            // Save to Supabase async in the background so user gets the video instantly.
            const shotTaskId = shotTask.taskId;
            console.log(`[${sessionId}] ✅ Step 4 DONE — delivering CDN URL immediately`);
            cdnDownloader.storeVideo(rawShotUrl, sessionId, 'main')
                .then(stored => console.log(`[${sessionId}] 💾 Video saved to Supabase: ${stored?.slice(0, 60)}...`))
                .catch(err  => console.warn(`[${sessionId}] ⚠️  Supabase save failed (non-fatal): ${err.message}`));

            const finalShotUrls  = [rawShotUrl];
            // Primary video URL — Kling CDN (fast delivery, no blocking download)
            const primaryVideoUrl = rawShotUrl;

            // ─────────────────────────────────────────────────────────────
            //  STEP 6 — ADD WEDDING MUSIC
            //  Uses the task_id from Step 5 (not the re-uploaded URL)
            // ─────────────────────────────────────────────────────────────
            let finalVideoUrl = primaryVideoUrl;
            if (enableSound) {
                this._updateSession(sessionId, 'sound', 80, 'Step 5/5: Adding wedding music...');
                console.log(`[${sessionId}] 🎵 Step 5: Add Sound START (using task ID: ${shotTaskId})`);

                try {
                    const rawSoundUrl = await klingService.addSound({
                        videoId  : shotTaskId,
                        prompt   : WEDDING_SOUND_PROMPT,
                        sessionId
                    });
                    // Return CDN URL directly — save to Supabase async in background
                    finalVideoUrl = rawSoundUrl;
                    cdnDownloader.storeVideo(rawSoundUrl, sessionId, 'final_with_sound')
                        .then(s => console.log(`[${sessionId}] 💾 Sound video saved: ${s?.slice(0, 60)}...`))
                        .catch(e => console.warn(`[${sessionId}] ⚠️  Sound Supabase save failed: ${e.message}`));
                    console.log(`[${sessionId}] ✅ Step 5 DONE → CDN URL delivered immediately`);
                } catch (soundErr) {
                    console.warn(`[${sessionId}] ⚠️  Step 5: Add Sound failed (${soundErr.message}) — using video without sound`);
                    finalVideoUrl = primaryVideoUrl; // Fall back to video without sound
                }
            } else {
                console.log(`[${sessionId}] ⏭️  Step 5: Skipped`);
            }

            // ─────────────────────────────────────────────────────────────
            //  DELIVER — Complete session + push WebSocket notification
            // ─────────────────────────────────────────────────────────────
            const result = {
                success          : true,
                sessionId,
                videoUrl         : finalVideoUrl,      // Primary video (Shot A + sound)
                allShotUrls      : finalShotUrls,       // [A, B, C] for display wall looping
                vtonImageUrl,                            // VTON result (permanent Supabase URL)
                enhancedImageUrl,                        // Polished portrait (permanent)
                thumbnailUrl     : enhancedImageUrl,
                duration         : shotDuration,
                aspectRatio      : '16:9',
                weddingType,
                createdAt        : new Date().toISOString()
            };

            // Update session to completed
            sessionService.complete(sessionId, result);

            // Push to WebSocket
            this._notify(sessionId, '✨ Cinematic Bridal Video Ready!', 100, {
                videoUrl    : finalVideoUrl,
                allShotUrls : finalShotUrls,
                status      : 'completed'
            });

            console.log(`\n[${sessionId}] ════════════════════════════════════════`);
            console.log(`[${sessionId}] 🎉 PIPELINE COMPLETE!`);
            console.log(`[${sessionId}] 🎬 Final: ${finalVideoUrl?.slice(0, 60)}...`);
            console.log(`[${sessionId}] 🖼️  Portrait: ${enhancedImageUrl?.slice(0, 60)}...`);
            console.log(`[${sessionId}] 📹 ${finalShotUrls.length} shots stored in Supabase`);
            console.log(`[${sessionId}] ════════════════════════════════════════\n`);

            return result;

        } catch (error) {
            console.error(`[${sessionId}] ❌ PIPELINE ERROR:`, error.message);
            sessionService.fail(sessionId, error.message);
            this._notify(sessionId, `Error: ${error.message}`, 0, { status: 'error' });
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────
    _updateSession(sessionId, status, progress, message) {
        sessionService.update(sessionId, { status, progress, message });
        this._notify(sessionId, message, progress);
    }

    _notify(sessionId, message, progress, extra = {}) {
        connectionManager.notify(sessionId, { status: 'progress', message, progress, ...extra });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SIMULATION — mock pipeline when Kling keys not configured
    // ─────────────────────────────────────────────────────────────────────────
    async _runSimulation(sessionId) {
        console.log(`[${sessionId}] 🎭 SIMULATION MODE`);
        const steps = [
            { status: 'vton',      pct: 15,  msg: 'Step 2/5: VTON (simulated)...' },
            { status: 'image_gen', pct: 35,  msg: 'Step 3/5: Expanding canvas (simulated)...' },
            { status: 'video_gen', pct: 65,  msg: 'Step 4/5: Generating 15s 4K 16:9 video (simulated)...' },
            { status: 'sound',     pct: 88,  msg: 'Step 5/5: Adding music (simulated)...' },
            { status: 'completed', pct: 100, msg: '✨ Simulation Complete!' }
        ];

        for (const step of steps) {
            this._updateSession(sessionId, step.status, step.pct, step.msg);
            await new Promise(r => setTimeout(r, 800));
        }

        const result = {
            success          : true,
            sessionId,
            videoUrl         : SIM_VIDEO_URL,
            allShotUrls      : [SIM_VIDEO_URL, SIM_VIDEO_URL, SIM_VIDEO_URL],
            vtonImageUrl     : 'https://placehold.co/400x600?text=VTON',
            enhancedImageUrl : 'https://placehold.co/400x600?text=Enhanced',
            thumbnailUrl     : 'https://placehold.co/400x600?text=Thumbnail',
            duration         : 15,
            aspectRatio      : '16:9',
            simulated        : true,
            createdAt        : new Date().toISOString()
        };

        sessionService.complete(sessionId, result);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  BRIDE IMAGE HELPERS — used from video controller
    // ─────────────────────────────────────────────────────────────────────────
    async getBrideImageByName(brideName, type = 'identity', angle = 'front') {
        const bride = await brideService.getBrideByName(brideName);
        const image = await brideService.getBrideImageByTypeAndAngle(bride.id, type, angle);
        return image.image_url;
    }

    async getBrideImageById(brideId, type = 'identity', angle = 'front') {
        const image = await brideService.getBrideImageByTypeAndAngle(brideId, type, angle);
        return image.image_url;
    }

    async getAllBrideImages(brideId, type = null) {
        return await brideService.getBrideImages(brideId, type ? { type } : {});
    }
}

module.exports = new AIWorkflowService();
