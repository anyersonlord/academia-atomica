import { z } from "zod";

/**
 * Identificador estable sin puntos (garantiza que ?via=padre-a.padre-b sea inequívoco).
 */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Admite raíces de estrato (L0..L11) y códigos holónicos arbitrarios (L0.1, L4.2.1...).
 */
export const NODE_CODE_REGEX = /^L([0-9]|1[0-1])(\.[1-9][0-9]*)*$/;

export const SlugSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(
    SLUG_REGEX,
    "El identificador debe usar solo minúsculas, números y guiones internos (sin puntos)."
  );

export const NodeCodeSchema = z
  .string()
  .regex(NODE_CODE_REGEX, "Código ontológico inválido (ej. L0, L0.1, L4.2.1).");

export const PhysicalQuantitySchema = z.enum([
  "electric",
  "magnetic",
  "thermal",
  "mechanical",
  "signal",
]);

export const StageNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export type StageNumber = z.infer<typeof StageNumberSchema>;

export const N6_STAGE_NAMES: Record<StageNumber, string> = {
  1: "Lo que ya sabes",
  2: "Algo no encaja",
  3: "Experimenta",
  4: "Constrúyela tú",
  5: "Ponle nombre",
  6: "Compáralo",
};

export const CanvasModeSchema = z.enum([
  "hidden",
  "laboratory",
  "reference",
  "mirror",
]);

const NonEmptyText = z.string().trim().min(1);

export const PredictionOptionSchema = z.object({
  id: SlugSchema,
  label: NonEmptyText,
  feedback: NonEmptyText,
  is_correct: z.boolean(),
});

export const PredictionGateSchema = z
  .object({
    prompt: NonEmptyText,
    options: z.array(PredictionOptionSchema).min(2),
  })
  .refine(
    (gate) => gate.options.filter((o) => o.is_correct).length === 1,
    "La compuerta de predicción debe tener exactamente una opción causal correcta."
  )
  .refine(
    (gate) =>
      new Set(gate.options.map((o) => o.id)).size === gate.options.length,
    "Los identificadores de opciones de predicción no pueden repetirse."
  );

export const NoteGateSchema = z.object({
  prompt: NonEmptyText,
  min_chars: z.number().int().min(20).max(600).default(40),
});

export const SceneBlockSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("prose"),
    body: NonEmptyText,
  }),
  z.object({
    kind: z.literal("formula"),
    tex: NonEmptyText,
    label: z.string().trim().min(1).optional(),
    caption: z.string().trim().min(1).optional(),
    quantity: PhysicalQuantitySchema.optional(),
  }),
  z.object({
    kind: z.literal("simulator"),
    simulator_key: SlugSchema,
    instruction: z.string().trim().min(1).optional(),
    caption: z.string().trim().min(1).optional(),
  }),
  z.object({
    kind: z.literal("contrast_mirror"),
    dimension: NonEmptyText,
    left_label: NonEmptyText,
    right_label: NonEmptyText,
    rows: z
      .array(
        z.object({
          aspect: NonEmptyText,
          left: NonEmptyText,
          right: NonEmptyText,
        })
      )
      .min(1),
  }),
]);

export type SceneBlock = z.infer<typeof SceneBlockSchema>;

export const SceneSchema = z.object({
  scene_id: SlugSchema,
  dominant_idea: NonEmptyText,
  canvas_mode: CanvasModeSchema.default("hidden"),
  blocks: z.array(SceneBlockSchema).min(1),
  prediction_gate: PredictionGateSchema.optional(),
  note_gate: NoteGateSchema.optional(),
});

export type SceneDefinition = z.infer<typeof SceneSchema>;

export const N6StageSchema = z.object({
  stage: StageNumberSchema,
  scenes: z.array(SceneSchema).min(1),
});

export type N6StageDefinition = z.infer<typeof N6StageSchema>;

function collectAllSceneIds(data: {
  preview_scenes?: SceneDefinition[];
  living_synthesis_scenes?: SceneDefinition[];
  n6_stages?: N6StageDefinition[];
}): string[] {
  const ids: string[] = [];
  for (const s of data.preview_scenes ?? []) ids.push(s.scene_id);
  for (const st of data.n6_stages ?? []) {
    for (const s of st.scenes) ids.push(s.scene_id);
  }
  for (const s of data.living_synthesis_scenes ?? []) ids.push(s.scene_id);
  return ids;
}

