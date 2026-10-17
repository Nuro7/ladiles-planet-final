const { supabaseAdmin } = require('../config/supabase');
const SIGNED_URL_SECONDS = 24 * 60 * 60;

class StorageService {
    assertTarget(bucket, path) {
        if (bucket !== process.env.SUPABASE_BUCKET_NAME) throw new Error('Unknown storage bucket');
        if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('..')) throw new Error('Invalid storage path');
    }

    async uploadImage(bucket, path, file, contentType) {
        try {
            this.assertTarget(bucket, path);
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(contentType)) {
                throw new Error('Invalid image type. Allowed: JPEG, PNG, GIF, WEBP');
            }

            const { data, error } = await supabaseAdmin.storage
                .from(bucket)
                .upload(path, file, {
                    contentType,
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error('❌ Supabase upload error:', error);
                throw error;
            }

            const url = await this.createSignedUrl(bucket, path);

            return {
                ...data,
                publicUrl: url
            };
        } catch (error) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }

    async uploadVideo(bucket, path, file, contentType) {
        try {
            this.assertTarget(bucket, path);
            const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
            if (!allowedTypes.includes(contentType)) {
                throw new Error('Invalid video type. Allowed: MP4, MPEG, MOV, AVI, WEBM');
            }

            const { data, error } = await supabaseAdmin.storage
                .from(bucket)
                .upload(path, file, {
                    contentType,
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error('❌ Supabase video upload error:', error);
                throw error;
            }

            const url = await this.createSignedUrl(bucket, path);

            return {
                ...data,
                publicUrl: url
            };
        } catch (error) {
            throw new Error(`Failed to upload video: ${error.message}`);
        }
    }

    async createSignedUrl(bucket, path, expiresIn = SIGNED_URL_SECONDS) {
        this.assertTarget(bucket, path);
        if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > SIGNED_URL_SECONDS) throw new Error('Invalid link lifetime');
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);
        if (error || !data?.signedUrl) throw error || new Error('Could not create a private file link');
        return data.signedUrl;
    }

    async getPublicUrl(bucket, path) {
        return this.createSignedUrl(bucket, path);
    }

    // Database rows retain the object URL; issue a fresh short-lived link when read.
    async refreshUrl(value) {
        if (typeof value !== 'string' || !value.startsWith('http')) return value;
        let url;
        try { url = new URL(value); } catch { return value; }
        if (url.origin !== new URL(process.env.SUPABASE_URL).origin) return value;
        const prefix = '/storage/v1/object/';
        if (!url.pathname.startsWith(prefix)) return value;
        const parts = url.pathname.slice(prefix.length).split('/');
        const mode = parts.shift();
        const bucket = decodeURIComponent(parts.shift() || '');
        if (!['public', 'sign'].includes(mode) || bucket !== process.env.SUPABASE_BUCKET_NAME || !parts.length) return value;
        return this.createSignedUrl(bucket, decodeURIComponent(parts.join('/')));
    }

    async deleteFile(bucket, path) {
        this.assertTarget(bucket, path);
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
        return true;
    }
}

module.exports = new StorageService();
