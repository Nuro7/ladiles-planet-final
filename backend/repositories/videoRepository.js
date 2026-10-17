const { supabase } = require('../config/supabase');

class VideoRepository {
    async findAll(filters = {}) {
        let query = supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply type filter if provided
        if (filters.type) {
            query = query.eq('type', filters.type);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    async findById(id) {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }
        return data;
    }

    async create(videoData) {
        const insertData = {
            id: videoData.id,
            video_url: videoData.video_url || videoData.videoUrl,
            type: videoData.type || 'generated',
            title: videoData.title,
            description: videoData.description,
            metadata: videoData.metadata
        };

        // Add fields specific to generated videos
        if (videoData.type === 'generated' || !videoData.type) {
            insertData.thumbnail_url = videoData.thumbnailUrl;
            insertData.bride_image_url = videoData.brideImageUrl;
            insertData.dress_image_url = videoData.dressImageUrl;
            insertData.jewellery_image_url = videoData.jewelleryImageUrl;
            insertData.logo_url = videoData.logoUrl;
            insertData.jewellery_style = videoData.jewelleryStyle;
            insertData.appearance_mode = videoData.appearanceMode;
            insertData.background = videoData.background;
            insertData.makeup = videoData.makeup;
            insertData.show_branding = videoData.showBranding;
            insertData.duration = videoData.duration;
            insertData.aspect_ratio = videoData.aspectRatio;
            insertData.quality = videoData.quality;
            insertData.status = videoData.status;
        }

        const { data, error } = await supabase
            .from('videos')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id, videoData) {
        const { data, error } = await supabase
            .from('videos')
            .update(videoData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async delete(id) {
        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}

module.exports = new VideoRepository();
