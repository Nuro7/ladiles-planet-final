const { pgTable, text, boolean, timestamp, uuid, time, date, integer, jsonb } = require('drizzle-orm/pg-core');

/**
 * Appointments Table Schema
 * Stores appointment bookings with date, time slots, and client details
 */
const appointments = pgTable('appointments', {
    id: uuid('id').primaryKey().defaultRandom(),
    client_name: text('client_name').notNull(),
    client_email: text('client_email').notNull(),
    client_phone: text('client_phone'),
    appointment_date: date('appointment_date').notNull(),
    time_slot_id: uuid('time_slot_id'),
    start_time: text('start_time').notNull(),   // e.g. "09:00"
    end_time: text('end_time').notNull(),         // e.g. "10:00"
    service_type: text('service_type').default('consultation'),
    notes: text('notes'),
    status: text('status').default('pending'),   // pending | confirmed | cancelled | completed
    is_deleted: boolean('is_deleted').default(false),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

/**
 * Time Slots Table Schema
 * Admin-created available time slots for a given date
 */
const timeSlots = pgTable('time_slots', {
    id: uuid('id').primaryKey().defaultRandom(),
    slot_date: date('slot_date').notNull(),
    start_time: text('start_time').notNull(),       // e.g. "09:00"
    end_time: text('end_time').notNull(),             // e.g. "10:00"
    max_bookings: integer('max_bookings').default(1),
    current_bookings: integer('current_bookings').default(0),
    is_available: boolean('is_available').default(true),
    is_deleted: boolean('is_deleted').default(false),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

module.exports = { appointments, timeSlots };