export const NodeContentJsonSchema = z
  .discriminatedUnion("state", [
    z.object({
      state: z.literal("in_preparation"),
      preview_scenes: z.array(SceneSchema).default([]),
      living_synthesis_scenes: z.array(SceneSchema).default([]),
      n6_stages: z.array(N6StageSchema).optional(),
    }),
    z.object({
      state: z.literal("ready"),
      preview_scenes: z.array(SceneSchema).default([]),
      living_synthesis_scenes: z.array(SceneSchema).default([]),
      n6_stages: z.array(N6StageSchema).length(6).optional(),
    }),
  ])
  .superRefine((val, ctx) => {
    const allIds = collectAllSceneIds(val);
    const seen = new Set<string>();
    for (const id of allIds) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `scene_id duplicado dentro del mismo nodo: "${id}"`,
        });
      }
      seen.add(id);
    }

    if (val.state === "ready") {
      const hasN6 = Boolean(val.n6_stages && val.n6_stages.length === 6);
      const hasHolonic =
        val.preview_scenes.length > 0 && val.living_synthesis_scenes.length > 0;

      if (!hasN6 && !hasHolonic) {
        ctx.addIssue({
          code: "custom",
          message:
            'Un nodo en estado "ready" requiere un ciclo N-6 completo o el par Previsualización + Síntesis Viva.',
        });
      }

      if (val.n6_stages) {
        const stageNumbers = val.n6_stages.map((s) => s.stage);
        const expected = [1, 2, 3, 4, 5, 6];
        if (stageNumbers.join(",") !== expected.join(",")) {
          ctx.addIssue({
            code: "custom",
            message: "Las etapas N-6 deben estar ordenadas estrictamente de 1 a 6.",
          });
        }

        const stage3 = val.n6_stages.find((s) => s.stage === 3);
        if (!stage3?.scenes.some((sc) => Boolean(sc.prediction_gate))) {
          ctx.addIssue({
            code: "custom",
            message:
              "La Etapa 3 (Experimenta) exige al menos una compuerta de predicción causal.",
          });
        }

        const stage4 = val.n6_stages.find((s) => s.stage === 4);
        if (!stage4?.scenes.some((sc) => Boolean(sc.note_gate))) {
          ctx.addIssue({
            code: "custom",
            message:
              "La Etapa 4 (Constrúyela tú) exige al menos una compuerta de nota propia.",
          });
        }
      }

      if (
        val.living_synthesis_scenes.length > 0 &&
        !val.living_synthesis_scenes.some((sc) => Boolean(sc.note_gate))
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "La Síntesis Viva exige al menos una escena con compuerta integradora de nota propia.",
        });
      }
    }
  });

export type NodeContentJson = z.infer<typeof NodeContentJsonSchema>;

export const ConceptNodeRecordSchema = z.object({
  id: z.string().uuid(),
  home_layer_id: z.string().uuid(),
  code: NodeCodeSchema,
  slug: SlugSchema,
  title: NonEmptyText,
  is_layer_root: z.boolean().default(false),
  status: z.enum(["calibration", "draft", "published", "archived"]),
  primary_quantity: PhysicalQuantitySchema.nullable().default(null),
  simulator_key: SlugSchema.nullable().default(null),
  forbidden_terms: z.array(NonEmptyText).default([]),
  content_json: NodeContentJsonSchema,
  schema_version: z.number().int().min(1).default(2),
  content_revision: z.number().int().min(1).default(1),
});

export type ConceptNodeRecord = z.infer<typeof ConceptNodeRecordSchema>;

export const CompositionEdgeSchema = z
  .object({
    parent_id: z.string().uuid(),
    child_id: z.string().uuid(),
    role_in_parent: NonEmptyText,
    integration_note: z.string().default(""),
    group_label: z.string().trim().min(1).nullable().default(null),
    structural_order: z.number().int().min(1),
    discovery_order: z.number().int().min(1),
    added_in_parent_revision: z.number().int().min(1).default(1),
  })
  .refine(
    (edge) => edge.parent_id !== edge.child_id,
    "Un nodo no puede componerse de sí mismo."
  );

export type CompositionEdge = z.infer<typeof CompositionEdgeSchema>;

export const SemanticRelationSchema = z
  .object({
    from_id: z.string().uuid(),
    to_id: z.string().uuid(),
    kind: z.enum(["prerequisite", "contrast", "recall_bridge"]),
    strength: z.enum(["required", "recommended"]).nullable().default(null),
    context_note: z.string().trim().min(1).nullable().default(null),
  })
  .refine(
    (rel) => rel.from_id !== rel.to_id,
    "Una relación semántica no puede apuntar al mismo nodo."
  )
  .refine(
    (rel) =>
      (rel.kind === "prerequisite" &&
        (rel.strength === "required" || rel.strength === "recommended")) ||
      (rel.kind !== "prerequisite" && rel.strength === null),
    "strength es obligatorio en prerequisite y debe ser null en contrast y recall_bridge."
  );

export type SemanticRelation = z.infer<typeof SemanticRelationSchema>;

export const UserNodeNoteSchema = z
  .object({
    node_id: z.string().uuid(),
    note_kind: z.enum(["mental_image", "living_synthesis"]),
    stage_number: z.number().int().nullable(),
    scene_id: SlugSchema,
    node_revision: z.number().int().min(1),
    body: NonEmptyText,
  })
  .refine(
    (n) =>
      (n.note_kind === "mental_image" && n.stage_number === 4) ||
      (n.note_kind === "living_synthesis" && n.stage_number === null),
    "mental_image requiere stage_number = 4; living_synthesis requiere stage_number = null."
  );
