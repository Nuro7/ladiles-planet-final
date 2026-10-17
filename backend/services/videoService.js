const storageService   = require('./storageService');
const brideService     = require('./brideService');
const aiWorkflowService = require('./aiWorkflowService');
const videoRepository  = require('../repositories/videoRepositoryDrizzle');
const brideRepository  = require('../repositories/brideRepository');
const dressRepository  = require('../repositories/dressRepository');
const { randomUUID } = require('crypto');

// ── Quick-add helpers ───────────────────────────────────────────
// When the user uploads a brand-new bride or dress photo during a
// generation run, we silently register it in the gallery so the next
// run can pick it from the library instead of re-uploading.
//
// Names auto-generate from a timestamp: "Bride · May 18, 2:35 PM"
// — recognizable in the picker without forcing the user to type.
const _autoName = (kind) => {
    const d = new Date();
    const date  = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time  = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${kind} · ${date}, ${time}`;
};

async function _autoSaveBrideToGallery(imageUrl) {
    try {
        // Brides table requires unique names — append a short random suffix
        const baseName = _autoName('Bride');
        const name = `${baseName} #${Math.random().toString(36).slice(2, 6)}`;
        const bride = await brideRepository.createBride({ name, status: 'active' });
        await brideRepository.createBrideImage({
            brideId   : bride.id,
            imageUrl,
            imageType : 'identity',
            angle     : 'front',
        });
        console.log(`💾 [Gallery] Bride auto-saved to library: "${name}" (${bride.id})`);
    } catch (err) {
        console.warn(`⚠️  [Gallery] Bride auto-save skipped (non-fatal): ${err.message}`);
    }
}

async function _autoSaveDressToGallery(imageUrl) {
    try {
        const suffix = Math.random().toString(36).slice(2, 6);
        const name = `${_autoName('Dress')} #${suffix}`;
        // `sku` is NOT NULL in the dresses table — auto-generate one.
        const sku  = `AUTO-${Date.now().toString(36).toUpperCase()}-${suffix.toUpperCase()}`;
        await dressRepository.create({
            id           : randomUUID(),
            name,
            sku,
            image_url    : imageUrl,
            thumbnail_url: imageUrl,
            is_available : true,
            category     : 'auto-saved',
        });
        console.log(`💾 [Gallery] Dress auto-saved to library: "${name}"`);
    } catch (err) {
        console.warn(`⚠️  [Gallery] Dress auto-save skipped (non-fatal): ${err.message}`);
    }
}

