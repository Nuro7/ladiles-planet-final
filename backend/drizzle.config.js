require('dotenv').config();

/** @type { import("drizzle-kit").Config } */
module.exports = {
    schema: './db/schema/index.js',
    out: './db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL ||
            `postgresql://postgres.${process.env.SUPABASE_PROJECT_ID}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    },
    verbose: true,
    strict: true,
};
