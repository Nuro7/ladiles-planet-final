/**
 * Seedance 2.0 Fast — CLI smoke test (uses the same service the HTTP route uses).
 *
 * Usage:
 *   node test-seedance.js <preset:1|2> <bride-image-path> <dress-image-path> [aspect_ratio]
 *
 * Example:
 *   node test-seedance.js 1 ./bride.jpg ./dress.jpg 16:9
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const seedanceService = require('./services/seedanceService');

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close();
                fs.unlink(dest, () => {});
                return downloadFile(res.headers.location, dest).then(resolve, reject);
            }
            res.pipe(file);
            file.on('finish', () => file.close(() => resolve(dest)));
        }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
    });
}

async function main() {
    const presetNum = process.argv[2] || '1';
    const bridePath = process.argv[3] || path.join(__dirname, 'bride.jpg');
    const dressPath = process.argv[4] || path.join(__dirname, 'dress.jpg');
    const aspectRatio = process.argv[5] || '16:9';

    const preset = seedanceService.PRESETS[presetNum];
    if (!preset) { console.error(`❌ Unknown preset "${presetNum}". Use 1 or 2.`); process.exit(1); }
    if (!fs.existsSync(bridePath)) { console.error(`❌ Bride image not found: ${bridePath}`); process.exit(1); }
    if (!fs.existsSync(dressPath)) { console.error(`❌ Dress image not found: ${dressPath}`); process.exit(1); }

    console.log('━'.repeat(60));
    console.log(`🎬 Seedance 2.0 Fast — preset #${presetNum}: ${preset.label}`);
    console.log('━'.repeat(60));
    console.log(`Bride: ${bridePath}\nDress: ${dressPath}\nAspect: ${aspectRatio} | 720p | 5s\n`);

    const result = await seedanceService.generateReferenceVideo({
        brideBuffer: fs.readFileSync(bridePath),
        brideFilename: path.basename(bridePath),
        dressBuffer: fs.readFileSync(dressPath),
        dressFilename: path.basename(dressPath),
        presetId: Number(presetNum),
        aspectRatio,
        onProgress: ({ status, elapsedSec, message }) => {
            console.log(`   [${elapsedSec.toFixed(1)}s] ${status}: ${message}`);
        }
    });

    console.log(`\n✅ Generated in ${result.totalSec.toFixed(1)}s (${(result.totalSec / 60).toFixed(2)} min)`);
    console.log(`Video URL: ${result.videoUrl}`);

    const outFile = path.join(__dirname, `seedance-preset${presetNum}-${Date.now()}.mp4`);
    console.log(`\n📥 Downloading to ${outFile}...`);
    await downloadFile(result.videoUrl, outFile);
    const sizeMB = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
    console.log(`   ✓ Saved (${sizeMB} MB)`);
    console.log('━'.repeat(60));
}

main().catch((err) => {
    console.error('\n❌ Error:', err.message || err);
    if (err.body) console.error('Body:', JSON.stringify(err.body, null, 2));
    process.exit(1);
});
