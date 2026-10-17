/**
 * Bride Helper Utilities
 * Utility functions for bride management
 */

/**
 * Validate bride name
 * @param {string} name - Bride name to validate
 * @returns {boolean} - True if valid
 */
function isValidBrideName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= 255;
}

/**
 * Validate bride status
 * @param {string} status - Status to validate
 * @returns {boolean} - True if valid
 */
function isValidBrideStatus(status) {
    const validStatuses = ['draft', 'active', 'archived'];
    return validStatuses.includes(status);
}

/**
 * Validate image type
 * @param {string} imageType - Image type to validate
 * @returns {boolean} - True if valid
 */
function isValidImageType(imageType) {
    const validTypes = ['identity', 'worn_dress'];
    return validTypes.includes(imageType);
}

/**
 * Validate image angle
 * @param {string} angle - Angle to validate
 * @returns {boolean} - True if valid
 */
function isValidImageAngle(angle) {
    const validAngles = ['front', 'left', 'right', 'back', 'unknown'];
    return validAngles.includes(angle);
}

/**
 * Sanitize bride name for storage paths
 * @param {string} name - Bride name
 * @returns {string} - Sanitized name
 */
function sanitizeBrideName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Generate storage path for bride image
 * @param {string} brideName - Bride name
 * @param {string} imageType - Image type
 * @param {string} angle - Image angle
 * @param {string} extension - File extension
 * @returns {string} - Storage path
 */
function generateBrideImagePath(brideName, imageType, angle, extension) {
    const sanitized = sanitizeBrideName(brideName);
    return `${sanitized}/${imageType}/${angle}${extension}`;
}

/**
 * Extract angle from filename
 * @param {string} filename - Filename
 * @returns {string} - Detected angle or 'unknown'
 */
function extractAngleFromFilename(filename) {
    const lower = filename.toLowerCase();

    if (lower.includes('front')) return 'front';
    if (lower.includes('left')) return 'left';
    if (lower.includes('right')) return 'right';
    if (lower.includes('back')) return 'back';

    return 'unknown';
}

/**
 * Group images by angle
 * @param {Array} images - Array of image objects
 * @returns {Object} - Images grouped by angle
 */
function groupImagesByAngle(images) {
    return images.reduce((acc, image) => {
        if (!acc[image.angle]) {
            acc[image.angle] = [];
        }
        acc[image.angle].push(image);
        return acc;
    }, {});
}

/**
 * Group images by type
 * @param {Array} images - Array of image objects
 * @returns {Object} - Images grouped by type
 */
function groupImagesByType(images) {
    return images.reduce((acc, image) => {
        if (!acc[image.image_type]) {
            acc[image.image_type] = [];
        }
        acc[image.image_type].push(image);
        return acc;
    }, {});
}

/**
 * Check if all required angles are present
 * @param {Array} images - Array of image objects
 * @returns {Object} - Missing angles info
 */
function checkRequiredAngles(images) {
    const requiredAngles = ['front', 'left', 'right', 'back'];
    const presentAngles = [...new Set(images.map(img => img.angle))];
    const missingAngles = requiredAngles.filter(angle => !presentAngles.includes(angle));

    return {
        complete: missingAngles.length === 0,
        missing: missingAngles,
        present: presentAngles
    };
}

/**
 * Format bride data for API response
 * @param {Object} bride - Bride object
 * @param {Array} images - Optional images array
 * @returns {Object} - Formatted bride data
 */
function formatBrideResponse(bride, images = null) {
    const formatted = {
        id: bride.id,
        name: bride.name,
        status: bride.status,
        createdAt: bride.created_at,
    };

    if (images) {
        formatted.images = images.map(img => ({
            id: img.id,
            imageUrl: img.image_url,
            imageType: img.image_type,
            angle: img.angle,
            createdAt: img.created_at
        }));

        // Add image statistics
        formatted.imageStats = {
            total: images.length,
            byType: groupImagesByType(images),
            byAngle: groupImagesByAngle(images),
            completeness: checkRequiredAngles(images)
        };
    }

    return formatted;
}

/**
 * Validate file is an image
 * @param {Object} file - File object
 * @returns {boolean} - True if valid image
 */
function isValidImageFile(file) {
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return file && validMimeTypes.includes(file.mimetype);
}

/**
 * Get file extension from mimetype
 * @param {string} mimetype - MIME type
 * @returns {string} - File extension
 */
function getExtensionFromMimetype(mimetype) {
    const mimeMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif'
    };
    return mimeMap[mimetype] || '.jpg';
}

module.exports = {
    isValidBrideName,
    isValidBrideStatus,
    isValidImageType,
    isValidImageAngle,
    sanitizeBrideName,
    generateBrideImagePath,
    extractAngleFromFilename,
    groupImagesByAngle,
    groupImagesByType,
    checkRequiredAngles,
    formatBrideResponse,
    isValidImageFile,
    getExtensionFromMimetype
};
