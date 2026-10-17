const { db } = require('../db');
const { dresses } = require('../db/schema');
const { eq, and, or, desc, asc, like, sql } = require('drizzle-orm');

/**
 * Dress Repository using Drizzle ORM
 * Handles all database operations for the dresses table
 */
class DressRepository {
    /**
     * Helper to map snake_case to camelCase for frontend compatibility
     */
    _mapDress(dress) {
        if (!dress) return null;
        return {
            ...dress,
            imageUrl: dress.image_url,
            images: Array.isArray(dress.metadata?.images) && dress.metadata.images.length
                ? dress.metadata.images
                : [{ id: 'cover', url: dress.image_url, angle: 'front', order: 0 }],
            thumbnailUrl: dress.thumbnail_url,
            isAvailable: dress.is_available,
            isDeleted: dress.is_deleted,
            createdAt: dress.created_at,
            updatedAt: dress.updated_at,
            deletedAt: dress.deleted_at
        };
    }

    /**
     * Find all dresses with optional filters
     */
    async findAll(filters = {}) {
        try {
            let query = db.select().from(dresses);
            const conditions = [];

            // Apply filters
            if (filters.category) {
                conditions.push(eq(dresses.category, filters.category));
            }

            if (filters.availability !== undefined) {
                conditions.push(eq(dresses.is_available, filters.availability));
            }

            // Search filter
            if (filters.search) {
                const searchTerm = `%${filters.search}%`;
                conditions.push(
                    or(
                        like(dresses.name, searchTerm),
                        like(dresses.description, searchTerm),
                        like(dresses.sku, searchTerm)
                    )
                );
            }

            if (filters.isDeleted !== undefined) {
                conditions.push(eq(dresses.is_deleted, filters.isDeleted));
            } else {
                // By default, only show non-deleted dresses
                conditions.push(eq(dresses.is_deleted, false));
            }

            if (conditions.length > 0) {
                query = query.where(and(...conditions));
            }

            const sortBy = filters.sortBy || 'created_at';
            const sortOrder = filters.sortOrder || 'desc';
            const sortColumn = dresses[sortBy] || dresses.created_at;
            query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));

            const results = await query;
            return results.map(dress => this._mapDress(dress));
        } catch (error) {
            console.error('[Gallery] Database read failed:', error.cause?.code || error.code || 'unknown');
            throw new Error('The wardrobe database is unavailable. The owner needs to reconnect the database; your saved dresses have not been deleted.');
        }
    }

    /**
     * Find dress by ID
     */
    async findById(id) {
        try {
            const result = await db
                .select()
                .from(dresses)
                .where(eq(dresses.id, id))
                .limit(1);

            return result.length > 0 ? this._mapDress(result[0]) : null;
        } catch (error) {
            console.error('Error in findById:', error);
            throw new Error(`Failed to fetch dress: ${error.message}`);
        }
    }

    /**
     * Find dress by SKU
     */
    async findBySku(sku) {
        try {
            const result = await db
                .select()
                .from(dresses)
                .where(eq(dresses.sku, sku))
                .limit(1);

            return result.length > 0 ? this._mapDress(result[0]) : null;
        } catch (error) {
            console.error('Error in findBySku:', error);
            throw new Error(`Failed to fetch dress by SKU: ${error.message}`);
        }
    }

    /**
     * Create new dress
     */
    async create(dressData) {
        try {
            const result = await db
                .insert(dresses)
                .values({
                    id: dressData.id,
                    name: dressData.name,
                    description: dressData.description,
                    category: dressData.category,
                    sku: dressData.sku,
                    image_url: dressData.image_url || dressData.imageUrl,
                    thumbnail_url: dressData.thumbnail_url || dressData.thumbnailUrl,
                    is_available: dressData.is_available ?? dressData.isAvailable ?? true,
                    is_deleted: dressData.is_deleted ?? dressData.isDeleted ?? false,
                    metadata: dressData.metadata || {},
                })
                .returning();

            return this._mapDress(result[0]);
        } catch (error) {
            console.error('Error in create:', error);
            throw new Error(`Failed to create dress: ${error.message}`);
        }
    }

    /**
     * Update dress
     */
    async update(id, updateData) {
        try {
            const dataToUpdate = {};

            if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
            if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
            if (updateData.category !== undefined) dataToUpdate.category = updateData.category;
            if (updateData.sku !== undefined) dataToUpdate.sku = updateData.sku;
            if (updateData.image_url !== undefined || updateData.imageUrl !== undefined) {
                dataToUpdate.image_url = updateData.image_url || updateData.imageUrl;
            }
            if (updateData.thumbnail_url !== undefined || updateData.thumbnailUrl !== undefined) {
                dataToUpdate.thumbnail_url = updateData.thumbnail_url || updateData.thumbnailUrl;
            }
            if (updateData.is_available !== undefined || updateData.isAvailable !== undefined) {
                dataToUpdate.is_available = updateData.is_available ?? updateData.isAvailable;
            }
            if (updateData.is_deleted !== undefined || updateData.isDeleted !== undefined) {
                dataToUpdate.is_deleted = updateData.is_deleted ?? updateData.isDeleted;
            }
            if (updateData.metadata !== undefined) dataToUpdate.metadata = updateData.metadata;
            if (updateData.deleted_at !== undefined || updateData.deletedAt !== undefined) {
                dataToUpdate.deleted_at = updateData.deleted_at || updateData.deletedAt;
            }

            dataToUpdate.updated_at = new Date();

            const result = await db
                .update(dresses)
                .set(dataToUpdate)
                .where(eq(dresses.id, id))
                .returning();

            if (result.length === 0) {
                throw new Error('Dress not found');
            }

            return this._mapDress(result[0]);
        } catch (error) {
            console.error('Error in update:', error);
            throw new Error(`Failed to update dress: ${error.message}`);
        }
    }

    /**
     * Soft delete dress
     */
    async softDelete(id) {
        return this.update(id, { is_deleted: true, deleted_at: new Date() });
    }

    /**
     * Restore deleted dress
     */
    async restore(id) {
        return this.update(id, { is_deleted: false, deleted_at: null });
    }

    /**
     * Delete dress permanently
     */
    async delete(id) {
        try {
            const result = await db
                .delete(dresses)
                .where(eq(dresses.id, id))
                .returning();

            if (result.length === 0) {
                throw new Error('Dress not found');
            }

            return this._mapDress(result[0]);
        } catch (error) {
            console.error('Error in delete:', error);
            throw new Error(`Failed to delete dress: ${error.message}`);
        }
    }

    /**
     * Get dress statistics
     */
    async getStats() {
        try {
            const [stats] = await db
                .select({
                    total: sql`count(*) filter (where ${dresses.is_deleted} = false)::int`,
                    available: sql`count(*) filter (where ${dresses.is_available} = true and ${dresses.is_deleted} = false)::int`,
                    unavailable: sql`count(*) filter (where ${dresses.is_available} = false and ${dresses.is_deleted} = false)::int`,
                })
                .from(dresses)
                .where(eq(dresses.is_deleted, false));

            const categoryStats = await db
                .select({
                    category: dresses.category,
                    count: sql`count(*)::int`,
                })
                .from(dresses)
                .where(eq(dresses.is_deleted, false))
                .groupBy(dresses.category);

            return {
                ...stats,
                byCategory: categoryStats.reduce((acc, item) => {
                    acc[item.category] = item.count;
                    return acc;
                }, {}),
            };
        } catch (error) {
            console.error('Error in getStats:', error);
            throw new Error(`Failed to fetch dress statistics: ${error.message}`);
        }
    }
}

module.exports = new DressRepository();
