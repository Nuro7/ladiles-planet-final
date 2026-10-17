require('dotenv').config();
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before running database commands.');
module.exports = {schema:'./db/schema/index.js',out:'./db/migrations',dialect:'postgresql',dbCredentials:{url:process.env.DATABASE_URL},verbose:true,strict:true};
