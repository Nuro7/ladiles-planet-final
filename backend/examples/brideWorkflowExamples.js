/**
 * Example: Integrating Bride Management with Video Workflow
 * 
 * This file demonstrates how to use the bride management system
 * in your video generation workflow
 */

const brideService = require('../services/brideService');
const aiWorkflowService = require('../services/aiWorkflowService');

/**
 * Example 1: Generate video using stored bride images
 */
async function generateVideoWithStoredBride(brideId, dressImageUrl, themeId, sessionId) {
    try {
        console.log(`[${sessionId}] 🎬 Starting video generation with stored bride...`);

        // Get bride's front identity image
        const clientImageUrl = await aiWorkflowService.getBrideImageById(
            brideId,
            'identity',
            'front'
        );

        console.log(`[${sessionId}] ✅ Retrieved bride image: ${clientImageUrl}`);

        // Generate video using the workflow
        const result = await aiWorkflowService.generateVideoWorkflow({
            sessionId,
            clientImageUrl,
            dressImageUrl,
            themeId,
            customDetails: null
        });

        return result;
    } catch (error) {
        console.error(`[${sessionId}] ❌ Error:`, error.message);
        throw error;
    }
}

/**
 * Example 2: Generate video using bride name
 */
async function generateVideoWithBrideName(brideName, dressImageUrl, themeId, sessionId) {
    try {
        console.log(`[${sessionId}] 🎬 Starting video generation for bride: ${brideName}`);

        // Get bride's front identity image by name
        const clientImageUrl = await aiWorkflowService.getBrideImageByName(
            brideName,
            'identity',
            'front'
        );

        console.log(`[${sessionId}] ✅ Retrieved bride image: ${clientImageUrl}`);

        // Generate video using the workflow
        const result = await aiWorkflowService.generateVideoWorkflow({
            sessionId,
            clientImageUrl,
            dressImageUrl,
            themeId,
            customDetails: null
        });

        return result;
    } catch (error) {
        console.error(`[${sessionId}] ❌ Error:`, error.message);
        throw error;
    }
}

/**
 * Example 3: Generate videos for all angles
 */
async function generateVideosForAllAngles(brideId, dressImageUrl, themeId, baseSessionId) {
    try {
        const angles = ['front', 'left', 'right', 'back'];
        const results = [];

        for (const angle of angles) {
            const sessionId = `${baseSessionId}-${angle}`;
            console.log(`[${sessionId}] 🎬 Generating video for ${angle} angle...`);

            // Get bride image for this angle
            const clientImageUrl = await aiWorkflowService.getBrideImageById(
                brideId,
                'identity',
                angle
            );

            // Generate video
            const result = await aiWorkflowService.generateVideoWorkflow({
                sessionId,
                clientImageUrl,
                dressImageUrl,
                themeId,
                customDetails: null
            });

            results.push({
                angle,
                videoUrl: result.videoUrl,
                sessionId
            });
        }

        return results;
    } catch (error) {
        console.error('❌ Error generating videos for all angles:', error.message);
        throw error;
    }
}

/**
 * Example 4: Complete workflow - Create bride and generate video
 */
