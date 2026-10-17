const brideService = require('../services/brideService');

/**
 * Bride Controller - Handles HTTP requests for bride operations
 */
class BrideController {
    /**
     * Create new bride profile
     * @route POST /api/brides
     */
    async createBride(req, res) {
        try {
            const brideData = req.body;
            const bride = await brideService.createBride(brideData);

            res.status(201).json({
                success: true,
                data: bride,
                message: 'Bride profile created successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Create bride with images (all-in-one upload)
     * @route POST /api/brides/upload
     * @body name - Bride name
     * @body status - Bride status (optional, defaults to 'draft')
     * @body imageType - Type of images (optional, defaults to 'identity')
     * @body angles - Optional parallel array of angle labels matching each image
     * @files images - One or more image files (multer.array('images'))
     */
    async createBrideWithImages(req, res) {
        try {
            const { name, status = 'draft', imageType = 'identity' } = req.body;

            // Validate bride name
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Bride name is required',
                });
            }

            // Validate at least one image
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one image is required',
                });
            }

            // Normalize angles[] from body — multer/multipart sends repeated fields as
            // a string when there's one and an array when there are many.
            let angles = req.body.angles;
            if (angles == null) angles = [];
            if (!Array.isArray(angles)) angles = [angles];

            // Create the bride and upload images
            const result = await brideService.createBrideWithImages({
                name: name.trim(),
                status,
                imageType,
                files: req.files,
                angles
            });

            res.status(201).json({
                success: true,
                data: result,
                message: `Bride "${name}" created successfully with ${result.images.length} image(s)`,
            });
        } catch (error) {
            console.error('Error in createBrideWithImages:', error);
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Get all brides
     * @route GET /api/brides
     * @query status - Filter by status (draft, active, archived)
     */
    async getAllBrides(req, res) {
        try {
            const filters = {};
            if (req.query.status) {
                filters.status = req.query.status;
            }

            const brides = await brideService.getAllBrides(filters);

            res.json({
                success: true,
                data: brides,
                count: brides.length,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Get bride by ID
     * @route GET /api/brides/:id
     */
    async getBrideById(req, res) {
        try {
            const { id } = req.params;
            const bride = await brideService.getBrideById(id);

            res.json({
                success: true,
                data: bride,
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Get bride by name
     * @route GET /api/brides/name/:name
     */
    async getBrideByName(req, res) {
        try {
            const { name } = req.params;
            const bride = await brideService.getBrideByName(name);

            res.json({
                success: true,
                data: bride,
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Get bride with all images
     * @route GET /api/brides/:id/with-images
     */
    async getBrideWithImages(req, res) {
        try {
            const { id } = req.params;
            const bride = await brideService.getBrideWithImages(id);

            res.json({
                success: true,
                data: bride,
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Update bride profile
     * @route PUT /api/brides/:id
     */
    async updateBride(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const bride = await brideService.updateBride(id, updateData);

            res.json({
                success: true,
                data: bride,
                message: 'Bride profile updated successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Update bride status
     * @route PUT /api/brides/:id/status
     */
    async updateBrideStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Status is required',
                });
            }

            const bride = await brideService.updateBrideStatus(id, status);

            res.json({
                success: true,
                data: bride,
                message: 'Bride status updated successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Delete bride
     * @route DELETE /api/brides/:id
     */
    async deleteBride(req, res) {
        try {
            const { id } = req.params;
            await brideService.deleteBride(id);

            res.json({
                success: true,
                message: 'Bride deleted successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Upload bride images
     * @route POST /api/brides/:id/images
     * @body imageType - Type of images (identity or worn_dress)
     * @files Multiple image files with angle in filename or fieldname
     */
    async uploadBrideImages(req, res) {
        try {
            const { id } = req.params;
            const { imageType } = req.body;

            if (!imageType) {
                return res.status(400).json({
                    success: false,
                    error: 'Image type is required (identity or worn_dress)',
                });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No images provided',
                });
            }

            const images = await brideService.uploadBrideImages(id, req.files, imageType);

            res.status(201).json({
                success: true,
                data: images,
                message: `${images.length} image(s) uploaded successfully`,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Get bride images
     * @route GET /api/brides/:id/images
     * @query imageType - Filter by image type
     * @query angle - Filter by angle
     */
    async getBrideImages(req, res) {
        try {
            const { id } = req.params;
            const filters = {};

            if (req.query.imageType) {
                filters.imageType = req.query.imageType;
            }

            if (req.query.angle) {
                filters.angle = req.query.angle;
            }

            const images = await brideService.getBrideImages(id, filters);

            res.json({
                success: true,
                data: images,
                count: images.length,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Get specific bride image by type and angle
     * @route GET /api/brides/:id/images/:imageType/:angle
     */
    async getBrideImageByTypeAndAngle(req, res) {
        try {
            const { id, imageType, angle } = req.params;
            const image = await brideService.getBrideImageByTypeAndAngle(id, imageType, angle);

            res.json({
                success: true,
                data: image,
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Delete bride image
     * @route DELETE /api/brides/:id/images/:imageId
     */
    async deleteBrideImage(req, res) {
        try {
            const { id, imageId } = req.params;
            await brideService.deleteBrideImage(id, imageId);

            res.json({
                success: true,
                message: 'Image deleted successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * Search brides by name
     * @route GET /api/brides/search
     * @query q - Search term
     */
    async searchBrides(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    error: 'Search term (q) is required',
                });
            }

            const brides = await brideService.searchBrides(q);

            res.json({
                success: true,
                data: brides,
                count: brides.length,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
}

module.exports = new BrideController();
