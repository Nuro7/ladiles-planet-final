const { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

/**
 * Dresses Table Schema
 * Stores the boutique's dress catalog for the Bridal AI Wall
 */
const dresses = pgTable('dresses', {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Basic Information
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull().unique(),

    // Image URLs
    image_url: text('image_url').notNull(),
    thumbnail_url: text('thumbnail_url'),

    // Status Flags
    is_available: boolean('is_available').default(true),
    is_deleted: boolean('is_deleted').default(false),

    // Metadata (JSONB for flexible data storage)
    metadata: jsonb('metadata').default({}),

    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
});

module.exports = { dresses };
