const { pgTable, text, timestamp, boolean, uuid } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
    id: uuid('id').primaryKey(), // Match Supabase Auth ID
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    role: text('role').default('staff').notNull(),
    is_active: boolean('is_active').default(true).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

module.exports = { users };
