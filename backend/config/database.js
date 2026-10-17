const { supabase, supabaseAdmin } = require('./supabase');
const s3Client = require('./s3');

module.exports = {
    supabase,
    supabaseAdmin,
    s3Client
};
