import { config } from "dotenv";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;

const EXPECTED_TABLES = [
  "schema_migrations",
  "layers",
  "concept_nodes",
  "node_compositions",
  "node_relations",
  "node_revisions",
  "glossary_terms",
  "user_node_progress",
  "user_node_notes",
  "user_workspace_preferences",
];

const RETIRED_TABLES = ["concept_atoms", "atom_prerequisites", "user_atom_progress"];

async function expectError(
  fn: () => Promise<unknown>,
  expectedSubstring: string,
  label: string
) {
  let caught = false;
  try {
    await fn();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes(expectedSubstring)) {
      caught = true;
    } else {
      throw new Error(
        `[${label}] Falló con error inesperado: "${msg}" (esperaba "${expectedSubstring}")`
      );
    }
  }
  if (!caught) {
    throw new Error(`FALLO ZERO-TRUST [${label}]: La operación debía rechazarse y fue aceptada.`);
  }
}

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
    // 1. Verificar limpieza de artefactos obsoletos de 0001 + RLS activo en las 10 tablas vigentes
    const retiredCheck = await client.query<{ relname: string }>(
      `SELECT c.relname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
      [RETIRED_TABLES]
    );
    if (retiredCheck.rows.length > 0) {
      throw new Error(
        `Tablas obsoletas aún presentes: ${retiredCheck.rows.map((r) => r.relname).join(", ")}`
      );
    }

    const fnCheck = await client.query<{ proname: string }>(
      `SELECT p.proname
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'prevent_atom_dag_cycle'`
    );
    if (fnCheck.rows.length > 0) {
      throw new Error("Función obsoleta prevent_atom_dag_cycle() aún existe.");
    }

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
    console.log(
      `OK [1/7]: RLS habilitado explícitamente en las ${rows.length} tablas y artefactos 0001 limpiados.`
    );

    // 2. Verificar que las 12 capas enlazan su nodo raíz válido (is_layer_root = true y home_layer_id = layers.id)
    const rootVerify = await client.query<{
      code: string;
      slug: string;
      is_layer_root: boolean;
      same_layer: boolean;
    }>(
      `SELECT
         l.code,
         cn.slug,
         cn.is_layer_root,
         (cn.home_layer_id = l.id) AS same_layer
       FROM public.layers l
       LEFT JOIN public.concept_nodes cn ON cn.id = l.root_node_id
       ORDER BY l.order_index`
    );

    if (rootVerify.rows.length !== 12) {
      throw new Error(`Se esperaban 12 capas, se encontraron ${rootVerify.rows.length}`);
    }
    for (const row of rootVerify.rows) {
      const expectedSlug = `capa-${row.code.toLowerCase()}`;
      if (row.slug !== expectedSlug || !row.is_layer_root || !row.same_layer) {
        throw new Error(
          `Raíz inválida en capa ${row.code}: slug=${row.slug}, is_layer_root=${row.is_layer_root}, same_layer=${row.same_layer}`
        );
      }
    }
    console.log(
      "OK [2/7]: Las 12 capas enlazan su nodo raíz holónico válido (capa-l0..capa-l11)."
    );

    // 3. Verificar que DELETE está revocado para authenticated en user_node_notes
    const delPriv = await client.query<{ can_delete: boolean }>(
      `SELECT has_table_privilege('authenticated', 'public.user_node_notes', 'DELETE') AS can_delete`
    );
    if (delPriv.rows[0]?.can_delete) {
      throw new Error(
        "FALLO ZERO-TRUST: authenticated conserva permiso DELETE sobre public.user_node_notes"
      );
    }
    console.log(
      "OK [3/7]: Permiso DELETE revocado para authenticated sobre public.user_node_notes."
    );

    // 4–6. Pruebas transaccionales con SAVEPOINT y ROLLBACK total
    await client.query("BEGIN");
    try {
      const l0Res = await client.query<{ id: string }>(
        `SELECT id FROM public.layers WHERE code = 'L0'`
      );
      const layerId = l0Res.rows[0]!.id;

      const userRes = await client.query<{ id: string }>(
        `SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1`
      );
      const userId = userRes.rows[0]?.id;
      if (!userId) {
        throw new Error("No existe usuario en auth.users (ejecuta pnpm db:bootstrap-user)");
      }

      const nA = await client.query<{ id: string }>(
        `INSERT INTO public.concept_nodes (home_layer_id, code, slug, title, status, content_revision)
         VALUES ($1, 'L0.97', 'verify-node-a', 'Verify A', 'draft', 1) RETURNING id`,
        [layerId]
      );
      const nB = await client.query<{ id: string }>(
        `INSERT INTO public.concept_nodes (home_layer_id, code, slug, title, status, content_revision)
         VALUES ($1, 'L0.98', 'verify-node-b', 'Verify B', 'draft', 1) RETURNING id`,
        [layerId]
      );
      const nC = await client.query<{ id: string }>(
        `INSERT INTO public.concept_nodes (home_layer_id, code, slug, title, status, content_revision)
         VALUES ($1, 'L0.99', 'verify-node-c', 'Verify C', 'draft', 1) RETURNING id`,
        [layerId]
      );
      const idA = nA.rows[0]!.id;
      const idB = nB.rows[0]!.id;
      const idC = nC.rows[0]!.id;

      // 4a. Inmutabilidad de slug y regresión de content_revision bloqueadas, pero code SÍ es editable
      await client.query(`SAVEPOINT sp_slug`);
      await expectError(
        () =>
          client.query(`UPDATE public.concept_nodes SET slug = 'mutated-slug' WHERE id = $1`, [
            idA,
          ]),
        "Identity mutation forbidden",
        "slug inmutable"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_slug`);

      // Editar code debe funcionar sin error
      await client.query(`UPDATE public.concept_nodes SET code = 'L0.96' WHERE id = $1`, [idA]);

      // 4b. Ciclo M:N en node_compositions (A -> B -> C -> A)
      await client.query(
        `INSERT INTO public.node_compositions (parent_id, child_id, role_in_parent, structural_order, discovery_order)
         VALUES ($1, $2, 'Parte B en A', 1, 1), ($2, $3, 'Parte C en B', 1, 1)`,
        [idA, idB, idC]
      );
      await client.query(`SAVEPOINT sp_comp_cycle`);
      await expectError(
        () =>
          client.query(
            `INSERT INTO public.node_compositions (parent_id, child_id, role_in_parent, structural_order, discovery_order)
             VALUES ($1, $2, 'Ciclo ilegal', 1, 1)`,
            [idC, idA]
          ),
        "Composition cycle detected",
        "ciclo en node_compositions"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_comp_cycle`);

      // 4c. Ciclo en prerequisite bloqueado, contraste simétrico permitido con strength IS NULL
      await client.query(
        `INSERT INTO public.node_relations (from_id, to_id, kind, strength)
         VALUES ($1, $2, 'prerequisite', 'required')`,
        [idB, idA]
      );
      await client.query(`SAVEPOINT sp_prereq_cycle`);
      await expectError(
        () =>
          client.query(
            `INSERT INTO public.node_relations (from_id, to_id, kind, strength)
             VALUES ($1, $2, 'prerequisite', 'required')`,
            [idA, idB]
          ),
        "Prerequisite DAG cycle detected",
        "ciclo en node_relations prerequisite"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_prereq_cycle`);

      // Contraste con strength no nulo debe fallar por CHECK
      await client.query(`SAVEPOINT sp_contrast_strength`);
      await expectError(
        () =>
          client.query(
            `INSERT INTO public.node_relations (from_id, to_id, kind, strength)
             VALUES ($1, $2, 'contrast', 'required')`,
            [idA, idB]
          ),
        "node_relations_check",
        "strength no nulo en contrast"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_contrast_strength`);

      // Contraste simétrico válido con strength NULL
      await client.query(
        `INSERT INTO public.node_relations (from_id, to_id, kind, strength, context_note)
         VALUES ($1, $2, 'contrast', NULL, 'Espejo A vs B'),
                ($2, $1, 'contrast', NULL, 'Espejo B vs A')`,
        [idA, idB]
      );
      console.log(
        "OK [4/7]: Inmutabilidad de slug, editabilidad de code y triggers anti-ciclos verificados."
      );

      // 5. node_revisions estrictamente append-only
      await client.query(
        `INSERT INTO public.node_revisions (node_id, revision, content_json, schema_version)
         VALUES ($1, 1, '{}'::jsonb, 2)`,
        [idA]
      );
      await client.query(`SAVEPOINT sp_rev_mut`);
      await expectError(
        () =>
          client.query(
            `UPDATE public.node_revisions SET change_summary = 'hack' WHERE node_id = $1 AND revision = 1`,
            [idA]
          ),
        "strictly append-only",
        "node_revisions UPDATE bloqueado"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_rev_mut`);

      await client.query(`SAVEPOINT sp_rev_del`);
      await expectError(
        () =>
          client.query(`DELETE FROM public.node_revisions WHERE node_id = $1 AND revision = 1`, [
            idA,
          ]),
        "strictly append-only",
        "node_revisions DELETE bloqueado"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_rev_del`);
      console.log("OK [5/7]: Inmutabilidad append-only de node_revisions verificada.");

      // 6. user_node_notes: edición válida en revisión activa, anclas inmutables y bloqueo histórico
      const noteRes = await client.query<{ id: string }>(
        `INSERT INTO public.user_node_notes (user_id, node_id, note_kind, stage_number, scene_id, node_revision, body)
         VALUES ($1, $2, 'mental_image', 4, 'escena-pausa', 1, 'Mi imagen mental inicial')
         RETURNING id`,
        [userId, idA]
      );
      const noteId = noteRes.rows[0]!.id;

      // Editar body en revisión activa (1 == 1) debe funcionar
      await client.query(
        `UPDATE public.user_node_notes SET body = 'Mi imagen mental refinada' WHERE id = $1`,
        [noteId]
      );

      // Intentar mutar scene_id debe fallar
      await client.query(`SAVEPOINT sp_note_anchor`);
      await expectError(
        () =>
          client.query(`UPDATE public.user_node_notes SET scene_id = 'otra-escena' WHERE id = $1`, [
            noteId,
          ]),
        "Immutable anchor column modified",
        "ancla inmutable en user_node_notes"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_note_anchor`);

      // Avanzar el nodo a content_revision = 2 convierte la nota rev=1 en histórica (solo lectura)
      await client.query(
        `UPDATE public.concept_nodes SET content_revision = 2 WHERE id = $1`,
        [idA]
      );
      await client.query(`SAVEPOINT sp_note_hist`);
      await expectError(
        () =>
          client.query(`UPDATE public.user_node_notes SET body = 'Intento pisar' WHERE id = $1`, [
            noteId,
          ]),
        "strictly read-only",
        "nota histórica protegida contra edición"
      );
      await client.query(`ROLLBACK TO SAVEPOINT sp_note_hist`);
      console.log(
        "OK [6/7]: Protección de anclas y de notas históricas en user_node_notes verificada."
      );
    } finally {
      await client.query("ROLLBACK");
    }

    // 7. Verificar que el rol anónimo (sin sesión) está bloqueado en tablas curriculares y personales
    const anonClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const tbl of [
      "layers",
      "concept_nodes",
      "node_compositions",
      "node_relations",
      "node_revisions",
      "user_node_progress",
      "user_node_notes",
    ]) {
      const { data, error } = await anonClient.from(tbl).select("*").limit(1);
      if (!error && data && data.length > 0) {
        throw new Error(`FALLO ZERO-TRUST: Acceso anónimo leyó public.${tbl}`);
      }
    }
    console.log(
      "OK [7/7]: Aislamiento anónimo verificado en tablas curriculares, holónicas y personales."
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Fallo en verificación Zero-Trust:", err);
  process.exit(1);
});
