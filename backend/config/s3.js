const { S3Client } = require('@aws-sdk/client-s3');

// Configure AWS S3 for Supabase Storage
const s3Client = new S3Client({
    endpoint: process.env.SUPABASE_S3_ENDPOINT,
    region: process.env.SUPABASE_S3_REGION,
    credentials: {
        accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY,
        secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY
    },
    forcePathStyle: true // Required for Supabase in v3
});

module.exports = s3Client;
