import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;

function formatTimestampCompact(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida en .env.local");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    // Snapshot transaccional consistente de solo lectura (sin consultas concurrentes en un único Client)
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

    const layers = await client.query(
      `SELECT id, code, order_index, title, subtitle, physical_scope, status, root_node_id, created_at, updated_at
       FROM public.layers
       ORDER BY order_index ASC`
    );
    const nodes = await client.query(
      `SELECT id, home_layer_id, code, slug, title, is_layer_root, status, primary_quantity,
              simulator_key, forbidden_terms, content_json, schema_version, content_revision,
              created_at, updated_at
       FROM public.concept_nodes
       ORDER BY is_layer_root DESC, code ASC, slug ASC`
    );
    const compositions = await client.query(
      `SELECT parent_id, child_id, role_in_parent, integration_note, group_label,
              structural_order, discovery_order, added_in_parent_revision, created_at, updated_at
       FROM public.node_compositions
       ORDER BY parent_id ASC, structural_order ASC, child_id ASC`
    );
    const relations = await client.query(
      `SELECT from_id, to_id, kind, strength, context_note, created_at
       FROM public.node_relations
       ORDER BY from_id ASC, kind ASC, to_id ASC`
    );
    const revisions = await client.query(
      `SELECT node_id, revision, content_json, forbidden_terms, schema_version, change_summary, published_at
       FROM public.node_revisions
       ORDER BY node_id ASC, revision ASC`
    );
    const glossary = await client.query(
      `SELECT id, slug, term, aliases, mental_image_short, technical_definition,
              origin_node_id, physical_quantity, created_at, updated_at
       FROM public.glossary_terms
       ORDER BY slug ASC`
    );
    const progress = await client.query(
      `SELECT id, user_id, node_id, holonic_phase, current_stage, current_scene_id,
              completed_stages, completed_scene_ids, mastery_status, assimilated_revision,
              prediction_log, last_reviewed_at, next_review_at, created_at, updated_at
       FROM public.user_node_progress
       ORDER BY user_id ASC, node_id ASC`
    );
    const notes = await client.query(
      `SELECT id, user_id, node_id, note_kind, stage_number, scene_id, node_revision,
              body, created_at, updated_at
       FROM public.user_node_notes
       ORDER BY user_id ASC, node_id ASC, node_revision ASC, note_kind ASC, scene_id ASC`
    );
    const preferences = await client.query(
      `SELECT user_id, theme, zen_mode_default, updated_at
       FROM public.user_workspace_preferences
       ORDER BY user_id ASC`
    );

    await client.query("COMMIT");

    const now = new Date();
    const snapDir = path.resolve(
      process.cwd(),
      "exports",
      `snapshot-${formatTimestampCompact(now)}`
    );
    const mdDir = path.join(snapDir, "markdown");
    fs.mkdirSync(mdDir, { recursive: true });

    const bundle = {
      export_schema_version: 1,
      exported_at: now.toISOString(),
      counts: {
        layers: layers.rows.length,
        concept_nodes: nodes.rows.length,
        node_compositions: compositions.rows.length,
        node_relations: relations.rows.length,
        node_revisions: revisions.rows.length,
        glossary_terms: glossary.rows.length,
        user_node_progress: progress.rows.length,
        user_node_notes: notes.rows.length,
        user_workspace_preferences: preferences.rows.length,
      },
      data: {
        layers: layers.rows,
        concept_nodes: nodes.rows,
        node_compositions: compositions.rows,
        node_relations: relations.rows,
        node_revisions: revisions.rows,
        glossary_terms: glossary.rows,
        user_node_progress: progress.rows,
        user_node_notes: notes.rows,
        user_workspace_preferences: preferences.rows,
      },
    };

    const bundlePath = path.join(snapDir, "bundle.json");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const nodeById = new Map<string, (typeof nodes.rows)[number]>();
    for (const n of nodes.rows) {
      nodeById.set(n.id as string, n);
    }

    const childrenByParent = new Map<string, (typeof compositions.rows)[number][]>();
    for (const comp of compositions.rows) {
      const list = childrenByParent.get(comp.parent_id as string) ?? [];
      list.push(comp);
      childrenByParent.set(comp.parent_id as string, list);
    }

    const notesByNode = new Map<string, (typeof notes.rows)[number][]>();
    for (const note of notes.rows) {
      const list = notesByNode.get(note.node_id as string) ?? [];
      list.push(note);
      notesByNode.set(note.node_id as string, list);
    }

    for (const node of nodes.rows) {
      const nodeId = node.id as string;
      const slug = node.slug as string;
      const code = node.code as string;
      const children = childrenByParent.get(nodeId) ?? [];
      const nodeNotes = notesByNode.get(nodeId) ?? [];

      const lines: string[] = [
        `# ${code} · ${node.title as string}`,
        "",
        `- **Slug:** \`${slug}\``,
        `- **Estado:** \`${node.status as string}\``,
        `- **Raíz de estrato:** ${node.is_layer_root ? "Sí" : "No"}`,
        `- **Revisión vigente:** \`${node.content_revision as number}\``,
        "",
      ];

      if (children.length > 0) {
        lines.push("## Composición (partes directas)", "");
        for (const c of children) {
          const childNode = nodeById.get(c.child_id as string);
          const childLabel = childNode
            ? `${childNode.code as string} · ${childNode.title as string} (\`${childNode.slug as string}\`)`
            : (c.child_id as string);
          lines.push(
            `- **${childLabel}** — Rol: ${c.role_in_parent as string} (orden estructural: ${c.structural_order as number}, descubrimiento: ${c.discovery_order as number})`
          );
        }
        lines.push("");
      }

      lines.push("## Contenido estructurado", "");
      const contentObj = (node.content_json ?? {}) as Record<string, unknown>;
      if (contentObj.state === "in_preparation" || Object.keys(contentObj).length === 0) {
        lines.push("_Contenido en preparación._", "");
      } else {
        lines.push("```json", JSON.stringify(contentObj, null, 2), "```", "");
      }

      lines.push("## Notas propias del autor", "");
      if (nodeNotes.length === 0) {
        lines.push("_Sin notas registradas todavía._", "");
      } else {
        for (const nt of nodeNotes) {
          const kindLabel =
            nt.note_kind === "mental_image"
              ? "Imagen mental (Etapa 4)"
              : "Síntesis Viva";
          lines.push(
            `### ${kindLabel} · Escena \`${nt.scene_id as string}\` · Revisión \`${nt.node_revision as number}\``,
            "",
            String(nt.body),
            ""
          );
        }
      }

      const safeCode = code.toLowerCase().replace(/\./g, "-");
      const mdFile = path.join(mdDir, `${safeCode}--${slug}.md`);
      fs.writeFileSync(mdFile, lines.join("\n"), "utf8");
    }

    console.log(
      `OK: Respaldo local exportado en ${path.relative(process.cwd(), snapDir)} (${nodes.rows.length} archivos Markdown + bundle.json determinista).`
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error exportando respaldo local:", err);
  process.exit(1);
});
