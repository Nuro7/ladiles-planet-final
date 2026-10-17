const { pgTable, serial, text, timestamp, integer } = require('drizzle-orm/pg-core');

/**
 * Bride Table Schema
 * Stores bride profiles for the AI Wall system
 */
const bride = pgTable('bride', {
    // Primary Key - Auto-incrementing integer
    id: serial('id').primaryKey(),

    // Basic Information
    name: text('name').notNull(),

    // Status: draft | active | archived
    status: text('status').default('draft').notNull(),

    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Bride Image Table Schema
 * Stores multiple images for each bride with different angles and types
 */
const brideImage = pgTable('bride_image', {
    // Primary Key - Auto-incrementing integer
    id: serial('id').primaryKey(),

    // Foreign Key to Bride
    bride_id: integer('bride_id')
        .notNull()
        .references(() => bride.id, { onDelete: 'cascade' }),

    // Image Information
    image_url: text('image_url').notNull(),

    // Image Type: identity | worn_dress
    image_type: text('image_type').notNull(),

    // Angle: front | left | right | back | unknown
    angle: text('angle').default('unknown').notNull(),

    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

module.exports = { bride, brideImage };
