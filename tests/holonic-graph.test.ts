import { describe, expect, it } from "vitest";
import {
  CompositionEdgeSchema,
  SemanticRelationSchema,
  UserNodeNoteSchema,
  type CompositionEdge,
  type NodeContentJson,
  type SemanticRelation,
} from "@/lib/schemas/node";
import {
  deriveStructureKind,
  evaluateHolonicNodeState,
  groupChildCompositions,
  hasCompositionCycle,
  hasPrerequisiteCycle,
  resolveActiveParentRole,
} from "@/lib/engine/holonic-graph";

const ID_P = "00000000-0000-4000-8000-000000000001";
const ID_A = "00000000-0000-4000-8000-000000000002";
const ID_B = "00000000-0000-4000-8000-000000000003";
const ID_C = "00000000-0000-4000-8000-000000000004";

describe("Holonic Graph Engine & Relational Contracts", () => {
  it("derives simple vs compound structure dynamically from compositions", () => {
    expect(deriveStructureKind([])).toBe("simple");

    const edge = CompositionEdgeSchema.parse({
      parent_id: ID_P,
      child_id: ID_A,
      role_in_parent: "Suministra retención unidireccional",
      structural_order: 1,
      discovery_order: 1,
    });
    expect(deriveStructureKind([edge])).toBe("compound");
  });

  it("groups 20+ child compositions cleanly by group_label and respects discovery vs structural order", () => {
    const edges: CompositionEdge[] = Array.from({ length: 22 }, (_, i) => {
      const idx = i + 1;
      const childUuid = `00000000-0000-4000-8000-${String(idx + 10).padStart(12, "0")}`;
      const group =
        idx <= 8
          ? "Admisión y filtrado"
          : idx <= 15
            ? "Bombeo e impulsión"
            : "Retorno y purga";
      return {
        parent_id: ID_P,
        child_id: childUuid,
        role_in_parent: `Rol ${idx}`,
        integration_note: "",
        group_label: group,
        structural_order: idx,
        discovery_order: 23 - idx, // orden inverso de descubrimiento frente al estructural
        added_in_parent_revision: 1,
      };
    });

    const discoveryGroups = groupChildCompositions(edges, "discovery");
    expect(discoveryGroups).toHaveLength(3);
    expect(discoveryGroups[0]?.groupLabel).toBe("Retorno y purga");
    expect(discoveryGroups[0]?.items[0]?.structural_order).toBe(22);

    const structuralGroups = groupChildCompositions(edges, "structural");
    expect(structuralGroups).toHaveLength(3);
    expect(structuralGroups[0]?.groupLabel).toBe("Admisión y filtrado");
    expect(structuralGroups[0]?.items[0]?.structural_order).toBe(1);
  });

  it("preserves Simple -> Compound history and detects Evolved state via added_in_parent_revision", () => {
    const content: NodeContentJson = {
      state: "in_preparation",
      preview_scenes: [],
      living_synthesis_scenes: [],
    };

    const children: CompositionEdge[] = [
      {
        parent_id: ID_P,
        child_id: ID_A,
        role_in_parent: "Cuerpo principal",
        integration_note: "",
        group_label: null,
        structural_order: 1,
        discovery_order: 1,
        added_in_parent_revision: 1,
      },
      {
        parent_id: ID_P,
        child_id: ID_B,
        role_in_parent: "Válvula antirretorno añadida después",
        integration_note: "",
        group_label: null,
        structural_order: 2,
        discovery_order: 2,
        added_in_parent_revision: 2,
      },
    ];

    const evalResult = evaluateHolonicNodeState({
      content,
      childCompositions: children,
      progress: {
        mastery_status: "assimilated",
        assimilated_revision: 1,
        completed_stages: [1, 2, 3, 4, 5, 6],
      },
      notes: [
        {
          note_kind: "mental_image",
          scene_id: "pausa-inicial",
          node_revision: 1,
        },
      ],
    });

    expect(evalResult.structureKind).toBe("compound");
    expect(evalResult.preservedSimpleHistory).toBe(true);
    expect(evalResult.effectiveMasteryStatus).toBe("evolved");
    expect(evalResult.newlyAddedChildIds).toEqual([ID_B]);

    const roleInP = resolveActiveParentRole(children, ID_P);
    expect(roleInP?.role_in_parent).toBe("Cuerpo principal");
  });

  it("detects M:N composition cycles while allowing diamond DAG reuse of a shared piece", () => {
    // Diamante válido: P contiene A y B; tanto A como B reutilizan la misma pieza C
    const diamond: CompositionEdge[] = [
      {
        parent_id: ID_P,
        child_id: ID_A,
        role_in_parent: "Subsistema A",
        integration_note: "",
        group_label: null,
        structural_order: 1,
        discovery_order: 1,
        added_in_parent_revision: 1,
      },
      {
        parent_id: ID_P,
        child_id: ID_B,
        role_in_parent: "Subsistema B",
        integration_note: "",
        group_label: null,
        structural_order: 2,
        discovery_order: 2,
        added_in_parent_revision: 1,
      },
      {
        parent_id: ID_A,
        child_id: ID_C,
        role_in_parent: "Válvula en A",
        integration_note: "",
        group_label: null,
        structural_order: 1,
        discovery_order: 1,
        added_in_parent_revision: 1,
      },
      {
        parent_id: ID_B,
        child_id: ID_C,
        role_in_parent: "Válvula en B",
        integration_note: "",
        group_label: null,
        structural_order: 1,
        discovery_order: 1,
        added_in_parent_revision: 1,
      },
    ];
    expect(hasCompositionCycle(diamond)).toBe(false);

    // Ciclo ilegal: C intenta contener a P
    expect(
      hasCompositionCycle([
        ...diamond,
        {
          parent_id: ID_C,
          child_id: ID_P,
          role_in_parent: "Ciclo",
          integration_note: "",
          group_label: null,
          structural_order: 1,
          discovery_order: 1,
          added_in_parent_revision: 1,
        },
      ])
    ).toBe(true);
  });

  it("enforces prerequisite DAG acyclicity and nullable strength rules while permitting symmetric contrast", () => {
    const validContrastA = SemanticRelationSchema.parse({
      from_id: ID_A,
      to_id: ID_B,
      kind: "contrast",
      strength: null,
      context_note: "Con escobillas vs sin escobillas",
    });
    const validContrastB = SemanticRelationSchema.parse({
      from_id: ID_B,
      to_id: ID_A,
      kind: "contrast",
      strength: null,
      context_note: "Sin escobillas vs con escobillas",
    });

    // Contraste con strength != null debe ser rechazado por Zod
    expect(() =>
      SemanticRelationSchema.parse({
        from_id: ID_A,
        to_id: ID_B,
        kind: "contrast",
        strength: "required",
      })
    ).toThrow();

    // Prerrequisito con strength null debe ser rechazado por Zod
    expect(() =>
      SemanticRelationSchema.parse({
        from_id: ID_A,
        to_id: ID_B,
        kind: "prerequisite",
        strength: null,
      })
    ).toThrow();

    const prereqAB: SemanticRelation = SemanticRelationSchema.parse({
      from_id: ID_B,
      to_id: ID_A,
      kind: "prerequisite",
      strength: "required",
    });

    expect(
      hasPrerequisiteCycle([validContrastA, validContrastB, prereqAB])
    ).toBe(false);

    const prereqBA: SemanticRelation = SemanticRelationSchema.parse({
      from_id: ID_A,
      to_id: ID_B,
      kind: "prerequisite",
      strength: "required",
    });
    expect(hasPrerequisiteCycle([prereqAB, prereqBA])).toBe(true);
  });

  it("enforces note_kind and stage_number invariants on UserNodeNoteSchema", () => {
    expect(() =>
      UserNodeNoteSchema.parse({
        node_id: ID_A,
        note_kind: "mental_image",
        stage_number: 4,
        scene_id: "escena-pausa",
        node_revision: 1,
        body: "Explicación clara con mis palabras.",
      })
    ).not.toThrow();

    expect(() =>
      UserNodeNoteSchema.parse({
        node_id: ID_A,
        note_kind: "living_synthesis",
        stage_number: null,
        scene_id: "sintesis-conjunto",
        node_revision: 2,
        body: "Integración de todas las piezas.",
      })
    ).not.toThrow();

    expect(() =>
      UserNodeNoteSchema.parse({
        node_id: ID_A,
        note_kind: "living_synthesis",
        stage_number: 4,
        scene_id: "sintesis-conjunto",
        node_revision: 2,
        body: "Inválido con stage 4",
      })
    ).toThrow();
  });
});
