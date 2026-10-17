/**
 * cdnDownloader.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Downloads Kling CDN links and saves them permanently to Supabase Storage.
 *
 * WHY THIS EXISTS:
 *   Kling CDN URLs expire after a short time (hours/days). If you store the
 *   raw Kling URL in your DB and the link expires, the video is gone forever.
 *   This utility downloads the file immediately and re-uploads to Supabase
 *   so you have a permanent copy under your own control.
 *
 * Usage:
 *   const permanentUrl = await cdnDownloader.downloadAndStore(klingUrl, 'videos/session_id/shotA.mp4');
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const sharp = require('sharp');

// Lazy-load supabaseAdmin so this module works before .env is injected
const getSupabase = () => require('../config/supabase').supabaseAdmin;

const MAX_IMAGE_BYTES = 9 * 1024 * 1024; // 9MB — stay safely under Kling's 10MB limit

/**
 * Compress image buffer to JPEG under 9MB.
 * Tries quality 85 → 75 → 65 → 55 until under limit.
 */
async function compressImage(buffer) {
    for (const quality of [85, 75, 65, 55]) {
        const compressed = await sharp(buffer).jpeg({ quality }).toBuffer();
        if (compressed.length <= MAX_IMAGE_BYTES) {
            console.log(`✅ [CdnDownloader] Compressed to ${(compressed.length / 1024).toFixed(0)}KB (quality ${quality})`);
            return compressed;
        }
    }
    // Last resort: resize to 2048px wide, then compress
    const resized = await sharp(buffer).resize({ width: 2048, withoutEnlargement: true }).jpeg({ quality: 55 }).toBuffer();
    console.log(`✅ [CdnDownloader] Resized+compressed to ${(resized.length / 1024).toFixed(0)}KB`);
    return resized;
}

class CdnDownloader {

    /**
     * Download a file from a CDN URL and upload it to Supabase Storage.
     *
     * @param {string} cdnUrl        – Temporary Kling CDN URL
     * @param {string} storagePath   – Target path inside Supabase bucket
     *                                 e.g. 'kling-results/session123/vton.jpg'
     * @param {string} contentType   – MIME type: 'image/jpeg', 'video/mp4', etc.
     * @returns {string}             – Permanent public Supabase URL
     */
    async downloadAndStore(cdnUrl, storagePath, contentType = 'application/octet-stream') {
        if (!cdnUrl || !cdnUrl.startsWith('http')) {
            console.warn(`⚠️  [CdnDownloader] Skipping invalid URL: ${cdnUrl}`);
            return cdnUrl; // Return as-is if not a CDN URL
        }

        console.log(`⬇️  [CdnDownloader] Downloading: ${cdnUrl.slice(0, 80)}...`);

        // 1. Download the file as a buffer
        let fileBuffer;
        try {
            const response = await axios.get(cdnUrl, {
                responseType : 'arraybuffer',
                timeout      : 60000,  // 60 second timeout for large videos
                headers      : { 'User-Agent': 'LadiesPlanet-Backend/1.0' }
            });
            fileBuffer = Buffer.from(response.data);
            console.log(`✅ [CdnDownloader] Downloaded ${(fileBuffer.length / 1024).toFixed(0)}KB`);
        } catch (err) {
            console.error(`❌ [CdnDownloader] Download failed: ${err.message}`);
            // Return original CDN URL as fallback — better than crashing
            return cdnUrl;
        }

        // 2. Upload to Supabase Storage
        try {
            const bucket = process.env.SUPABASE_BUCKET_NAME;
            const supabaseAdmin = getSupabase();

            const { error: uploadError } = await supabaseAdmin.storage
                .from(bucket)
                .upload(storagePath, fileBuffer, {
                    contentType,
                    cacheControl : '31536000', // 1 year cache (permanent)
                    upsert       : true
                });

            if (uploadError) {
                console.error(`❌ [CdnDownloader] Supabase upload failed: ${uploadError.message}`);
                return cdnUrl; // Fallback to CDN URL
            }

            const signedUrl = await require('../services/storageService').createSignedUrl(bucket, storagePath);
            console.log('✅ [CdnDownloader] Stored in private storage');
            return signedUrl;

        } catch (err) {
            console.error(`❌ [CdnDownloader] Supabase error: ${err.message}`);
            return cdnUrl; // Fallback
        }
    }

    /**
     * Download and store a Kling image result (VTON output / enhanced image).
     * Convenience wrapper for images.
     */
    async storeImage(cdnUrl, sessionId, label = 'image') {
        // Always store as JPEG after compression to stay under Kling's 10MB limit
        const path = `kling-results/${sessionId}/${label}.jpg`;

        // Download first, then compress if needed before storing
        console.log(`⬇️  [CdnDownloader] Downloading: ${cdnUrl.slice(0, 80)}...`);
        const response = await axios.get(cdnUrl, {
            responseType : 'arraybuffer',
            timeout      : 60000,
            headers      : { 'User-Agent': 'LadiesPlanet-Backend/1.0' }
        });
        let fileBuffer = Buffer.from(response.data);
        console.log(`✅ [CdnDownloader] Downloaded ${(fileBuffer.length / 1024).toFixed(0)}KB`);

        if (fileBuffer.length > MAX_IMAGE_BYTES) {
            console.log(`⚠️  [CdnDownloader] Image too large (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB) — compressing...`);
            fileBuffer = await compressImage(fileBuffer);
        }

        const bucket = process.env.SUPABASE_BUCKET_NAME;
        const supabaseAdmin = getSupabase();
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(path, fileBuffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true });

        if (error) {
            console.error(`❌ [CdnDownloader] Supabase upload failed: ${error.message}`);
            return cdnUrl;
        }

        const signedUrl = await require('../services/storageService').createSignedUrl(bucket, path);
        console.log('✅ [CdnDownloader] Stored image in private storage');
        return signedUrl;
    }

    /**
     * Download and store a Kling video result.
     * Convenience wrapper for videos.
     */
    async storeVideo(cdnUrl, sessionId, label = 'video') {
        const path = `kling-results/${sessionId}/${label}.mp4`;
        return await this.downloadAndStore(cdnUrl, path, 'video/mp4');
    }

    /**
     * Store all 3 shots from multi-shot generation.
     * @returns {string[]} – Array of 3 permanent video URLs
     */
    async storeShots(shotUrls, sessionId) {
        const labels = ['shotA', 'shotB', 'shotC'];
        return await Promise.all(
            shotUrls.map((url, i) => this.storeVideo(url, sessionId, labels[i] || `shot${i}`))
        );
    }
}

module.exports = new CdnDownloader();
