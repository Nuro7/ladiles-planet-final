/**
 * Diagnostic — verify Kling O3 Standard accepts our payload structure.
 */
require('dotenv').config();
const sharp = require('sharp');

(async () => {
    const { fal } = await import('@fal-ai/client');
    fal.config({ credentials: process.env.FAL_KEY });

    const img1 = await sharp({
        create: { width: 768, height: 1024, channels: 3, background: { r: 200, g: 180, b: 160 } }
    }).jpeg({ quality: 90 }).toBuffer();
    const img2 = await sharp({
        create: { width: 768, height: 1024, channels: 3, background: { r: 180, g: 30, b: 40 } }
    }).jpeg({ quality: 90 }).toBuffer();

    console.log('Uploading 2 test JPEGs...');
    const url1 = await fal.storage.upload(new Blob([img1], { type: 'image/jpeg' }));
    const url2 = await fal.storage.upload(new Blob([img2], { type: 'image/jpeg' }));
    console.log(' URL1:', url1);
    console.log(' URL2:', url2);

    console.log('\nCalling Kling O3 Standard Reference-to-Video...');
    const t0 = Date.now();
    try {
        const result = await fal.subscribe('fal-ai/kling-video/o3/standard/reference-to-video', {
            input: {
                prompt: '@Element1 wearing dress from @Element2, walking gracefully in a wedding scene.',
                elements: [
                    { frontal_image_url: url1, reference_image_urls: [url1] },
                    { frontal_image_url: url2, reference_image_urls: [url2] }
                ],
                duration: '5',
                aspect_ratio: '16:9',
                generate_audio: true
            },
            logs: false
        });
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`\n✅ SUCCESS in ${sec}s`);
        console.log('Video URL:', result.data?.video?.url);
    } catch (err) {
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`\n❌ FAILED at ${sec}s — ${err.message} (status ${err.status})`);
        if (err.body) console.log('Body:', JSON.stringify(err.body, null, 2));
    }
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
