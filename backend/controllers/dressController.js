const dressService = require('../services/dressService');
const { dressAvailability } = require('../utils/dressAvailability');

/**
 * Dress Controller - Handles HTTP requests for dress management
 */
class DressController {
    /**
     * Upload new dress
     * @route POST /api/dresses/upload
     */
    async uploadDress(req, res) {
        console.log('\n🎯 ========================================');
        console.log('📥 RECEIVED REQUEST AT /api/dresses/upload');
        console.log('========================================');
        console.log('⏰ Time:', new Date().toISOString());
        console.log('📦 File received:', req.file ? req.file.originalname : 'NONE');
        console.log('📋 Body:', req.body);
        console.log('========================================\n');

        try {
            const photos = req.files?.images || req.files?.image || (req.file ? [req.file] : []);
            if (!photos.length) {
                console.log('❌ Validation failed: No image file provided');
                return res.status(400).json({
                    success: false,
                    error: 'Dress image is required'
                });
            }

            const { name, description, category, sku, isAvailable, uploadedBy } = req.body;

            if (!name || !category) {
                console.log('❌ Validation failed: Missing required fields');
                return res.status(400).json({
                    success: false,
                    error: 'Dress name and category are required'
                });
            }

            console.log('✅ Validation passed - uploading dress');

            const metadata = {
                name,
                description,
                category,
                sku,
                isAvailable: dressAvailability(isAvailable),
                uploadedBy,
                additionalData: req.body.metadata ? JSON.parse(req.body.metadata) : {},
                views: req.body.views ? JSON.parse(req.body.views) : [],
                coverIndex: Number(req.body.coverIndex) || 0
            };

            const dress = await dressService.uploadDress(photos, metadata);

            console.log('✅ Dress uploaded successfully:', dress.id);

            res.status(201).json({
                success: true,
                data: dress,
                message: 'Dress uploaded successfully'
            });
        } catch (error) {
            console.error('❌ Dress upload error:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    async addImages(req, res) {
        try {
            const views = req.body.views ? JSON.parse(req.body.views) : [];
            res.json({ success: true, data: await dressService.addImages(req.params.id, req.files || [], views) });
        } catch (error) { res.status(400).json({ success: false, error: error.message }); }
    }

    async reorderImages(req, res) {
        try {
            res.json({ success: true, data: await dressService.reorderImages(req.params.id, req.body.images, req.body.coverId) });
        } catch (error) { res.status(400).json({ success: false, error: error.message }); }
    }

    /**
     * Get all dresses
     * @route GET /api/dresses
     */
    async getAllDresses(req, res) {
        try {
            const filters = {
                category: req.query.category,
                availability: req.query.availability === 'true' ? true : req.query.availability === 'false' ? false : undefined,
                isDeleted: req.query.isDeleted === 'true' ? true : req.query.isDeleted === 'false' ? false : undefined,
                search: req.query.search,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };

            const dresses = await dressService.getAllDresses(filters);

            res.json({
                success: true,
                data: dresses,
                count: dresses.length,
                filters: filters
            });
        } catch (error) {
            console.error('❌ Failed to fetch dresses:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get dress by ID
     * @route GET /api/dresses/:id
     */
    async getDressById(req, res) {
        try {
            const { id } = req.params;
            const dress = await dressService.getDressById(id);

            res.json({
                success: true,
                data: dress
            });
        } catch (error) {
            console.error('❌ Failed to fetch dress:', error);
            res.status(404).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update dress metadata
     * @route PUT /api/dresses/:id
     */
    async updateDress(req, res) {
        try {
            const { id } = req.params;
            const updateData = {
                name: req.body.name,
                description: req.body.description,
                category: req.body.category,
                sku: req.body.sku,
                isAvailable: req.body.isAvailable,
                metadata: req.body.metadata
            };

            // Remove undefined values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            const dress = await dressService.updateDress(id, updateData);

            console.log('✅ Dress updated successfully:', id);

            res.json({
                success: true,
                data: dress,
                message: 'Dress updated successfully'
            });
        } catch (error) {
            console.error('❌ Failed to update dress:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update dress image
     * @route PUT /api/dresses/:id/image
     */
    async updateDressImage(req, res) {
        try {
            const { id } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'New dress image is required'
                });
            }

            const dress = await dressService.updateDressImage(id, req.file);

            console.log('✅ Dress image updated successfully:', id);

            res.json({
                success: true,
                data: dress,
                message: 'Dress image updated successfully'
            });
        } catch (error) {
            console.error('❌ Failed to update dress image:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Soft delete dress
     * @route POST /api/dresses/:id/delete
     */
    async softDeleteDress(req, res) {
        try {
            const { id } = req.params;
            const dress = await dressService.softDeleteDress(id);

            console.log('✅ Dress soft deleted successfully:', id);

            res.json({
                success: true,
                data: dress,
                message: 'Dress soft deleted successfully'
            });
        } catch (error) {
            console.error('❌ Failed to delete dress:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Restore deleted dress
     * @route POST /api/dresses/:id/restore
     */
    async restoreDress(req, res) {
        try {
            const { id } = req.params;
            const dress = await dressService.restoreDress(id);

            console.log('✅ Dress restored successfully:', id);

            res.json({
                success: true,
                data: dress,
                message: 'Dress restored successfully'
            });
        } catch (error) {
            console.error('❌ Failed to restore dress:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete dress permanently
     * @route DELETE /api/dresses/:id
     */
    async deleteDress(req, res) {
        try {
            const { id } = req.params;
            await dressService.deleteDress(id);

            console.log('✅ Dress deleted successfully:', id);

            res.json({
                success: true,
                message: 'Dress deleted permanently'
            });
        } catch (error) {
            console.error('❌ Failed to delete dress:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get dress statistics
     * @route GET /api/dresses/stats
     */
    async getDressStats(req, res) {
        try {
            const stats = await dressService.getDressStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('❌ Failed to fetch dress statistics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new DressController();
