require('dotenv').config();
const postgres = require('postgres');

async function init() {
    const sql = postgres(process.env.DATABASE_URL);

    try {
        console.log('🚀 Initializing users table...');
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL DEFAULT 'staff',
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `;
        console.log('✅ Users table initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing users table:', error);
    } finally {
        await sql.end();
    }
}

init();
