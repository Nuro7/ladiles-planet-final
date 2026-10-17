const { db } = require('../db');
const { videos } = require('../db/schema');
const { eq, and, desc, asc, sql } = require('drizzle-orm');

/**
 * Video Repository using Drizzle ORM
 * Handles all database operations for the videos table
 */
class VideoRepositoryDrizzle {
    /**
     * Find all videos with optional filters
     */
    async findAll(filters = {}) {
        try {
            let query = db.select().from(videos);
            const conditions = [];

            // Apply type filter if provided
            if (filters.type) {
                conditions.push(eq(videos.type, filters.type));
            }

            // Apply all conditions
            if (conditions.length > 0) {
                query = query.where(and(...conditions));
            }

            // Always sort by created_at desc by default
            const sortBy = filters.sortBy || 'created_at';
            const sortOrder = filters.sortOrder || 'desc';

            const sortColumn = videos[sortBy] || videos.created_at;
            query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));

            const results = await query;
            return results;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw new Error(`Failed to fetch videos: ${error.message}`);
        }
    }

    /**
     * Find video by ID
     */
    async findById(id) {
        try {
            const result = await db
                .select()
                .from(videos)
                .where(eq(videos.id, id))
                .limit(1);

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error in findById:', error);
            throw new Error(`Failed to fetch video: ${error.message}`);
        }
    }

    /**
     * Create new video record
     */
    async create(videoData) {
        try {
            const insertData = {
                id: videoData.id,
                video_url: videoData.video_url || videoData.videoUrl,
                type: videoData.type || 'generated',
                title: videoData.title,
                description: videoData.description,
                metadata: videoData.metadata || {},
            };

            // Add fields specific to generated videos
            if (insertData.type === 'generated') {
                insertData.thumbnail_url = videoData.thumbnail_url || videoData.thumbnailUrl;
                insertData.bride_image_url = videoData.bride_image_url || videoData.brideImageUrl;
                insertData.dress_image_url = videoData.dress_image_url || videoData.dressImageUrl;
                insertData.jewellery_image_url = videoData.jewellery_image_url || videoData.jewelleryImageUrl;
                insertData.logo_url = videoData.logo_url || videoData.logoUrl;
                insertData.jewellery_style = videoData.jewellery_style || videoData.jewelleryStyle;
                insertData.appearance_mode = videoData.appearance_mode || videoData.appearanceMode;
                insertData.background = videoData.background;
                insertData.makeup = videoData.makeup;
                insertData.show_branding = videoData.show_branding ?? videoData.showBranding ?? false;
                insertData.duration = videoData.duration;
                insertData.aspect_ratio = videoData.aspect_ratio || videoData.aspectRatio;
                insertData.quality = videoData.quality;
                insertData.status = videoData.status || 'completed';
            }

            const result = await db
                .insert(videos)
                .values(insertData)
                .returning();

            return result[0];
        } catch (error) {
            console.error('Error in create:', error);
            throw new Error(`Failed to create video: ${error.message}`);
        }
    }

    /**
     * Update video record
     */
    async update(id, updateData) {
        try {
            const dataToUpdate = { ...updateData };

            // Map camelCase to snake_case if necessary
            if (updateData.videoUrl) dataToUpdate.video_url = updateData.videoUrl;
            if (updateData.thumbnailUrl) dataToUpdate.thumbnail_url = updateData.thumbnailUrl;

            dataToUpdate.updated_at = new Date();

            const result = await db
                .update(videos)
                .set(dataToUpdate)
                .where(eq(videos.id, id))
                .returning();

            if (result.length === 0) {
                throw new Error('Video not found');
            }

            return result[0];
        } catch (error) {
            console.error('Error in update:', error);
            throw new Error(`Failed to update video: ${error.message}`);
        }
    }

    /**
     * Delete video record
     */
    async delete(id) {
        try {
            const result = await db
                .delete(videos)
                .where(eq(videos.id, id))
                .returning();

            if (result.length === 0) {
                throw new Error('Video not found');
            }

            return result[0];
        } catch (error) {
            console.error('Error in delete:', error);
            throw new Error(`Failed to delete video: ${error.message}`);
        }
    }

    async findByUrl(url) {
        try {
            const rows = await db.select().from(videos).where(eq(videos.video_url, url)).limit(1);
            return rows[0] || null;
        } catch (error) {
            return null;
        }
    }

    // Dedup by the Higgsfield generation ID stored in metadata.jobId.
    // Higgsfield returns freshly-signed URLs each call, so URL-based dedup fails —
    // the generation ID is the only stable identifier.
    async findByJobId(jobId) {
        try {
            if (!jobId) return null;
            const rows = await db.select().from(videos)
                .where(sql`${videos.metadata}->>'jobId' = ${String(jobId)}`)
                .limit(1);
            return rows[0] || null;
        } catch (error) {
            return null;
        }
    }

    // Dedup by URL path (everything before the '?'). The signed query string
    // changes on every Higgsfield fetch, but the path (e.g. /generations/abc.jpg)
    // is stable — so this catches duplicates even when the token differs.
    async findByUrlPrefix(prefix) {
        try {
            if (!prefix) return null;
            // Escape LIKE wildcards in the prefix, then match prefix%
            const escaped = prefix.replace(/[%_\\]/g, c => '\\' + c);
            const rows = await db.select().from(videos)
                .where(sql`${videos.video_url} LIKE ${escaped + '%'}`)
                .limit(1);
            return rows[0] || null;
        } catch (error) {
            return null;
        }
    }

    async updateUrl(id, videoUrl, thumbnailUrl) {
        try {
            await db.update(videos)
                .set({ video_url: videoUrl, thumbnail_url: thumbnailUrl || videoUrl })
                .where(eq(videos.id, id));
            return true;
        } catch (error) {
            console.error('Error in updateUrl:', error);
            return false;
        }
    }
}

module.exports = new VideoRepositoryDrizzle();
