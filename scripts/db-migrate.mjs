// Runner de migrations simples e idempotente para o Postgres do Supabase.
// Uso: node --env-file=.env.local scripts/db-migrate.mjs
// Aplica, em ordem, os arquivos de supabase/migrations e registra em schema_migrations.
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ausente. Configure .env.local.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Set(
    (await client.query('select filename from schema_migrations')).rows.map((r) => r.filename),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= skip  ${file}`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    process.stdout.write(`+ apply ${file} ... `);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations(filename) values ($1)', [file]);
      await client.query('commit');
      console.log('ok');
      count++;
    } catch (e) {
      await client.query('rollback');
      console.error('\nERRO em', file, '\n', e.message);
      process.exit(1);
    }
  }
  console.log(`\nConcluído. ${count} migration(s) nova(s) aplicada(s).`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
