/**
 * Upload the locally prepared Premium Wan source and reference videos to the
 * configured private Supabase Storage bucket. Re-running is safe: object paths
 * are deterministic and uploads use upsert.
 *
 * Run from backend/: node scripts/upload-premium-wan-videos.js
 * Optional path filters upload only matching objects, for example:
 * node scripts/upload-premium-wan-videos.js Dac-pRtMZs_ premium-wan-30
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET_NAME;

if (!url || !serviceKey || !bucket) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_BUCKET_NAME are required');
}

const root = path.join(__dirname, '..');
const uploads = [
  {
    local: path.join(root, 'assets', 'premium-wan-intake', 'Daacn5tI87C.mp4'),
    remote: 'premium-wan/intake/Daacn5tI87C/source-original.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-intake', 'DX_7s2sTa16.mp4'),
    remote: 'premium-wan/intake/DX_7s2sTa16/source-original.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-intake', 'DbDYe6GyUfF.mp4'),
    remote: 'premium-wan/intake/DbDYe6GyUfF/source-original.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-intake', 'DVWKa-JkdVG.mp4'),
    remote: 'premium-wan/intake/DVWKa-JkdVG/source-original.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-intake', 'DbI6I1UJ-q6-cloud.mp4'),
    remote: 'premium-wan/intake/DbI6I1UJ-q6/source-archive.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-intake', 'Dac-pRtMZs_.mp4'),
    remote: 'premium-wan/intake/Dac-pRtMZs_/source-original.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-25', 'reference-15s.mp4'),
    remote: 'premium-wan/templates/premium-wan-25/reference-15s.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-26', 'reference-15s.mp4'),
    remote: 'premium-wan/templates/premium-wan-26/reference-15s.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-27', 'reference-15s.mp4'),
    remote: 'premium-wan/templates/premium-wan-27/reference-15s.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-28', 'reference-15s.mp4'),
    remote: 'premium-wan/templates/premium-wan-28/reference-15s.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-29', 'reference-15s.mp4'),
    remote: 'premium-wan/templates/premium-wan-29/reference-15s.mp4',
  },
  {
    local: path.join(root, 'assets', 'premium-wan-30', 'reference-15s.mp4'),
    remote: 'premium-wan/templates/premium-wan-30/reference-15s.mp4',
  },
];

const filters = process.argv.slice(2);
const selectedUploads = filters.length
  ? uploads.filter(item => filters.some(filter => item.remote.includes(filter)))
  : uploads;

if (!selectedUploads.length) {
  throw new Error(`No upload paths matched: ${filters.join(', ')}`);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  for (const item of selectedUploads) {
    if (!fs.existsSync(item.local)) throw new Error(`Missing local file: ${item.local}`);
    const body = fs.readFileSync(item.local);
    const { error } = await supabase.storage.from(bucket).upload(item.remote, body, {
      contentType: 'video/mp4',
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw new Error(`${item.remote}: ${error.message}`);

    const { data: signed, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(item.remote, 300);
    if (signError || !signed?.signedUrl) {
      throw new Error(`${item.remote}: upload succeeded but signed-link verification failed`);
    }
    const response = await fetch(signed.signedUrl, { method: 'HEAD' });
    if (!response.ok) throw new Error(`${item.remote}: verification returned HTTP ${response.status}`);

    console.log(`${bucket}/${item.remote} (${body.length} bytes) verified`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