async function completeWorkflow(brideName, imageFiles, dressImageUrl, themeId, sessionId) {
    try {
        console.log(`[${sessionId}] 🚀 Starting complete workflow...`);

        // Step 1: Create bride profile
        console.log(`[${sessionId}] 📝 Creating bride profile...`);
        const bride = await brideService.createBride({
            name: brideName,
            status: 'draft'
        });

        console.log(`[${sessionId}] ✅ Bride created: ${bride.id}`);

        // Step 2: Upload bride images
        console.log(`[${sessionId}] 📤 Uploading bride images...`);
        const images = await brideService.uploadBrideImages(
            bride.id,
            imageFiles,
            'identity'
        );

        console.log(`[${sessionId}] ✅ ${images.length} images uploaded`);

        // Step 3: Update bride status to active
        console.log(`[${sessionId}] 🔄 Activating bride profile...`);
        await brideService.updateBrideStatus(bride.id, 'active');

        // Step 4: Generate video
        console.log(`[${sessionId}] 🎬 Generating video...`);
        const clientImageUrl = await aiWorkflowService.getBrideImageById(
            bride.id,
            'identity',
            'front'
        );

        const result = await aiWorkflowService.generateVideoWorkflow({
            sessionId,
            clientImageUrl,
            dressImageUrl,
            themeId,
            customDetails: null
        });

        console.log(`[${sessionId}] ✅ Complete workflow finished!`);

        return {
            bride,
            images,
            video: result
        };
    } catch (error) {
        console.error(`[${sessionId}] ❌ Workflow error:`, error.message);
        throw error;
    }
}

/**
 * Example 5: Get bride and check image completeness
 */
async function checkBrideImageCompleteness(brideId) {
    try {
        // Get bride with all images
        const bride = await brideService.getBrideWithImages(brideId);

        // Check if all required angles are present
        const requiredAngles = ['front', 'left', 'right', 'back'];
        const identityImages = bride.images.filter(img => img.image_type === 'identity');
        const presentAngles = [...new Set(identityImages.map(img => img.angle))];
        const missingAngles = requiredAngles.filter(angle => !presentAngles.includes(angle));

        const isComplete = missingAngles.length === 0;

        console.log(`Bride: ${bride.name}`);
        console.log(`Status: ${bride.status}`);
        console.log(`Total Images: ${bride.images.length}`);
        console.log(`Identity Images: ${identityImages.length}`);
        console.log(`Present Angles: ${presentAngles.join(', ')}`);
        console.log(`Missing Angles: ${missingAngles.length > 0 ? missingAngles.join(', ') : 'None'}`);
        console.log(`Complete: ${isComplete ? '✅' : '❌'}`);

        return {
            bride,
            isComplete,
            missingAngles,
            presentAngles
        };
    } catch (error) {
        console.error('❌ Error checking bride:', error.message);
        throw error;
    }
}

/**
 * Example 6: List all active brides ready for video generation
 */
async function listActiveBrides() {
    try {
        // Get all active brides
        const brides = await brideService.getAllBrides({ status: 'active' });

        console.log(`\n📋 Active Brides (${brides.length}):\n`);

        for (const bride of brides) {
            // Get images for each bride
            const images = await brideService.getBrideImages(bride.id);
            const identityImages = images.filter(img => img.image_type === 'identity');

            console.log(`  • ${bride.name}`);
            console.log(`    ID: ${bride.id}`);
            console.log(`    Images: ${identityImages.length}/4 angles`);
            console.log(`    Created: ${bride.created_at}`);
            console.log('');
        }

        return brides;
    } catch (error) {
        console.error('❌ Error listing brides:', error.message);
        throw error;
    }
}

// Export examples
module.exports = {
    generateVideoWithStoredBride,
    generateVideoWithBrideName,
    generateVideosForAllAngles,
    completeWorkflow,
    checkBrideImageCompleteness,
    listActiveBrides
};

/**
 * USAGE IN YOUR CONTROLLER:
 * 
 * const { generateVideoWithStoredBride } = require('../examples/brideWorkflowExamples');
 * 
 * // In your video generation endpoint:
 * router.post('/generate-with-bride', async (req, res) => {
 *     try {
 *         const { brideId, dressImageUrl, themeId, sessionId } = req.body;
 *         
 *         const result = await generateVideoWithStoredBride(
 *             brideId,
 *             dressImageUrl,
 *             themeId,
 *             sessionId
 *         );
 *         
 *         res.json({
 *             success: true,
 *             data: result
 *         });
 *     } catch (error) {
 *         res.status(400).json({
 *             success: false,
 *             error: error.message
 *         });
 *     }
 * });
 */
