import { config } from "dotenv";
import path from "node:path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;

interface LayerSeed {
  code: string;
  rootSlug: string;
  order_index: number;
  title: string;
  subtitle: string;
  physical_scope: string;
  status: "active" | "planned";
  primary_quantity:
    | "electric"
    | "magnetic"
    | "thermal"
    | "mechanical"
    | "signal"
    | null;
}

// Mapa ontológico estructural L0–L11 + sus 12 nodos raíz holónicos limpios (cero contenido inventado)
export const LAYERS_SEED: readonly LayerSeed[] = [
  {
    code: "L0",
    rootSlug: "capa-l0",
    order_index: 0,
    title: "Axioma Lógico y Ontología Física",
    subtitle: "Causalidad, sistema, energía y transformación",
    physical_scope: "Fundamento lógico y conservación física",
    status: "active",
    primary_quantity: null,
  },
  {
    code: "L1",
    rootSlug: "capa-l1",
    order_index: 1,
    title: "Universo Subatómico y Cuántico",
    subtitle: "Quarks, gluones, electrones, espín y bandas de conducción",
    physical_scope: "Escala subatómica y estructura de la materia",
    status: "planned",
    primary_quantity: null,
  },
  {
    code: "L2",
    rootSlug: "capa-l2",
    order_index: 2,
    title: "Química Atómica y Combustibles",
    subtitle: "Enlaces covalentes, hidrocarburos, combustión y electroquímica",
    physical_scope: "Energía química almacenada y fluidos críticos",
    status: "planned",
    primary_quantity: "thermal",
  },
  {
    code: "L3",
    rootSlug: "capa-l3",
    order_index: 3,
    title: "Termodinámica y Mecánica de Fluidos",
    subtitle: "Temperatura, presión, ciclos Diésel/Otto y transferencia de calor",
    physical_scope: "Conversión térmica y dinámica de gases/líquidos",
    status: "planned",
    primary_quantity: "thermal",
  },
  {
    code: "L4",
    rootSlug: "capa-l4",
    order_index: 4,
    title: "Mecánica y Motor Primario",
    subtitle: "Torque, potencia mecánica, cinemática y subsistemas del motor",
    physical_scope: "Prime mover y entrega de par en el eje",
    status: "planned",
    primary_quantity: "mechanical",
  },
  {
    code: "L5",
    rootSlug: "capa-l5",
    order_index: 5,
    title: "Electromagnetismo Fundamental",
    subtitle: "Campos, potencial, ferromagnetismo, Faraday-Lenz y Lorentz",
    physical_scope: "Puente físico entre rotación y electricidad",
    status: "planned",
    primary_quantity: "magnetic",
  },
  {
    code: "L6",
    rootSlug: "capa-l6",
    order_index: 6,
    title: "Corriente Alterna, Trifásica y Potencia",
    subtitle: "Frecuencia, RMS, impedancia, estrella/delta y triángulo kW/kVAR/kVA",
    physical_scope: "Circuitos de potencia y calidad de onda",
    status: "planned",
    primary_quantity: "electric",
  },
  {
    code: "L7",
    rootSlug: "capa-l7",
    order_index: 7,
    title: "El Alternador Síncrono",
    subtitle: "Estator, rotor, sin/con escobillas, puente rotativo y Shunt/PMG/AREP",
    physical_scope: "Máquina eléctrica síncrona y excitación",
    status: "planned",
    primary_quantity: "magnetic",
  },
  {
    code: "L8",
    rootSlug: "capa-l8",
    order_index: 8,
    title: "Regulación, Control y Cerebro Electrónico",
    subtitle: "Gobernador isócrono/droop, AVR, MPU y controladores maestros",
    physical_scope: "Lazos cerrados de frecuencia, tensión y protección",
    status: "planned",
    primary_quantity: "signal",
  },
  {
    code: "L9",
    rootSlug: "capa-l9",
    order_index: 9,
    title: "Integración de Planta, ATS y Auxiliares",
    subtitle: "Bancada, cabina, ventilación, transferencia automática y puesta a tierra",
    physical_scope: "Sistema completo instalado e integración eléctrica",
    status: "planned",
    primary_quantity: null,
  },
  {
    code: "L10",
    rootSlug: "capa-l10",
    order_index: 10,
    title: "Paralelismo y Normativa Internacional",
    subtitle: "Sincronización, reparto kW/kVAR, ISO 8528, NFPA 110 y derating",
    physical_scope: "Operación avanzada y cumplimiento normativo",
    status: "planned",
    primary_quantity: null,
  },
  {
    code: "L11",
    rootSlug: "capa-l11",
    order_index: 11,
    title: "Confiabilidad, Diagnóstico FMEA/FTA y Mantenimiento",
    subtitle: "Árboles de falla, pruebas eléctricas/fluidos, banco de cargas y LOTO",
    physical_scope: "Fuente de verdad operativa en campo",
    status: "planned",
    primary_quantity: null,
  },
];

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
    await client.query("BEGIN");

    const emptyRootContent = JSON.stringify({
      state: "in_preparation",
      preview_scenes: [],
      living_synthesis_scenes: [],
    });

    for (const layer of LAYERS_SEED) {
      const layerRes = await client.query<{ id: string }>(
        `INSERT INTO public.layers (code, order_index, title, subtitle, physical_scope, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE SET
           order_index = EXCLUDED.order_index,
           title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle,
           physical_scope = EXCLUDED.physical_scope,
           status = EXCLUDED.status
         RETURNING id`,
        [
          layer.code,
          layer.order_index,
          layer.title,
          layer.subtitle,
          layer.physical_scope,
          layer.status,
        ]
      );

      const layerId = layerRes.rows[0]!.id;
      const nodeStatus = layer.status === "active" ? "calibration" : "draft";

      // Crear o actualizar el nodo raíz limpio (slug inmutable capa-l0..capa-l11)
      const rootNodeRes = await client.query<{ id: string }>(
        `INSERT INTO public.concept_nodes (
           home_layer_id,
           code,
           slug,
           title,
           is_layer_root,
           status,
           primary_quantity,
           content_json,
           schema_version,
           content_revision
         )
         VALUES ($1, $2, $3, $4, true, $5, $6, $7::jsonb, 2, 1)
         ON CONFLICT (slug) DO UPDATE SET
           home_layer_id = EXCLUDED.home_layer_id,
           code = EXCLUDED.code,
           title = EXCLUDED.title,
           is_layer_root = true,
           primary_quantity = EXCLUDED.primary_quantity
         RETURNING id`,
        [
          layerId,
          layer.code,
          layer.rootSlug,
          layer.title,
          nodeStatus,
          layer.primary_quantity,
          emptyRootContent,
        ]
      );

      const rootNodeId = rootNodeRes.rows[0]!.id;

      await client.query(
        `UPDATE public.layers SET root_node_id = $1 WHERE id = $2`,
        [rootNodeId, layerId]
      );
    }

    await client.query("COMMIT");
    console.log(
      `OK: ${LAYERS_SEED.length} estratos y sus ${LAYERS_SEED.length} nodos raíz holónicos (capa-l0..capa-l11) sincronizados.`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error sembrando capas y nodos raíz:", err);
  process.exit(1);
});
