/**
 * Tiny fal.ai key verification — no video generation, no cost.
 * Just uploads a 1x1 PNG to confirm credentials work.
 */
require('dotenv').config();

(async () => {
    if (!process.env.FAL_KEY) { console.error('❌ FAL_KEY missing in .env'); process.exit(1); }

    const { fal } = await import('@fal-ai/client');
    fal.config({ credentials: process.env.FAL_KEY });

    // 1x1 transparent PNG
    const tinyPng = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6300010000000500010d0a2db40000000049454e44ae426082',
        'hex'
    );
    const blob = new Blob([tinyPng], { type: 'image/png' });

    try {
        console.log('📤 Uploading tiny test image to fal.storage...');
        const url = await fal.storage.upload(blob);
        console.log('✅ Auth WORKS. Upload URL:', url);
        console.log('🎉 Key is valid — you can now run the UI test.');
    } catch (err) {
        console.error('❌ Auth FAILED:', err.message || err);
        if (err.body) console.error('Body:', JSON.stringify(err.body, null, 2));
        process.exit(1);
    }
})();
