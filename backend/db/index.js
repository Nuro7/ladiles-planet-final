const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./schema');
require('dotenv').config();

/**
 * Database Connection using Drizzle ORM
 * Connects to Supabase PostgreSQL database
 */

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL ||
    `postgresql://postgres.${process.env.SUPABASE_PROJECT_ID}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

// Initialize postgres client
const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});

// Initialize Drizzle ORM with schema
const db = drizzle(client, { schema });

console.log('Drizzle ORM initialized; database connectivity is checked on query.');

module.exports = { db, client };
