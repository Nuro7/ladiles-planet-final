/**
 * backfill-history.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports past generations from the AI engine into our local DB so they
 * show up in the studio's History panel.
 *
 * Usage:  node scripts/backfill-history.js
 *
 * Idempotent — skips videos already in the DB (matched by video URL).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const client = require('../services/higgsfieldMCPClient');
const videoRepository = require('../repositories/videoRepositoryDrizzle');

(async () => {
    console.log('\n🔄 Backfilling past generations into history...\n');

    let cursor = undefined;
    let totalAdded = 0;
    let totalSkipped = 0;
    let totalNoVideo = 0;
    let page = 0;

    while (true) {
        page++;
        const args = { type: 'video', size: 50 };
        if (cursor != null) args.cursor = cursor;

        const res = await client._mcpCall('show_generations', args);
        const items = res?.items || [];
        if (!items.length) break;

        // Find existing video URLs already in DB so we don't duplicate
        const existing = await videoRepository.findAll({ type: 'generated' });
        const existingUrls = new Set(existing.map(v => v.video_url));

        for (const item of items) {
            const videoUrl = item.results?.rawUrl || item.results?.url || item.results?.video_url;
            if (!videoUrl) { totalNoVideo++; continue; }
            if (existingUrls.has(videoUrl)) { totalSkipped++; continue; }

            try {
                // Pull source images from the stored params if available
                const bride = item.params?.medias?.[0]?.data?.url
                           || item.params?.medias?.[0]?.value;
                const dress = item.params?.medias?.[1]?.data?.url
                           || item.params?.medias?.[1]?.value;

                await videoRepository.create({
                    type            : 'generated',
                    video_url       : videoUrl,
                    thumbnail_url   : item.results?.thumbnailUrl || null,
                    bride_image_url : bride || null,
                    dress_image_url : dress || null,
                    duration        : item.params?.duration || null,
                    aspect_ratio    : item.params?.aspect_ratio || '16:9',
                    quality         : item.params?.resolution || item.params?.quality || null,
                    metadata        : {
                        backfilled  : true,
                        engineJobId : item.id,
                        model       : item.model,
                        status      : item.status,
                        provider    : 'higgsfield',
                        generatedAt : new Date((item.createdAt || 0) * 1000).toISOString()
                    }
                });
                totalAdded++;
                console.log(`✓ ${item.model} · ${new Date(item.createdAt * 1000).toISOString().slice(0,16)} · ${videoUrl.slice(-50)}`);
            } catch (err) {
                console.log(`✗ Failed: ${err.message}`);
            }
        }

        cursor = res?.next_cursor;
        if (cursor == null) break;
    }

    console.log(`\n✨ Done — added ${totalAdded}, skipped ${totalSkipped} (already in DB), ${totalNoVideo} had no video URL.\n`);
    process.exit(0);
})().catch(err => {
    console.error('💥 Backfill crashed:', err.message);
    process.exit(1);
});