class VideoService {
    async generateVideo(images, options) {
        try {
            const sessionId = randomUUID();
            const uploadedImages = {};

            console.log('\n🚀 ========================================');
            console.log('🎬 STARTING VIDEO GENERATION PROCESS');
            console.log('========================================');
            console.log('📋 Session ID:', sessionId);
            console.log('📋 Options:', JSON.stringify(options, null, 2));
            console.log('========================================\n');

            console.log('📸 [1/4] PROCESSING BRIDE IMAGE...');
            let brideFrontImageUrl = null;

            // If we have a bride ID, try to get the FRONT identity image specifically
            if (images.brideId) {
                try {
                    console.log(`🔍 Fetching front identity image for bride ID: ${images.brideId}`);
                    const frontImage = await brideService.getBrideImageByTypeAndAngle(images.brideId, 'identity', 'front');
                    brideFrontImageUrl = frontImage.image_url;
                    console.log('✅ Found front image in database:', brideFrontImageUrl);
                } catch (err) {
                    console.log('⚠️ Could not find specific front image in DB, falling back to provided URL/File');
                }
            }

            // Track whether the bride/dress images are fresh uploads
            // (so we know to auto-save them to the gallery for next time).
            let brideWasFreshUpload = false;
            let dressWasFreshUpload = false;

            if (!brideFrontImageUrl) {
                if (images.brideImageUrl) {
                    console.log('🔗 Using existing bride image URL:', images.brideImageUrl);
                    brideFrontImageUrl = images.brideImageUrl;
                } else if (images.brideImage) {
                    console.log('📤 Uploading new bride image...');
                    const brideResult = await storageService.uploadImage(
                        process.env.SUPABASE_BUCKET_NAME,
                        `${sessionId}/bride-${Date.now()}.${this.getFileExtension(images.brideImage.mimetype)}`,
                        images.brideImage.buffer,
                        images.brideImage.mimetype
                    );
                    brideFrontImageUrl = brideResult.publicUrl;
                    brideWasFreshUpload = true;
                    console.log('✅ Bride image uploaded successfully');
                }
            }

            if (!brideFrontImageUrl) {
                throw new Error('No bride identity image (front view) provided or found');
            }

            uploadedImages.brideImageUrl = brideFrontImageUrl;
            console.log('🔗 FINAL BRIDE URL FOR VTON:', uploadedImages.brideImageUrl);
            console.log('');

            if (options.generationMode === 'vton') {
                // Three input paths: gallery URL, uploaded file, or fail
                if (images.dressImageUrl) {
                    console.log('🔗 Using existing dress image URL:', images.dressImageUrl);
                    uploadedImages.dressImageUrl = images.dressImageUrl;
                } else if (images.dressImage) {
                console.log('👗 [2/4] UPLOADING DRESS IMAGE...');
                const dressResult = await storageService.uploadImage(
                    process.env.SUPABASE_BUCKET_NAME,
                    `${sessionId}/dress-${Date.now()}.${this.getFileExtension(images.dressImage.mimetype)}`,
                    images.dressImage.buffer,
                    images.dressImage.mimetype
                );
                uploadedImages.dressImageUrl = dressResult.publicUrl;
                dressWasFreshUpload = true;
                } else {
                    throw new Error('Dress image (file or URL) is required for VTON mode');
                }
                console.log('✅ ✅ ✅ DRESS IMAGE UPLOADED SUCCESSFULLY! ✅ ✅ ✅');
                console.log('🔗 PUBLIC URL:');
                console.log('   👉', uploadedImages.dressImageUrl);
            } else if (options.generationMode === 'worn_dress') {
                console.log('👰‍♀️ [2/4] PROCESSING WORN DRESS IMAGE...');
                if (images.wornDressImageUrl) {
                    console.log('🔗 Using existing worn dress image URL:', images.wornDressImageUrl);
                    uploadedImages.wornDressImageUrl = images.wornDressImageUrl;
                } else if (images.wornDressImage) {
                    const wornDressResult = await storageService.uploadImage(
                        process.env.SUPABASE_BUCKET_NAME,
                        `${sessionId}/worn-dress-${Date.now()}.${this.getFileExtension(images.wornDressImage.mimetype)}`,
                        images.wornDressImage.buffer,
                        images.wornDressImage.mimetype
                    );
                    uploadedImages.wornDressImageUrl = wornDressResult.publicUrl;
                    console.log('✅ ✅ ✅ WORN DRESS IMAGE UPLOADED SUCCESSFULLY! ✅ ✅ ✅');
                } else {
                    throw new Error('No worn dress image provided for Worn Dress Mode');
                }
            }
            console.log('');

            if (images.jewelleryImage) {
                console.log('💎 [3/4] UPLOADING JEWELLERY IMAGE...');
                const jewelleryResult = await storageService.uploadImage(
                    process.env.SUPABASE_BUCKET_NAME,
                    `${sessionId}/jewellery-${Date.now()}.${this.getFileExtension(images.jewelleryImage.mimetype)}`,
                    images.jewelleryImage.buffer,
                    images.jewelleryImage.mimetype
                );
                uploadedImages.jewelleryImageUrl = jewelleryResult.publicUrl;
                console.log('✅ ✅ ✅ JEWELLERY IMAGE UPLOADED SUCCESSFULLY! ✅ ✅ ✅');
                console.log('🔗 PUBLIC URL:');
                console.log('   👉', uploadedImages.jewelleryImageUrl);
                console.log('');
            } else {
                console.log('⏭️  [3/4] SKIPPING JEWELLERY IMAGE (not provided)');
                console.log('');
            }

            if (images.logo && options.showBranding) {
                console.log('🏷️  [4/4] UPLOADING LOGO...');
                const logoResult = await storageService.uploadImage(
                    process.env.SUPABASE_BUCKET_NAME,
                    `${sessionId}/logo-${Date.now()}.${this.getFileExtension(images.logo.mimetype)}`,
                    images.logo.buffer,
                    images.logo.mimetype
                );
                uploadedImages.logoUrl = logoResult.publicUrl;
                console.log('✅ ✅ ✅ LOGO UPLOADED SUCCESSFULLY! ✅ ✅ ✅');
                console.log('🔗 PUBLIC URL:');
                console.log('   👉', uploadedImages.logoUrl);
                console.log('');
            } else {
                console.log('⏭️  [4/4] SKIPPING LOGO (not provided or branding disabled)');
                console.log('');
            }

            console.log('\n🎉 ========================================');
            console.log('📦 📦 📦 ALL UPLOADED IMAGE URLS 📦 📦 📦');
            console.log('========================================');
            console.log('👰 BRIDE IMAGE:');
            console.log('   👉', uploadedImages.brideImageUrl);
            console.log('');
            console.log('👗 DRESS IMAGE:');
            console.log('   👉', uploadedImages.dressImageUrl);
            if (uploadedImages.jewelleryImageUrl) {
                console.log('');
                console.log('💎 JEWELLERY IMAGE:');
                console.log('   👉', uploadedImages.jewelleryImageUrl);
            }
            if (uploadedImages.logoUrl) {
                console.log('');
                console.log('🏷️  LOGO:');
                console.log('   👉', uploadedImages.logoUrl);
            }
            console.log('========================================\n');

            console.log('🎬 Kicking off AI pipeline in background...');

            // Build the payload for the orchestrator
            const workflowPayload = {
                sessionId,
                clientImageUrl    : uploadedImages.brideImageUrl,
                dressImageUrl     : uploadedImages.dressImageUrl,
                wornDressImageUrl : uploadedImages.wornDressImageUrl,
                customDetails: {
                    weddingType      : options.weddingType  || 'bride_only',
                    outfitType       : options.outfitType   || 'dress',
                    enableSound      : options.enableSound  !== false,
                    videoDuration    : options.videoDuration || 15,
                    scenario         : options.scenario || '',
                    customPrompt     : options.customPrompt || '',
                    model            : options.model || 'kling-3.0',
                    resolution       : options.resolution || '720p',
                    mode             : options.mode || 'fast',
                    multiShot        : options.multiShot !== false,
                    sound            : options.enableSound  !== false,
                    jewelleryStyle   : options.jewelleryStyle,
                    makeup           : options.makeup,
                    appearanceMode   : options.appearanceMode,
                    logoUrl          : uploadedImages.logoUrl,
                    sceneDescription : options.sceneDescription
                }
            };

            // Auto-save fresh uploads to the gallery so the next run can
            // pick them from the library instead of re-uploading. Fire and
            // forget — never blocks generation; a save failure is just a
            // warning in the logs.
            if (brideWasFreshUpload) {
                _autoSaveBrideToGallery(uploadedImages.brideImageUrl);
            }
            if (dressWasFreshUpload) {
                _autoSaveDressToGallery(uploadedImages.dressImageUrl);
            }

            // ✅ FIRE-AND-FORGET — returns instantly, pipeline runs in background
            aiWorkflowService.initiateWorkflow(workflowPayload);

            // Return immediately — frontend gets sessionId and polls for progress
            const videoData = {
                id          : sessionId,
                sessionId,
                status      : 'started',
                message     : 'Pipeline started. Connect via WebSocket for live progress.',
                weddingType : options.weddingType || 'bride_only',
                aspectRatio : '9:16',
                ...uploadedImages,
                createdAt   : new Date().toISOString()
            };

            console.log(`✅ Pipeline initiated for session: ${sessionId}`);
            return videoData;


        } catch (error) {
            console.error('❌ Video generation failed:', error);
            throw new Error(`Failed to generate video: ${error.message}`);
        }
    }

