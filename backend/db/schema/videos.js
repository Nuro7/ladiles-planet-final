const { pgTable, uuid, text, timestamp, boolean, integer, jsonb } = require('drizzle-orm/pg-core');

/**
 * Videos Table Schema
 * Stores both AI-generated and boutique owner uploaded videos
 */
const videos = pgTable('videos', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Common fields
    video_url: text('video_url').notNull(),
    type: text('type').default('generated').notNull(), // 'generated' or 'uploaded'
    title: text('title'),
    description: text('description'),
    metadata: jsonb('metadata').default({}),

    // Generated video specific fields
    thumbnail_url: text('thumbnail_url'),
    bride_image_url: text('bride_image_url'),
    dress_image_url: text('dress_image_url'),
    jewellery_image_url: text('jewellery_image_url'),
    logo_url: text('logo_url'),
    jewellery_style: text('jewellery_style'),
    appearance_mode: text('appearance_mode'),
    background: text('background'),
    makeup: text('makeup'),
    show_branding: boolean('show_branding').default(false),
    duration: integer('duration'),
    aspect_ratio: text('aspect_ratio'),
    quality: text('quality'),
    status: text('status').default('completed'),

    // Timestamps
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

module.exports = { videos };
