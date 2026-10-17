const storageService = require('../services/storageService');

/**
 * Storage Controller - Handles file upload/download requests
 */
class StorageController {
    /**
     * Upload file
     * @route POST /api/storage/upload
     */
    async uploadFile(req, res) {
        try {
            const { bucket, path } = req.body;
            const file = req.file; // Assuming multer middleware

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file provided'
                });
            }

            const result = await storageService.uploadFile(
                bucket,
                path || file.originalname,
                file.buffer,
                { contentType: file.mimetype }
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'File uploaded successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Upload image
     * @route POST /api/storage/upload/image
     */
    async uploadImage(req, res) {
        try {
            const { bucket, path } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'No image provided'
                });
            }

            const result = await storageService.uploadImage(
                bucket,
                path || file.originalname,
                file.buffer,
                file.mimetype
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Image uploaded successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get public URL
     * @route GET /api/storage/url/:bucket/:path
     */
    async getPublicUrl(req, res) {
        try {
            const { bucket, path } = req.params;
            const url = await storageService.getPublicUrl(bucket, path);

            res.json({
                success: true,
                data: { url }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * List files
     * @route GET /api/storage/list/:bucket
     */
    async listFiles(req, res) {
        try {
            const { bucket } = req.params;
            const { folder } = req.query;

            const files = await storageService.listFiles(bucket, folder);

            res.json({
                success: true,
                data: files,
                count: files.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete file
     * @route DELETE /api/storage/:bucket/:path
     */
    async deleteFile(req, res) {
        try {
            const { bucket, path } = req.params;
            await storageService.deleteFile(bucket, path);

            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Create signed URL
     * @route POST /api/storage/signed-url
     */
    async createSignedUrl(req, res) {
        try {
            const { bucket, path, expiresIn } = req.body;
            const signedUrl = await storageService.createSignedUrl(bucket, path, expiresIn);

            res.json({
                success: true,
                data: { signedUrl }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new StorageController();
