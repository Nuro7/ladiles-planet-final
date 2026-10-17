/**
 * Supabase Storage Bucket Setup for Bride Images
 * 
 * This script helps you create the 'brides' bucket in Supabase Storage
 * Run this once to set up the storage bucket for bride images
 */

const { supabaseAdmin } = require('../config/supabase');

async function setupBridesBucket() {
    console.log('🚀 Setting up Brides Storage Bucket...\n');

    try {
        // Check if bucket already exists
        const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

        if (listError) {
            console.error('❌ Error listing buckets:', listError);
            return;
        }

        const bridesBucketExists = buckets.some(bucket => bucket.name === 'brides');

        if (bridesBucketExists) {
            console.log('✅ Brides bucket already exists!');
            console.log('📦 Bucket: brides');
            console.log('🔓 Public: Yes');
            return;
        }

        // Create the bucket
        console.log('📦 Creating brides bucket...');
        const { data: bucket, error: createError } = await supabaseAdmin.storage.createBucket('brides', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        });

        if (createError) {
            console.error('❌ Error creating bucket:', createError);
            return;
        }

        console.log('✅ Brides bucket created successfully!');
        console.log('📦 Bucket:', bucket);
        console.log('🔓 Public: Yes');
        console.log('📏 Max file size: 10MB');
        console.log('🖼️  Allowed types: JPEG, PNG, WEBP, GIF');

        // Set up storage policies (optional - for fine-grained access control)
        console.log('\n📋 Note: You may want to set up Row Level Security (RLS) policies');
        console.log('   in your Supabase dashboard for production use.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the setup
setupBridesBucket()
    .then(() => {
        console.log('\n✨ Setup complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    });
