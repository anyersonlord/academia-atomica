import { config } from "dotenv";
import path from "node:path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;

interface LayerSeed {
  code: string;
  order_index: number;
  title: string;
  subtitle: string;
  physical_scope: string;
  status: "active" | "planned";
}

// Mapa ontológico estructural L0–L11 (solo esqueleto de capas; cero átomos de relleno)
const LAYERS: LayerSeed[] = [
  {
    code: "L0",
    order_index: 0,
    title: "Axioma Lógico y Ontología Física",
    subtitle: "Causalidad, sistema, energía y transformación",
    physical_scope: "Fundamento lógico y conservación física",
    status: "active",
  },
  {
    code: "L1",
    order_index: 1,
    title: "Universo Subatómico y Cuántico",
    subtitle: "Quarks, gluones, electrones, espín y bandas de conducción",
    physical_scope: "Escala subatómica y estructura de la materia",
    status: "planned",
  },
  {
    code: "L2",
    order_index: 2,
    title: "Química Atómica y Combustibles",
    subtitle: "Enlaces covalentes, hidrocarburos, combustión y electroquímica",
    physical_scope: "Energía química almacenada y fluidos críticos",
    status: "planned",
  },
  {
    code: "L3",
    order_index: 3,
    title: "Termodinámica y Mecánica de Fluidos",
    subtitle: "Temperatura, presión, ciclos Diésel/Otto y transferencia de calor",
    physical_scope: "Conversión térmica y dinámica de gases/líquidos",
    status: "planned",
  },
  {
    code: "L4",
    order_index: 4,
    title: "Mecánica y Motor Primario",
    subtitle: "Torque, potencia mecánica, cinemática y subsistemas del motor",
    physical_scope: "Prime mover y entrega de par en el eje",
    status: "planned",
  },
  {
    code: "L5",
    order_index: 5,
    title: "Electromagnetismo Fundamental",
    subtitle: "Campos, potencial, ferromagnetismo, Faraday-Lenz y Lorentz",
    physical_scope: "Puente físico entre rotación y electricidad",
    status: "planned",
  },
  {
    code: "L6",
    order_index: 6,
    title: "Corriente Alterna, Trifásica y Potencia",
    subtitle: "Frecuencia, RMS, impedancia, estrella/delta y triángulo kW/kVAR/kVA",
    physical_scope: "Circuitos de potencia y calidad de onda",
    status: "planned",
  },
  {
    code: "L7",
    order_index: 7,
    title: "El Alternador Síncrono",
    subtitle: "Estator, rotor, sin/con escobillas, puente rotativo y Shunt/PMG/AREP",
    physical_scope: "Máquina eléctrica síncrona y excitación",
    status: "planned",
  },
  {
    code: "L8",
    order_index: 8,
    title: "Regulación, Control y Cerebro Electrónico",
    subtitle: "Gobernador isócrono/droop, AVR, MPU y controladores maestros",
    physical_scope: "Lazos cerrados de frecuencia, tensión y protección",
    status: "planned",
  },
  {
    code: "L9",
    order_index: 9,
    title: "Integración de Planta, ATS y Auxiliares",
    subtitle: "Bancada, cabina, ventilación, transferencia automática y puesta a tierra",
    physical_scope: "Sistema completo instalado e integración eléctrica",
    status: "planned",
  },
  {
    code: "L10",
    order_index: 10,
    title: "Paralelismo y Normativa Internacional",
    subtitle: "Sincronización, reparto kW/kVAR, ISO 8528, NFPA 110 y derating",
    physical_scope: "Operación avanzada y cumplimiento normativo",
    status: "planned",
  },
  {
    code: "L11",
    order_index: 11,
    title: "Confiabilidad, Diagnóstico FMEA/FTA y Mantenimiento",
    subtitle: "Árboles de falla, pruebas eléctricas/fluidos, banco de cargas y LOTO",
    physical_scope: "Fuente de verdad operativa en campo",
    status: "planned",
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
    for (const layer of LAYERS) {
      await client.query(
        `INSERT INTO public.layers (code, order_index, title, subtitle, physical_scope, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE SET
           order_index = EXCLUDED.order_index,
           title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle,
           physical_scope = EXCLUDED.physical_scope,
           status = EXCLUDED.status`,
        [
          layer.code,
          layer.order_index,
          layer.title,
          layer.subtitle,
          layer.physical_scope,
          layer.status,
        ]
      );
    }
    await client.query("COMMIT");
    console.log(`OK: ${LAYERS.length} capas estructurales sincronizadas (L0 active, L1–L11 planned).`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error sembrando capas:", err);
  process.exit(1);
});
