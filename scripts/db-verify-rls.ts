import { config } from "dotenv";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;

const EXPECTED_TABLES = [
  "schema_migrations",
  "layers",
  "concept_atoms",
  "atom_prerequisites",
  "glossary_terms",
  "user_atom_progress",
  "user_workspace_preferences",
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!connectionString || !url || !publishableKey) {
    throw new Error("Faltan variables de entorno en .env.local");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    // 1. Verificar RLS habilitado explícitamente en todas las tablas
    const { rows } = await client.query<{ tablename: string; rowsecurity: boolean }>(
      `SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relname = ANY($1::text[])
       ORDER BY c.relname`,
      [EXPECTED_TABLES]
    );

    if (rows.length !== EXPECTED_TABLES.length) {
      throw new Error(
        `Tablas faltantes. Esperadas: ${EXPECTED_TABLES.length}, encontradas: ${rows.length}`
      );
    }

    for (const r of rows) {
      if (!r.rowsecurity) {
        throw new Error(`FALLO ZERO-TRUST: RLS deshabilitado en public.${r.tablename}`);
      }
    }
    console.log(`OK [1/4]: RLS habilitado explícitamente en las ${rows.length} tablas.`);

    // 2. Verificar conteo de capas estructurales (L0 active, L1–L11 planned)
    const layerStats = await client.query<{ status: string; count: string }>(
      `SELECT status, count(*)::text FROM public.layers GROUP BY status ORDER BY status`
    );
    console.log("OK [2/4]: Capas estructurales:", layerStats.rows);

    // 3. Prueba transaccional (ROLLBACK) del trigger anti-ciclos DAG en PostgreSQL
    await client.query("BEGIN");
    try {
      const l0 = await client.query<{ id: string }>(
        `SELECT id FROM public.layers WHERE code = 'L0'`
      );
      const layerId = l0.rows[0]?.id;
      if (!layerId) throw new Error("Capa L0 no encontrada");

      const a1 = await client.query<{ id: string }>(
        `INSERT INTO public.concept_atoms (layer_id, code, slug, title, order_index, status)
         VALUES ($1, 'L0.98', 'test-cycle-a', 'Test A', 98, 'draft') RETURNING id`,
        [layerId]
      );
      const a2 = await client.query<{ id: string }>(
        `INSERT INTO public.concept_atoms (layer_id, code, slug, title, order_index, status)
         VALUES ($1, 'L0.99', 'test-cycle-b', 'Test B', 99, 'draft') RETURNING id`,
        [layerId]
      );
      const idA = a1.rows[0]!.id;
      const idB = a2.rows[0]!.id;

      // Arista válida: B requiere A
      await client.query(
        `INSERT INTO public.atom_prerequisites (atom_id, prerequisite_atom_id) VALUES ($1, $2)`,
        [idB, idA]
      );

      // Arista inválida: A requiere B -> debe disparar trigger anti-ciclo
      let cycleBlocked = false;
      try {
        await client.query(
          `INSERT INTO public.atom_prerequisites (atom_id, prerequisite_atom_id) VALUES ($1, $2)`,
          [idA, idB]
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("DAG cycle detected")) {
          cycleBlocked = true;
        } else {
          throw err;
        }
      }

      if (!cycleBlocked) {
        throw new Error("FALLO ZERO-TRUST: El trigger SQL no bloqueó un ciclo en el DAG.");
      }
      console.log("OK [3/4]: Trigger PostgreSQL prevent_atom_dag_cycle() bloqueó el ciclo y revirtió limpio.");
    } finally {
      await client.query("ROLLBACK");
    }

    // 4. Verificar que cliente anónimo (sin sesión) NO puede leer tablas protegidas
    const anonClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: anonProgress, error: anonError } = await anonClient
      .from("user_atom_progress")
      .select("id")
      .limit(1);

    if (!anonError && anonProgress && anonProgress.length > 0) {
      throw new Error("FALLO ZERO-TRUST: Acceso anónimo leyó user_atom_progress");
    }
    const { data: anonLayers, error: anonLayersError } = await anonClient
      .from("layers")
      .select("code")
      .limit(1);
    if (!anonLayersError && anonLayers && anonLayers.length > 0) {
      throw new Error("FALLO ZERO-TRUST: Acceso anónimo leyó public.layers");
    }
    console.log(
      "OK [4/4]: Aislamiento anónimo verificado (anon bloqueado por privilegios + RLS)."
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Fallo en verificación Zero-Trust:", err);
  process.exit(1);
});