    async getAllVideos(type) {
        try {
            const filters = {};
            if (type) {
                filters.type = type; // 'generated' or 'uploaded'
            }
            return await videoRepository.findAll(filters);
        } catch (error) {
            throw new Error(`Failed to fetch videos: ${error.message}`);
        }
    }

    async getVideoById(id) {
        try {
            const video = await videoRepository.findById(id);
            if (!video) {
                throw new Error('Video not found');
            }
            return video;
        } catch (error) {
            throw new Error(`Failed to fetch video: ${error.message}`);
        }
    }

    async uploadVideo(file, metadata) {
        try {
            const videoId = randomUUID();

            console.log(`📹 Uploading video: ${metadata.title}`);

            // Upload video to storage
            const videoPath = `videos/${videoId}/${Date.now()}-${this.sanitizeFilename(metadata.title)}.${this.getVideoExtension(file.mimetype)}`;
            const uploadResult = await storageService.uploadVideo(
                process.env.SUPABASE_BUCKET_NAME,
                videoPath,
                file.buffer,
                file.mimetype
            );

            console.log('✅ Video uploaded to private storage');

            // Create video record
            const videoData = {
                id: videoId,
                title: metadata.title,
                description: metadata.description || '',
                video_url: uploadResult.publicUrl,
                type: 'uploaded',
                metadata: {
                    uploadedBy: metadata.uploadedBy || 'boutique_owner',
                    originalFilename: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype
                }
            };

            const video = await videoRepository.create(videoData);

            console.log(`✅ Video record created successfully: ${video.id}`);

            return video;
        } catch (error) {
            console.error('❌ Failed to upload video:', error);
            throw new Error(`Failed to upload video: ${error.message}`);
        }
    }

    async saveVideo(videoData) {
        try {
            return await videoRepository.create(videoData);
        } catch (error) {
            throw new Error(`Failed to save video: ${error.message}`);
        }
    }

    async deleteVideo(id) {
        try {
            await this.getVideoById(id); // throws 404 if not found
            return await videoRepository.delete(id);
        } catch (error) {
            throw new Error(`Failed to delete video: ${error.message}`);
        }
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase();
    }

    getVideoExtension(mimetype) {
        const extensions = {
            'video/mp4': 'mp4',
            'video/mpeg': 'mpeg',
            'video/quicktime': 'mov',
            'video/x-msvideo': 'avi',
            'video/webm': 'webm'
        };
        return extensions[mimetype] || 'mp4';
    }

    getFileExtension(mimetype) {
        const extensions = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp'
        };
        return extensions[mimetype] || 'jpg';
    }
}

module.exports = new VideoService();
