const storageService = require('./storageService');
const dressRepository = require('../repositories/dressRepository'); // Using Drizzle ORM
const { randomUUID } = require('crypto');
const sharp = require('sharp');
const { dressAvailability } = require('../utils/dressAvailability');
const ANGLES = ['front', 'detail', 'side', 'back', 'dupatta', 'blouse', 'full', 'other'];

/**
 * Dress Service - Business logic for dress management
 */
class DressService {
    async saveRecentDress(key, metadata) {
        const entry = await require('./dressFlowSyncService').get(key);
        if (!entry || entry.kind !== 'recent') throw new Error('Recent dress not found.');
        if (!metadata.name?.trim() || !metadata.category?.trim()) throw new Error('Dress name and category are required.');
        const id = randomUUID();
        const images = entry.views.map((v,order)=>({...v,id:v.id || randomUUID(),order}));
        const dress = await dressRepository.create({id,name:metadata.name.trim(),category:metadata.category.trim(),sku:this.generateSKU(metadata.category,metadata.name),imageUrl:images[0].url,thumbnailUrl:images[0].url,isAvailable:true,metadata:{images,coverId:images[0].id}});
        return this.refreshDress(dress);
    }
    /**
     * Upload and create new dress
     */
    async uploadDress(file, metadata) {
        try {
            const files = Array.isArray(file) ? file : [file];
            if (!files.length || files.length > 8) throw new Error('Choose between 1 and 8 dress photos.');
            await Promise.all(files.map(photo => sharp(photo.buffer, { limitInputPixels: 40000000 }).metadata()));
            file = files[0];
            const dressId = randomUUID();

            // Validate metadata
            if (!metadata.name || !metadata.category) {
                throw new Error('Dress name and category are required');
            }

            // Generate SKU if not provided
            const sku = metadata.sku || this.generateSKU(metadata.category, metadata.name);

            // Check if SKU already exists
            const existingDress = await dressRepository.findBySku(sku);
            if (existingDress) {
                throw new Error(`Dress with SKU "${sku}" already exists`);
            }

            console.log(`📸 Uploading dress image: ${metadata.name}`);

            // Upload image to storage
            const images = await this.uploadViews(dressId, files, metadata.views);
            const cover = images[Math.max(0, Math.min(images.length - 1, Number(metadata.coverIndex) || 0))];
            const uploadResult = { publicUrl: cover.url };

            console.log('✅ Dress image uploaded to private storage');

            // Create dress record
            const dressData = {
                id: dressId,
                name: metadata.name,
                description: metadata.description || '',
                category: metadata.category,
                sku: sku,
                imageUrl: uploadResult.publicUrl,
                thumbnailUrl: uploadResult.publicUrl, // Can be optimized later
                isAvailable: dressAvailability(metadata.isAvailable),
                metadata: {
                    uploadedBy: metadata.uploadedBy || 'system',
                    originalFilename: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    ...metadata.additionalData,
                    images, coverId: cover.id
                }
            };

            const dress = await dressRepository.create(dressData);

            console.log(`✅ Dress created successfully: ${dress.id}`);

            return this.refreshDress(dress);
        } catch (error) {
            console.error('❌ Failed to upload dress:', error);
            throw new Error(`Failed to upload dress: ${error.message}`);
        }
    }

    async uploadViews(dressId, files, views = []) {
        return Promise.all(files.map(async (file, index) => {
            const id = randomUUID();
            const result = await storageService.uploadImage(process.env.SUPABASE_BUCKET_NAME,
                `dresses/${dressId}/${id}.${this.getFileExtension(file.mimetype)}`, file.buffer, file.mimetype);
            const angle = typeof views[index] === 'string' ? views[index] : views[index]?.angle;
            return { id, url: result.publicUrl, angle: ANGLES.includes(angle) ? angle : ANGLES[index] || 'other', order: index };
        }));
    }

    async refreshDress(dress) {
        if (!dress) return dress;
        const images = await Promise.all((dress.images || []).map(async image => ({
            ...image, url: await storageService.refreshUrl(image.url)
        })));
        return {
            ...dress,
            flowSync: await require('./dressFlowSyncService').enqueue(dress.images || [{url:dress.imageUrl,angle:'front'}], dress.name),
            images,
            imageUrl: await storageService.refreshUrl(dress.imageUrl),
            thumbnailUrl: await storageService.refreshUrl(dress.thumbnailUrl),
        };
    }

    async addImages(id, files, views = []) {
        const dress = await this.getDressById(id);
        if (!files.length || dress.images.length + files.length > 8) throw new Error('A dress can contain up to 8 photos.');
        await Promise.all(files.map(file => sharp(file.buffer, { limitInputPixels: 40000000 }).metadata()));
        const images = [...dress.images, ...await this.uploadViews(id, files, views)].map((image, order) => ({ ...image, order }));
        return this.refreshDress(await dressRepository.update(id, { metadata: { ...dress.metadata, images } }));
    }

