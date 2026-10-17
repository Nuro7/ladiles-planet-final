const { pgTable, serial, text, timestamp, integer } = require('drizzle-orm/pg-core');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
require('dotenv').config();

async function fixDatabase() {
    console.log('🔄 Starting Database Reset for Bride Tables...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🗑️ Dropping existing bride tables...');
        await client.query('DROP TABLE IF EXISTS bride_image CASCADE;');
        await client.query('DROP TABLE IF EXISTS bride CASCADE;');

        console.log('🏗️ Creating bride table with SERIAL ID...');
        await client.query(`
      CREATE TABLE bride (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

        console.log('🏗️ Creating bride_image table with SERIAL ID...');
        await client.query(`
      CREATE TABLE bride_image (
        id SERIAL PRIMARY KEY,
        bride_id INTEGER NOT NULL REFERENCES bride(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_type TEXT NOT NULL,
        angle TEXT NOT NULL DEFAULT 'unknown',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

        console.log('🚀 Creating indexes...');
        await client.query('CREATE INDEX idx_bride_status ON bride(status);');
        await client.query('CREATE INDEX idx_bride_name ON bride(name);');
        await client.query('CREATE INDEX idx_bride_image_bride_id ON bride_image(bride_id);');

        await client.query('COMMIT');
        console.log('✅ Success! Bride tables updated to use numeric IDs (1, 2, 3...)');
        console.log('You can now run "npm run dev" to start your server.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.log('❌ Error during reset:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixDatabase();
