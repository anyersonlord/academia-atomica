import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida en .env.local");
  }

  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No se encontraron migraciones SQL.");
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const hasHistoryTable = await client.query<{ exists: boolean }>(
      `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`
    );

    const applied = new Set<string>();
    if (hasHistoryTable.rows[0]?.exists) {
      const res = await client.query<{ filename: string }>(
        `SELECT filename FROM public.schema_migrations`
      );
      for (const row of res.rows) {
        applied.add(row.filename);
      }
    }

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Omitida (ya aplicada): ${file}`);
        continue;
      }
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, "utf8");
      console.log(`Aplicando migración: ${file}...`);
      await client.query(sql);
      await client.query(
        `INSERT INTO public.schema_migrations (filename)
         VALUES ($1)
         ON CONFLICT (filename) DO NOTHING`,
        [file]
      );
      console.log(`OK: ${file}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error ejecutando migraciones:", err);
  process.exit(1);
});
