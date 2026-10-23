// Read-only metadata audit. Never reads customer rows, tokens or credentials.
require('dotenv').config({quiet:true});
const {client} = require('../db');
(async () => {
  try {
    const tables = await client`select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('users','dresses','videos','bride','bride_image','appointments','time_slots') order by tablename`;
    const policies = await client`select tablename, roles, cmd from pg_policies where schemaname='public' and tablename in ('users','dresses','videos','bride','bride_image','appointments','time_slots') order by tablename`;
    const buckets = await client`select id, public from storage.buckets order by id`;
    console.log(JSON.stringify({tables,policies,buckets},null,2));
  } catch(error) {
    console.error('Read-only database audit unavailable:',error.code || error.name);
    process.exitCode=1;
  } finally { await client.end({timeout:2}); }
})();
