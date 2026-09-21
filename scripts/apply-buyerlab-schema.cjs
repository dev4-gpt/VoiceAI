#!/usr/bin/env node
// scripts/apply-buyerlab-schema.cjs
// Applies apps/orchestrator/src/db/sql/buyerlab.sql in one transaction.
//   node scripts/apply-buyerlab-schema.cjs --dry-run   list statements and the target host only
//   node scripts/apply-buyerlab-schema.cjs             apply
// Refuses anything that is not additive. drizzle-kit push needs a TTY, so this exists instead.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { Pool, neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = require('ws');

async function main() {
  const dry = process.argv.includes('--dry-run');
  const file = path.resolve(__dirname, '../apps/orchestrator/src/db/sql/buyerlab.sql');
  const statements = fs
    .readFileSync(file, 'utf8')
    .split(/;\s*\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);

  const banned = statements.filter((s) => /\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bUPDATE\s+\w+\s+SET\b/i.test(s));
  if (banned.length) {
    console.error('Refusing to run: a non-additive statement was found.');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set (checked .env.local and .env).');
    process.exit(2);
  }

  let host;
  try {
    host = new URL(url).host;
  } catch (err) {
    console.error('DATABASE_URL is malformed.');
    process.exit(2);
  }

  console.log(`${statements.length} statements -> ${host}${dry ? ' (dry run, nothing applied)' : ''}`);
  if (dry) return;

  const pool = new Pool({ connectionString: url });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    for (const s of statements) await client.query(s);
    await client.query('COMMIT');
    console.log('Applied.');
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Rolled back:', err.code || err.name);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
main().catch((e) => {
  console.error('Failed:', e.code || e.name);
  process.exit(1);
});
