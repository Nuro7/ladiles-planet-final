const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./schema');
require('dotenv').config();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL in the backend environment.');
const client = postgres(connectionString, {max:10,idle_timeout:20,connect_timeout:10});
const db = drizzle(client, {schema});
module.exports = {db,client};
