const brideRepository = require('../repositories/brideRepository');
const storageService = require('./storageService');
const path = require('path');

/**
 * Bride Service - Business logic for bride management
 */
class BrideService {
    async refreshImage(image) {
        return { ...image, image_url: await storageService.refreshUrl(image.image_url) };
    }

    constructor() {
        this.VALID_STATUSES = ['draft', 'active', 'archived'];
        this.VALID_IMAGE_TYPES = ['identity', 'worn_dress'];
        this.VALID_ANGLES = ['front', 'left', 'right', 'back', 'unknown'];
        this.STORAGE_BUCKET = process.env.SUPABASE_BUCKET_NAME || 'ladies-planet-bucket';
        this.BRIDE_FOLDER = 'brides'; // Subfolder within the bucket
    }

    /**
     * Create a new bride profile
     */
    async createBride(brideData) {
        // Validate bride name
        if (!brideData.name || brideData.name.trim() === '') {
            throw new Error('Bride name is required');
        }

        // Check if bride name already exists
        const exists = await brideRepository.brideNameExists(brideData.name);
        if (exists) {
            throw new Error(`Bride with name "${brideData.name}" already exists`);
        }

        // Validate status if provided
        if (brideData.status && !this.VALID_STATUSES.includes(brideData.status)) {
            throw new Error(`Invalid status. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
        }

        return await brideRepository.createBride(brideData);
    }

    /**
     * Create bride with images in one transaction
     * @param {Object} data - { name, status, imageType, files, angles }
     *                        files: array of multer file objects
     *                        angles: optional parallel array of angle labels
     * @returns {Object} - { bride, images }
     */
    async createBrideWithImages(data) {
        const { name, status = 'draft', imageType = 'identity', files, angles = [] } = data;

        // Validate bride name
        if (!name || name.trim() === '') {
            throw new Error('Bride name is required');
        }

        // Check if bride name already exists
        const exists = await brideRepository.brideNameExists(name);
        if (exists) {
            throw new Error(`Bride with name "${name}" already exists`);
        }

        // Validate status
        if (status && !this.VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
        }

        // Validate image type
        if (!this.VALID_IMAGE_TYPES.includes(imageType)) {
            throw new Error(`Invalid image type. Must be one of: ${this.VALID_IMAGE_TYPES.join(', ')}`);
        }

        // Normalize files into an array (controller passes multer.array() output)
        const fileList = Array.isArray(files) ? files : [];
        if (fileList.length === 0) {
            throw new Error('At least one image is required');
        }

        try {
            // Step 1: Create bride profile
            const bride = await brideRepository.createBride({
                name: name.trim(),
                status: status
            });

            console.log(`✅ Bride created: ${bride.name} (ID: ${bride.id})`);

            // Step 2: Upload all provided images
            const uploadedImages = [];
            const sanitizedName = this.sanitizeBrideName(bride.name);

            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                if (!file) continue;

                // Resolve angle: client-provided → filename detection → 'unknown'
                let angle = (angles[i] || '').toString().toLowerCase().trim();
                if (!this.VALID_ANGLES.includes(angle)) {
                    angle = this.extractAngleFromFile(file);
                }

                // Indexed path keeps multiple same-angle uploads from colliding
                const ext = path.extname(file.originalname);
                const storagePath = `${this.BRIDE_FOLDER}/${bride.id}-${sanitizedName}/${imageType}/${i + 1}-${angle}${ext}`;

                console.log(`📤 Uploading image ${i + 1}/${fileList.length} (${angle}) to: ${storagePath}`);

                const uploadResult = await storageService.uploadImage(
                    this.STORAGE_BUCKET,
                    storagePath,
                    file.buffer,
                    file.mimetype
                );

                console.log('✅ Bride image uploaded to private storage');

                const imageRecord = await brideRepository.createBrideImage({
                    brideId: bride.id,
                    imageUrl: uploadResult.publicUrl,
                    imageType: imageType,
                    angle: angle,
                });

                uploadedImages.push(imageRecord);
            }

            console.log(`✅ ${uploadedImages.length} image(s) uploaded for bride: ${bride.name}`);
            await require('./savedBrideService').archive(bride, uploadedImages, fileList);

            return {
                bride,
                images: uploadedImages
            };

        } catch (error) {
            console.error('❌ Error in createBrideWithImages:', error);
            throw error;
        }
    }

    /**
     * Get all brides with optional filters
     */
    async getAllBrides(filters = {}) {
        // Validate status filter
        if (filters.status && !this.VALID_STATUSES.includes(filters.status)) {
            throw new Error(`Invalid status filter. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
        }

        const brides = await brideRepository.getAllBrides(filters);

        // Decorate each bride with its primary identity image URL so the
        // gallery picker (AssetPicker) can show thumbnails. Prefers the
        // front-angle identity shot; falls back to any image we have.
        // Done in parallel to keep the list endpoint fast.
        const decorated = await Promise.all(brides.map(async (b) => {
            try {
                const images = await Promise.all((await brideRepository.getBrideImages(b.id, { imageType: 'identity' })).map(image => this.refreshImage(image)));
                const front  = images.find(img => img.angle === 'front') || images[0];
                return {
                    ...b,
                    image_url     : front?.image_url || null,
                    front_image_url: front?.image_url || null,
                    images,
                };
            } catch {
                return { ...b, image_url: null, images: [] };
            }
        }));

        return decorated;
    }

    /**
     * Get bride by ID
     */
    async getBrideById(brideId) {
        const bride = await brideRepository.getBrideById(brideId);
        if (!bride) {
            throw new Error(`Bride with ID ${brideId} not found`);
        }
        return bride;
    }

    /**
     * Get bride by name
     */
    async getBrideByName(name) {
        const bride = await brideRepository.getBrideByName(name);
        if (!bride) {
            throw new Error(`Bride with name "${name}" not found`);
        }
        return bride;
    }

    /**
     * Get bride with all images
     */
    async getBrideWithImages(brideId) {
        const bride = await brideRepository.getBrideWithImages(brideId);
        if (!bride) {
            throw new Error(`Bride with ID ${brideId} not found`);
        }
        return { ...bride, images: await Promise.all(bride.images.map(image => this.refreshImage(image))) };
    }

    /**
     * Update bride profile
     */
    async updateBride(brideId, updateData) {
        // Check if bride exists
        await this.getBrideById(brideId);

        // Validate name if being updated
        if (updateData.name) {
            const exists = await brideRepository.brideNameExists(updateData.name, brideId);
            if (exists) {
                throw new Error(`Bride with name "${updateData.name}" already exists`);
            }
        }

        // Validate status if being updated
        if (updateData.status && !this.VALID_STATUSES.includes(updateData.status)) {
            throw new Error(`Invalid status. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
        }

        return await brideRepository.updateBride(brideId, updateData);
    }

    /**
     * Update bride status
     */
    async updateBrideStatus(brideId, status) {
        // Check if bride exists
        await this.getBrideById(brideId);

        // Validate status
        if (!this.VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
        }

        return await brideRepository.updateBrideStatus(brideId, status);
    }

    /**
     * Delete bride
     */
    async deleteBride(brideId) {
        // Check if bride exists
        const bride = await this.getBrideById(brideId);

        // Get all images to delete from storage
        const images = await brideRepository.getBrideImages(brideId);

        // Delete images from storage
        for (const image of images) {
            try {
                const urlPath = new URL(image.image_url).pathname;
                const storagePath = decodeURIComponent(urlPath.replace(/^\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//, ''));
                await storageService.deleteFile(this.STORAGE_BUCKET, storagePath);
            } catch (error) {
                console.error(`Failed to delete image from storage: ${error.message}`);
            }
        }

        // Delete bride from database (cascade deletes images)
        await brideRepository.deleteBride(brideId);

        return true;
    }

    /**
     * Upload bride images (multiple angles)
     */
    async uploadBrideImages(brideId, files, imageType) {
        // Check if bride exists
        const bride = await this.getBrideById(brideId);

        // Validate image type
        if (!this.VALID_IMAGE_TYPES.includes(imageType)) {
            throw new Error(`Invalid image type. Must be one of: ${this.VALID_IMAGE_TYPES.join(', ')}`);
        }

        // Validate files
        if (!files || files.length === 0) {
            throw new Error('No images provided');
        }

        const uploadedImages = [];

        for (const file of files) {
            // Extract angle from filename or metadata
            const angle = this.extractAngleFromFile(file);

            // Validate angle
            if (!this.VALID_ANGLES.includes(angle)) {
                throw new Error(`Invalid angle "${angle}". Must be one of: ${this.VALID_ANGLES.join(', ')}`);
            }

            // Generate storage path: brides/{id}-{bride-name}/{image-type}/{angle}.jpg
            const sanitizedName = this.sanitizeBrideName(bride.name);
            const ext = path.extname(file.originalname);
            const storagePath = `${this.BRIDE_FOLDER}/${bride.id}-${sanitizedName}/${imageType}/${angle}${ext}`;

            // Upload to storage
            const uploadResult = await storageService.uploadImage(
                this.STORAGE_BUCKET,
                storagePath,
                file.buffer,
                file.mimetype
            );

            // Save to database
            const imageRecord = await brideRepository.createBrideImage({
                brideId: brideId,
                imageUrl: uploadResult.publicUrl,
                imageType: imageType,
                angle: angle,
            });

            uploadedImages.push(imageRecord);
        }

        return uploadedImages;
    }

    /**
     * Get bride images
     */
    async getBrideImages(brideId, filters = {}) {
        // Check if bride exists
        await this.getBrideById(brideId);

        // Validate filters
        if (filters.imageType && !this.VALID_IMAGE_TYPES.includes(filters.imageType)) {
            throw new Error(`Invalid image type. Must be one of: ${this.VALID_IMAGE_TYPES.join(', ')}`);
        }

        if (filters.angle && !this.VALID_ANGLES.includes(filters.angle)) {
            throw new Error(`Invalid angle. Must be one of: ${this.VALID_ANGLES.join(', ')}`);
        }

        return Promise.all((await brideRepository.getBrideImages(brideId, filters)).map(image => this.refreshImage(image)));
    }

    /**
     * Get specific bride image by type and angle
     */
    async getBrideImageByTypeAndAngle(brideId, imageType, angle) {
        // Validate parameters
        if (!this.VALID_IMAGE_TYPES.includes(imageType)) {
            throw new Error(`Invalid image type. Must be one of: ${this.VALID_IMAGE_TYPES.join(', ')}`);
        }

        if (!this.VALID_ANGLES.includes(angle)) {
            throw new Error(`Invalid angle. Must be one of: ${this.VALID_ANGLES.join(', ')}`);
        }

        const image = await brideRepository.getBrideImageByTypeAndAngle(brideId, imageType, angle);
        if (!image) {
            throw new Error(`Image not found for bride ${brideId}, type ${imageType}, angle ${angle}`);
        }

        return this.refreshImage(image);
    }

    /**
     * Delete bride image
     */
    async deleteBrideImage(brideId, imageId) {
        // Check if bride exists
        await this.getBrideById(brideId);

        // Get image to delete from storage
        const images = await brideRepository.getBrideImages(brideId);
        const image = images.find(img => img.id === imageId);

        if (!image) {
            throw new Error(`Image with ID ${imageId} not found for bride ${brideId}`);
        }

        // Delete from storage
        try {
            const urlPath = new URL(image.image_url).pathname;
            const storagePath = urlPath.split('/').slice(2).join('/');
            await storageService.deleteFile(this.STORAGE_BUCKET, storagePath);
        } catch (error) {
            console.error(`Failed to delete image from storage: ${error.message}`);
        }

        // Delete from database
        await brideRepository.deleteBrideImage(imageId);

        return true;
    }

    /**
     * Search brides by name
     */
    async searchBrides(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            throw new Error('Search term is required');
        }

        return await brideRepository.searchBrides(searchTerm);
    }

    /**
     * Helper: Extract angle from file
     */
    extractAngleFromFile(file) {
        // Try to extract from filename
        const filename = file.originalname.toLowerCase();

        if (filename.includes('front')) return 'front';
        if (filename.includes('left')) return 'left';
        if (filename.includes('right')) return 'right';
        if (filename.includes('back')) return 'back';

        // Try from fieldname (if using multer with field names)
        if (file.fieldname) {
            const fieldname = file.fieldname.toLowerCase();
            if (fieldname.includes('front')) return 'front';
            if (fieldname.includes('left')) return 'left';
            if (fieldname.includes('right')) return 'right';
            if (fieldname.includes('back')) return 'back';
        }

        return 'unknown';
    }

    /**
     * Helper: Sanitize bride name for storage paths
     */
    sanitizeBrideName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}

module.exports = new BrideService();
