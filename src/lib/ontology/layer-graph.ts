import type { PhysicalQuantityKey } from "@/lib/design/tokens";

export type LayerCode =
  | "L0"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6"
  | "L7"
  | "L8"
  | "L9"
  | "L10"
  | "L11";

export interface LayerRecord {
  code: LayerCode;
  order_index: number;
  title: string;
  subtitle: string;
  physical_scope: string;
  status: "active" | "planned";
}

export interface CausalBranch {
  id: "energy" | "field";
  legend: string;
  layers: readonly LayerCode[];
}

export interface CausalEdge {
  from: LayerCode;
  to: LayerCode;
}

export const ALL_LAYER_CODES: readonly LayerCode[] = [
  "L0",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "L6",
  "L7",
  "L8",
  "L9",
  "L10",
  "L11",
] as const;

/**
 * Topología causal del aprendizaje de grupos electrógenos:
 * L0 → L1 se bifurca en la rama de la energía (L2 → L3 → L4) y la rama del campo (L5 → L6),
 * que convergen en el alternador síncrono (L7) hasta la ingeniería de campo (L11).
 */
export const CAUSAL_LAYER_TOPOLOGY = {
  openingTrunk: ["L0", "L1"] as readonly LayerCode[],
  branches: [
    {
      id: "energy",
      legend: "La energía se vuelve giro",
      layers: ["L2", "L3", "L4"],
    },
    {
      id: "field",
      legend: "El campo se vuelve tensión",
      layers: ["L5", "L6"],
    },
  ] as readonly [CausalBranch, CausalBranch],
  convergenceTrunk: ["L7", "L8", "L9", "L10", "L11"] as readonly LayerCode[],
} as const;

export const CAUSAL_LAYER_EDGES: readonly CausalEdge[] = [
  { from: "L0", to: "L1" },
  // Bifurcación desde la física subatómica (L1)
  { from: "L1", to: "L2" },
  { from: "L2", to: "L3" },
  { from: "L3", to: "L4" },
  { from: "L1", to: "L5" },
  { from: "L5", to: "L6" },
  // Convergencia electromecánica en el alternador síncrono (L7)
  { from: "L4", to: "L7" },
  { from: "L6", to: "L7" },
  // Integración y confiabilidad
  { from: "L7", to: "L8" },
  { from: "L8", to: "L9" },
  { from: "L9", to: "L10" },
  { from: "L10", to: "L11" },
] as const;

/**
 * Tinte físico sutil exclusivo para hover/foco (en reposo el grafo es 100 % monocromo).
 */
export const LAYER_HOVER_QUANTITY: Partial<
  Record<LayerCode, PhysicalQuantityKey>
> = {
  L2: "thermal",
  L3: "thermal",
  L4: "mechanical",
  L5: "magnetic",
  L6: "electric",
  L7: "magnetic",
  L8: "signal",
};

export function collectTopologyCodes(): LayerCode[] {
  return [
    ...CAUSAL_LAYER_TOPOLOGY.openingTrunk,
    ...CAUSAL_LAYER_TOPOLOGY.branches[0].layers,
    ...CAUSAL_LAYER_TOPOLOGY.branches[1].layers,
    ...CAUSAL_LAYER_TOPOLOGY.convergenceTrunk,
  ];
}

/**
 * Verifica que las aristas causales formen un Grafo Acíclico Dirigido (DAG) válido
 * usando ordenamiento topológico de Kahn.
 */
export function isLayerGraphAcyclic(
  nodes: readonly LayerCode[] = ALL_LAYER_CODES,
  edges: readonly CausalEdge[] = CAUSAL_LAYER_EDGES
): boolean {
  const inDegree = new Map<LayerCode, number>();
  const adjacency = new Map<LayerCode, LayerCode[]>();

  for (const node of nodes) {
    inDegree.set(node, 0);
    adjacency.set(node, []);
  }

  for (const edge of edges) {
    if (!inDegree.has(edge.from) || !inDegree.has(edge.to)) {
      return false;
    }
    adjacency.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue: LayerCode[] = [];
  for (const [node, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(node);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited += 1;
    for (const next of adjacency.get(current) ?? []) {
      const nextDeg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, nextDeg);
      if (nextDeg === 0) {
        queue.push(next);
      }
    }
  }

  return visited === nodes.length;
}
