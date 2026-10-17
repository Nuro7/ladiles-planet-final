const { db } = require('../db');
const { bride, brideImage } = require('../db/schema');
const { eq, and, desc, ilike } = require('drizzle-orm');

/**
 * Bride Repository - Database operations for bride management
 */
class BrideRepository {
    /**
     * Create a new bride profile
     */
    async createBride(brideData) {
        const [newBride] = await db
            .insert(bride)
            .values({
                name: brideData.name,
                status: brideData.status || 'draft',
            })
            .returning();

        return newBride;
    }

    /**
     * Get all brides with optional filters
     */
    async getAllBrides(filters = {}) {
        let query = db.select().from(bride);

        // Filter by status
        if (filters.status) {
            query = query.where(eq(bride.status, filters.status));
        }

        // Order by created date (newest first)
        query = query.orderBy(desc(bride.created_at));

        return await query;
    }

    /**
     * Get bride by ID
     */
    async getBrideById(brideId) {
        const [result] = await db
            .select()
            .from(bride)
            .where(eq(bride.id, brideId));

        return result;
    }

    /**
     * Get bride by name (case-insensitive)
     */
    async getBrideByName(name) {
        const [result] = await db
            .select()
            .from(bride)
            .where(ilike(bride.name, name));

        return result;
    }

    /**
     * Update bride profile
     */
    async updateBride(brideId, updateData) {
        const [updated] = await db
            .update(bride)
            .set(updateData)
            .where(eq(bride.id, brideId))
            .returning();

        return updated;
    }

    /**
     * Update bride status
     */
    async updateBrideStatus(brideId, status) {
        const [updated] = await db
            .update(bride)
            .set({ status })
            .where(eq(bride.id, brideId))
            .returning();

        return updated;
    }

    /**
     * Delete bride (cascade deletes images)
     */
    async deleteBride(brideId) {
        await db.delete(bride).where(eq(bride.id, brideId));
        return true;
    }

    /**
     * Create bride image record
     */
    async createBrideImage(imageData) {
        const [newImage] = await db
            .insert(brideImage)
            .values({
                bride_id: imageData.brideId,
                image_url: imageData.imageUrl,
                image_type: imageData.imageType,
                angle: imageData.angle,
            })
            .returning();

        return newImage;
    }

    /**
     * Get all images for a bride
     */
    async getBrideImages(brideId, filters = {}) {
        let query = db
            .select()
            .from(brideImage)
            .where(eq(brideImage.bride_id, brideId));

        // Filter by image type
        if (filters.imageType) {
            query = query.where(
                and(
                    eq(brideImage.bride_id, brideId),
                    eq(brideImage.image_type, filters.imageType)
                )
            );
        }

        // Filter by angle
        if (filters.angle) {
            query = query.where(
                and(
                    eq(brideImage.bride_id, brideId),
                    eq(brideImage.angle, filters.angle)
                )
            );
        }

        return await query;
    }

    /**
     * Get specific bride image by type and angle
     */
    async getBrideImageByTypeAndAngle(brideId, imageType, angle) {
        const [result] = await db
            .select()
            .from(brideImage)
            .where(
                and(
                    eq(brideImage.bride_id, brideId),
                    eq(brideImage.image_type, imageType),
                    eq(brideImage.angle, angle)
                )
            );

        return result;
    }

    /**
     * Get bride with all images
     */
    async getBrideWithImages(brideId) {
        const brideData = await this.getBrideById(brideId);
        if (!brideData) return null;

        const images = await this.getBrideImages(brideId);

        return {
            ...brideData,
            images,
        };
    }

    /**
     * Delete specific bride image
     */
    async deleteBrideImage(imageId) {
        await db.delete(brideImage).where(eq(brideImage.id, imageId));
        return true;
    }

    /**
     * Delete all images for a bride by type
     */
    async deleteBrideImagesByType(brideId, imageType) {
        await db
            .delete(brideImage)
            .where(
                and(
                    eq(brideImage.bride_id, brideId),
                    eq(brideImage.image_type, imageType)
                )
            );
        return true;
    }

    /**
     * Check if bride name exists
     */
    async brideNameExists(name, excludeId = null) {
        let query = db
            .select()
            .from(bride)
            .where(ilike(bride.name, name));

        const results = await query;

        if (excludeId) {
            return results.some(b => b.id !== excludeId);
        }

        return results.length > 0;
    }

    /**
     * Search brides by name
     */
    async searchBrides(searchTerm) {
        return await db
            .select()
            .from(bride)
            .where(ilike(bride.name, `%${searchTerm}%`))
            .orderBy(desc(bride.created_at));
    }
}

module.exports = new BrideRepository();
