/**
 * upload-scenario-refs.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot uploader for scenario reference images.
 *
 * Reads every image from backend/scenario-refs/ and uploads them to the
 * Supabase 'ladies-planet' bucket at /scenario-refs/<filename>.
 *
 * Usage:
 *   1. Save your 4 images in backend/scenario-refs/ with these filenames:
 *        outdoor-1.jpg
 *        outdoor-2.jpg
 *        outdoor-3.jpg
 *        outdoor-4.jpg
 *   2. Run:  node scripts/upload-scenario-refs.js
 *   3. Script prints the public URLs + verifies they're reachable.
 *
 * Re-run anytime to replace existing images (uses upsert).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET        = process.env.SUPABASE_BUCKET_NAME || 'ladies-planet';
const LOCAL_DIR     = path.join(__dirname, '..', 'scenario-refs');
const REMOTE_PREFIX = 'scenario-refs';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

function mimeFor(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (['jpg','jpeg'].includes(ext)) return 'image/jpeg';
    if (ext === 'png')  return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif')  return 'image/gif';
    return 'application/octet-stream';
}

async function uploadOne(filename) {
    const localPath = path.join(LOCAL_DIR, filename);
    const remotePath = `${REMOTE_PREFIX}/${filename}`;

    const buffer = fs.readFileSync(localPath);
    const contentType = mimeFor(filename);

    process.stdout.write(`📤 ${filename} (${(buffer.length / 1024).toFixed(0)} KB) → `);

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(remotePath, buffer, {
            contentType,
            upsert: true,        // overwrite if exists
        });

    if (error) {
        console.log('❌', error.message);
        return null;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
    console.log('✓ uploaded');
    return publicUrl;
}

async function verifyUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch { return false; }
}

(async () => {
    console.log(`\n🚀 Uploading scenario references → ${BUCKET}/${REMOTE_PREFIX}/\n`);

    if (!fs.existsSync(LOCAL_DIR)) {
        console.error(`❌ Local folder not found: ${LOCAL_DIR}`);
        console.error(`   Create it and add your reference images, then re-run.`);
        process.exit(1);
    }

    const files = fs.readdirSync(LOCAL_DIR)
        .filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f))
        .sort();

    if (!files.length) {
        console.error(`❌ No image files in ${LOCAL_DIR}`);
        console.error(`   Save your 4 outdoor reference images there and re-run.`);
        process.exit(1);
    }

    const urls = [];
    for (const f of files) {
        const url = await uploadOne(f);
        if (url) urls.push(url);
    }

    console.log(`\n🔍 Verifying public URLs are reachable...`);
    for (const url of urls) {
        const ok = await verifyUrl(url);
        console.log(`${ok ? '✅' : '⚠️'}  ${url}`);
    }

    console.log(`\n✨ Done — ${urls.length} reference image${urls.length === 1 ? '' : 's'} uploaded.`);
    console.log(`\nThe Outdoor scenario will now use these images automatically.`);
    console.log(`Test by clicking the 🌿 Outdoor button in the studio.\n`);
})().catch(err => {
    console.error('\n💥 Upload script crashed:', err.message);
    process.exit(1);
});
