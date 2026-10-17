/**
 * imageValidator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates image URLs BEFORE sending to Kling API.
 *
 * Kling requirements (from official docs):
 *   ✅ Must be public HTTPS URL (private / signed URLs will fail)
 *   ✅ Max file size: 10 MB
 *   ✅ Minimum dimensions: 300 × 300 px
 *   ✅ Format: JPEG or PNG only (WEBP causes issues with VTON)
 *   ✅ Must be reachable from Kling's servers (no localhost / intranet URLs)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');

class ImageValidator {

    /**
     * Validate a single image URL for Kling API compatibility.
     * Throws a descriptive error if validation fails.
     * Returns { contentType, sizeBytes } on success.
     */
    async validate(imageUrl, label = 'image') {
        // 1. Must be a string
        if (!imageUrl || typeof imageUrl !== 'string') {
            throw new Error(`[ImageValidator] ${label}: URL is missing or not a string`);
        }

        // 2. Must be HTTPS (Kling cannot fetch HTTP or private URLs)
        if (!imageUrl.startsWith('https://')) {
            throw new Error(`[ImageValidator] ${label}: URL must be HTTPS. Got: ${imageUrl.slice(0, 60)}`);
        }

        // 3. Must not be localhost / intranet
        const lowerUrl = imageUrl.toLowerCase();
        if (
            lowerUrl.includes('localhost') ||
            lowerUrl.includes('127.0.0.1') ||
            lowerUrl.includes('192.168.') ||
            lowerUrl.includes('10.0.') ||
            lowerUrl.includes('::1')
        ) {
            throw new Error(`[ImageValidator] ${label}: URL must be publicly accessible, not localhost/intranet`);
        }

        // 4. HEAD request to check reachability, content-type, and size
        let headRes;
        try {
            headRes = await axios.head(imageUrl, { timeout: 10000 });
        } catch (err) {
            throw new Error(`[ImageValidator] ${label}: URL is not reachable. ${err.message}`);
        }

        // 5. Check Content-Type — Kling VTON works best with JPEG/PNG
        const contentType = headRes.headers['content-type'] || '';
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const isAllowed = allowedTypes.some(t => contentType.includes(t));
        if (!isAllowed) {
            console.warn(`⚠️  [ImageValidator] ${label}: Content-Type is "${contentType}". Prefer JPEG/PNG for VTON.`);
            // Warning only — don't throw, some CDNs return generic content-type
        }

        // 6. Check file size ≤ 10 MB
        const contentLength = parseInt(headRes.headers['content-length'] || '0', 10);
        const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
        if (contentLength > 0 && contentLength > MAX_BYTES) {
            throw new Error(
                `[ImageValidator] ${label}: File too large (${(contentLength / 1024 / 1024).toFixed(1)}MB). Max is 10MB.`
            );
        }

        console.log(`✅ [ImageValidator] ${label}: Valid — ${contentType} ${contentLength > 0 ? `(${(contentLength / 1024).toFixed(0)}KB)` : '(size unknown)'}`);

        return { contentType, sizeBytes: contentLength };
    }

    /**
     * Validate multiple image URLs at once.
     * @param {Object} urlMap  e.g. { humanImage: 'https://...', clothImage: 'https://...' }
     * Throws on the first failure.
     */
    async validateAll(urlMap) {
        for (const [label, url] of Object.entries(urlMap)) {
            if (url) await this.validate(url, label);
        }
    }
}

module.exports = new ImageValidator();