    async reorderImages(id, views, coverId) {
        const dress = await this.getDressById(id);
        if (!Array.isArray(views) || views.length !== dress.images.length || new Set(views.map(view => view.id)).size !== views.length) {
            throw new Error('Include every saved photo exactly once.');
        }
        const images = views.map((view, order) => {
            const saved = dress.images.find(image => image.id === view.id);
            if (!saved || !ANGLES.includes(view.angle)) throw new Error('Choose a valid photo and angle.');
            return { ...saved, angle: view.angle, order };
        });
        const cover = images.find(image => image.id === coverId) || images[0];
        return this.refreshDress(await dressRepository.update(id, { imageUrl: cover.url, thumbnailUrl: cover.url, metadata: { ...dress.metadata, images, coverId: cover.id } }));
    }

    /**
     * Get all dresses with filters
     */
    async getAllDresses(filters = {}) {
        try {
            return await Promise.all((await dressRepository.findAll(filters)).map(dress => this.refreshDress(dress)));
        } catch (error) {
            throw new Error(`Failed to fetch dresses: ${error.message}`);
        }
    }

    /**
     * Get dress by ID
     */
    async getDressById(id) {
        try {
            const dress = await dressRepository.findById(id);
            if (!dress) {
                throw new Error('Dress not found');
            }
            return this.refreshDress(dress);
        } catch (error) {
            throw new Error(`Failed to fetch dress: ${error.message}`);
        }
    }

    /**
     * Update dress metadata
     */
    async updateDress(id, updateData) {
        try {
            // Verify dress exists
            const existingDress = await dressRepository.findById(id);
            if (!existingDress) {
                throw new Error('Dress not found');
            }

            // If SKU is being updated, check for duplicates
            if (updateData.sku && updateData.sku !== existingDress.sku) {
                const duplicateSku = await dressRepository.findBySku(updateData.sku);
                if (duplicateSku && duplicateSku.id !== id) {
                    throw new Error(`Dress with SKU "${updateData.sku}" already exists`);
                }
            }

            if (updateData.metadata) updateData.metadata = { ...existingDress.metadata, ...updateData.metadata, images: existingDress.images };
            return await dressRepository.update(id, updateData);
        } catch (error) {
            throw new Error(`Failed to update dress: ${error.message}`);
        }
    }

    /**
     * Update dress image
     */
    async updateDressImage(id, file) {
        try {
            const dress = await dressRepository.findById(id);
            if (!dress) {
                throw new Error('Dress not found');
            }

            console.log(`📸 Updating dress image: ${dress.name}`);

            // Upload new image
            const imagePath = `dresses/${id}/${Date.now()}-updated.${this.getFileExtension(file.mimetype)}`;
            const uploadResult = await storageService.uploadImage(
                process.env.SUPABASE_BUCKET_NAME,
                imagePath,
                file.buffer,
                file.mimetype
            );

            console.log('✅ New dress image uploaded to private storage');

            // Update dress record
            return this.refreshDress(await dressRepository.update(id, {
                imageUrl: uploadResult.publicUrl,
                thumbnailUrl: uploadResult.publicUrl,
                metadata: { ...dress.metadata, images: [{ id: randomUUID(), url: uploadResult.publicUrl, angle: 'front', order: 0 }, ...dress.images.slice(1)] }
            }));
        } catch (error) {
            throw new Error(`Failed to update dress image: ${error.message}`);
        }
    }

    /**
     * Soft delete dress
     */
    async softDeleteDress(id) {
        try {
            const dress = await dressRepository.findById(id);
            if (!dress) {
                throw new Error('Dress not found');
            }

            return await dressRepository.softDelete(id);
        } catch (error) {
            throw new Error(`Failed to delete dress: ${error.message}`);
        }
    }

    /**
     * Restore deleted dress
     */
    async restoreDress(id) {
        try {
            const dress = await dressRepository.findById(id);
            if (!dress) {
                throw new Error('Dress not found');
            }

            return await dressRepository.restore(id);
        } catch (error) {
            throw new Error(`Failed to restore dress: ${error.message}`);
        }
    }

    /**
     * Delete dress permanently
     */
    async deleteDress(id) {
        try {
            const dress = await dressRepository.findById(id);
            if (!dress) {
                throw new Error('Dress not found');
            }

            // Note: This doesn't delete the image from storage
            // You may want to add that functionality
            return await dressRepository.delete(id);
        } catch (error) {
            throw new Error(`Failed to delete dress: ${error.message}`);
        }
    }

    /**
     * Get dress statistics
     */
    async getDressStats() {
        try {
            return await dressRepository.getStats();
        } catch (error) {
            throw new Error(`Failed to fetch dress statistics: ${error.message}`);
        }
    }

    /**
     * Generate SKU from category and name
     */
    generateSKU(category, name) {
        const categoryCode = category.substring(0, 3).toUpperCase();
        const nameCode = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        return `${categoryCode}-${nameCode}-${timestamp}`;
    }

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase();
    }

    /**
     * Get file extension from mimetype
     */
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

module.exports = new DressService();
