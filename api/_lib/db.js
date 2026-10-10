// Database access. Uses Neon serverless Postgres over HTTP (works on Vercel without connection pools).
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

let client;
let ready;

function url() {
  const u = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!u) throw Object.assign(new Error('DATABASE_URL is not set'), { status: 503 });
  return u;
}
async function query(text, params = []) {
  if (!client) client = neon(url());
  return client.query(text, params);
}
// Creates the tables on first use, so a fresh database needs no manual step.
async function ensureSchema(run = query) {
  if (!ready) {
    ready = (async () => {
      const ddl = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
      for (const stmt of ddl.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await run(stmt);
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}
module.exports = { query, ensureSchema };
