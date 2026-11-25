import type {
  CompositionEdge,
  NodeContentJson,
  SemanticRelation,
} from "@/lib/schemas/node";

export type HolonicStructureKind = "simple" | "compound";

export type ComputedMasteryStatus =
  | "locked"
  | "ready"
  | "in_progress"
  | "assimilated"
  | "evolved";

export interface NodeCompositionGroup {
  groupLabel: string | null;
  items: CompositionEdge[];
}

export interface UserProgressSnapshot {
  mastery_status: ComputedMasteryStatus;
  assimilated_revision: number | null;
  completed_stages: readonly number[];
}

export interface UserNoteSummary {
  note_kind: "mental_image" | "living_synthesis";
  scene_id: string;
  node_revision: number;
}

export interface HolonicEvaluation {
  structureKind: HolonicStructureKind;
  effectiveMasteryStatus: ComputedMasteryStatus;
  newlyAddedChildIds: string[];
  preservedSimpleHistory: boolean;
}

/**
 * Determina si un conjunto de aristas dirigidas (from -> to) contiene ciclos
 * usando búsqueda en profundidad con tres colores.
 */
function hasDirectedCycle(
  edges: ReadonlyArray<{ from: string; to: string }>
): boolean {
  const adj = new Map<string, string[]>();
  const nodes = new Set<string>();

  for (const e of edges) {
    if (e.from === e.to) return true;
    nodes.add(e.from);
    nodes.add(e.to);
    const list = adj.get(e.from);
    if (list) list.push(e.to);
    else adj.set(e.from, [e.to]);
  }

  // 0 = no visitado, 1 = en pila actual, 2 = cerrado
  const state = new Map<string, 0 | 1 | 2>();

  const dfs = (u: string): boolean => {
    state.set(u, 1);
    for (const v of adj.get(u) ?? []) {
      const st = state.get(v) ?? 0;
      if (st === 1) return true;
      if (st === 0 && dfs(v)) return true;
    }
    state.set(u, 2);
    return false;
  };

  for (const n of nodes) {
    if ((state.get(n) ?? 0) === 0 && dfs(n)) {
      return true;
    }
  }
  return false;
}

export function hasCompositionCycle(
  compositions: readonly CompositionEdge[]
): boolean {
  return hasDirectedCycle(
    compositions.map((c) => ({ from: c.parent_id, to: c.child_id }))
  );
}

/**
 * Solo las aristas 'prerequisite' exigen un DAG acíclico; 'contrast' admite simetría A <-> B.
 */
export function hasPrerequisiteCycle(
  relations: readonly SemanticRelation[]
): boolean {
  return hasDirectedCycle(
    relations
      .filter((r) => r.kind === "prerequisite")
      .map((r) => ({ from: r.from_id, to: r.to_id }))
  );
}

export function deriveStructureKind(
  childCompositions: readonly CompositionEdge[]
): HolonicStructureKind {
  return childCompositions.length === 0 ? "simple" : "compound";
}

/**
 * Ordena y agrupa las partes de un nodo compuesto (1 a 20+ hijos) respetando
 * el orden elegido ('discovery' por defecto para aprendizaje, 'structural' para referencia).
 */
export function groupChildCompositions(
  childCompositions: readonly CompositionEdge[],
  orderBy: "discovery" | "structural" = "discovery"
): NodeCompositionGroup[] {
  const sorted = [...childCompositions].sort((a, b) =>
    orderBy === "discovery"
      ? a.discovery_order - b.discovery_order
      : a.structural_order - b.structural_order
  );

  const groups: NodeCompositionGroup[] = [];
  const indexByLabel = new Map<string, number>();

  for (const item of sorted) {
    const key = item.group_label ?? "";
    if (key === "") {
      // Elementos sin grupo mantienen su secuencia natural agrupándose con adyacentes sin etiqueta
      const prev = groups[groups.length - 1];
      if (prev && prev.groupLabel === null) {
        prev.items.push(item);
      } else {
        groups.push({ groupLabel: null, items: [item] });
      }
      continue;
    }

    const existingIdx = indexByLabel.get(key);
    if (existingIdx !== undefined) {
      groups[existingIdx]!.items.push(item);
    } else {
      indexByLabel.set(key, groups.length);
      groups.push({ groupLabel: item.group_label, items: [item] });
    }
  }

  return groups;
}

/**
 * Evalúa el estado holónico de un nodo garantizando:
 * 1. Transición Simple -> Compuesto sin pérdida (preserva contenido N-6 y notas mental_image previas).
 * 2. Detección determinista de nodo Evolucionado cuando recibe hijos con added_in_parent_revision > assimilated_revision.
 */
export function evaluateHolonicNodeState(params: {
  content: NodeContentJson;
  childCompositions: readonly CompositionEdge[];
  progress: UserProgressSnapshot | null;
  notes: readonly UserNoteSummary[];
}): HolonicEvaluation {
  const { content, childCompositions, progress, notes } = params;
  const structureKind = deriveStructureKind(childCompositions);

  const hasPriorN6 =
    Array.isArray(content.n6_stages) && content.n6_stages.length > 0;
  const hasPriorMentalImageNotes = notes.some(
    (n) => n.note_kind === "mental_image"
  );
  const preservedSimpleHistory =
    structureKind === "compound" && (hasPriorN6 || hasPriorMentalImageNotes);

  if (!progress) {
    return {
      structureKind,
      effectiveMasteryStatus: "ready",
      newlyAddedChildIds: [],
      preservedSimpleHistory,
    };
  }

  if (
    structureKind === "compound" &&
    (progress.mastery_status === "assimilated" ||
      progress.mastery_status === "evolved") &&
    progress.assimilated_revision !== null
  ) {
    const assimilatedRev = progress.assimilated_revision;
    const newlyAddedChildIds = childCompositions
      .filter((c) => c.added_in_parent_revision > assimilatedRev)
      .sort((a, b) => a.discovery_order - b.discovery_order)
      .map((c) => c.child_id);

    if (newlyAddedChildIds.length > 0) {
      return {
        structureKind,
        effectiveMasteryStatus: "evolved",
        newlyAddedChildIds,
        preservedSimpleHistory,
      };
    }
  }

  return {
    structureKind,
    effectiveMasteryStatus: progress.mastery_status,
    newlyAddedChildIds: [],
    preservedSimpleHistory,
  };
}

/**
 * Resuelve el rol contextual del nodo actual dentro del padre activo de la pila ?via=.
 */
export function resolveActiveParentRole(
  compositionsForChild: readonly CompositionEdge[],
  immediateParentId: string | null
): CompositionEdge | null {
  if (!immediateParentId) return null;
  return (
    compositionsForChild.find((c) => c.parent_id === immediateParentId) ?? null
  );
}
