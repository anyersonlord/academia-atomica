import {
  SLUG_REGEX,
  type NodeContentJson,
  type SceneDefinition,
} from "@/lib/schemas/node";

export type InlineMarkerKind = "term" | "recall" | "sim";

export interface ExtractedMarker {
  kind: InlineMarkerKind;
  key: string;
  visibleLabel: string | null;
  scene_id: string;
  location: string;
}

export interface ReferentialCatalogs {
  glossarySlugs: ReadonlySet<string>;
  nodeSlugs: ReadonlySet<string>;
  simulatorKeys: ReadonlySet<string>;
}

export interface ReferentialViolation {
  kind: InlineMarkerKind | "simulator_block";
  key: string;
  scene_id: string;
  location: string;
  reason: "invalid_syntax" | "missing_target";
}

export interface ForbiddenTermViolation {
  stage: 1 | 2 | 3 | 4 | "preview";
  scene_id: string;
  field: string;
  term: string;
}

const ENYE_SENTINEL = "\uE000";

/**
 * Normaliza texto en español a minúsculas eliminando tildes/diéresis (á->a, ü->u),
 * pero preservando estrictamente la letra 'ñ' como distinta de 'n'.
 */
export function normalizeSpanishPreservingEnye(input: string): string {
  return input
    .normalize("NFC")
    .toLowerCase()
    .replace(/ñ/g, ENYE_SENTINEL)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(new RegExp(ENYE_SENTINEL, "g"), "ñ")
    .normalize("NFC");
}

function escapeRegexLiteral(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Excluye las claves internas de {{term:slug}}, {{recall:slug}} y {{sim:key}}
 * antes de analizar el texto visible, conservando únicamente una etiqueta visible
 * explícita si se escribió como {{term:slug|etiqueta visible}}.
 */
export function stripInternalMarkerKeys(text: string): string {
  return text.replace(
    /\{\{(?:term|recall|sim):([^|}]+)(?:\|([^}]+))?\}\}/g,
    (_full, _key: string, visibleLabel?: string) => {
      if (visibleLabel && visibleLabel.trim().length > 0) {
        return ` ${visibleLabel} `;
      }
      return " ";
    }
  );
}

function collectVisibleSceneTexts(
  scene: SceneDefinition
): Array<{ field: string; text: string }> {
  const items: Array<{ field: string; text: string }> = [
    { field: "dominant_idea", text: scene.dominant_idea },
  ];

  scene.blocks.forEach((block, idx) => {
    if (block.kind === "prose") {
      items.push({ field: `blocks[${idx}].body`, text: block.body });
    } else if (block.kind === "formula") {
      if (block.label) {
        items.push({ field: `blocks[${idx}].label`, text: block.label });
      }
      if (block.caption) {
        items.push({ field: `blocks[${idx}].caption`, text: block.caption });
      }
    } else if (block.kind === "simulator") {
      if (block.instruction) {
        items.push({
          field: `blocks[${idx}].instruction`,
          text: block.instruction,
        });
      }
      if (block.caption) {
        items.push({ field: `blocks[${idx}].caption`, text: block.caption });
      }
    } else if (block.kind === "contrast_mirror") {
      items.push(
        { field: `blocks[${idx}].dimension`, text: block.dimension },
        { field: `blocks[${idx}].left_label`, text: block.left_label },
        { field: `blocks[${idx}].right_label`, text: block.right_label }
      );
      block.rows.forEach((row, rIdx) => {
        items.push(
          { field: `blocks[${idx}].rows[${rIdx}].aspect`, text: row.aspect },
          { field: `blocks[${idx}].rows[${rIdx}].left`, text: row.left },
          { field: `blocks[${idx}].rows[${rIdx}].right`, text: row.right }
        );
      });
    }
  });

  if (scene.prediction_gate) {
    items.push({
      field: "prediction_gate.prompt",
      text: scene.prediction_gate.prompt,
    });
    scene.prediction_gate.options.forEach((opt, oIdx) => {
      items.push(
        {
          field: `prediction_gate.options[${oIdx}].label`,
          text: opt.label,
        },
        {
          field: `prediction_gate.options[${oIdx}].feedback`,
          text: opt.feedback,
        }
      );
    });
  }

  if (scene.note_gate) {
    items.push({ field: "note_gate.prompt", text: scene.note_gate.prompt });
  }

  return items;
}

/**
 * Valida que ningún término técnico prohibido del nodo aparezca en Previsualización
 * ni en las Etapas 1–4 antes de la Etapa 5 ("Ponle nombre").
 * Usa bordes Unicode de palabra/frase completa, escapa metacaracteres y normaliza tildes preservando la ñ.
 */
export function validateForbiddenTermsBeforeStage5(
  content: NodeContentJson,
  forbiddenTerms: readonly string[]
): { valid: boolean; violations: ForbiddenTermViolation[] } {
  const cleanTerms = forbiddenTerms
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (cleanTerms.length === 0) {
    return { valid: true, violations: [] };
  }

  const compiledTerms = cleanTerms.map((rawTerm) => {
    const normalized = normalizeSpanishPreservingEnye(rawTerm);
    const escaped = normalized
      .split(/\s+/)
      .map(escapeRegexLiteral)
      .join("\\s+");
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,
      "u"
    );
    return { rawTerm, regex };
  });

  const violations: ForbiddenTermViolation[] = [];

  const inspectScene = (
    scene: SceneDefinition,
    stageTag: 1 | 2 | 3 | 4 | "preview"
  ) => {
    const texts = collectVisibleSceneTexts(scene);
    for (const { field, text } of texts) {
      const visibleOnly = stripInternalMarkerKeys(text);
      const normalizedText = normalizeSpanishPreservingEnye(visibleOnly);
      for (const { rawTerm, regex } of compiledTerms) {
        if (regex.test(normalizedText)) {
          violations.push({
            stage: stageTag,
            scene_id: scene.scene_id,
            field,
            term: rawTerm,
          });
        }
      }
    }
  };

  for (const scene of content.preview_scenes ?? []) {
    inspectScene(scene, "preview");
  }

  for (const st of content.n6_stages ?? []) {
    if (st.stage === 1 || st.stage === 2 || st.stage === 3 || st.stage === 4) {
      for (const scene of st.scenes) {
        inspectScene(scene, st.stage);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

const MARKER_SCAN_REGEX =
  /\{\{(term|recall|sim):([^|}]+)(?:\|([^}]+))?\}\}/g;

export function extractInlineMarkersFromScene(
  scene: SceneDefinition
): ExtractedMarker[] {
  const found: ExtractedMarker[] = [];
  const texts = collectVisibleSceneTexts(scene);

  for (const { field, text } of texts) {
    for (const match of text.matchAll(MARKER_SCAN_REGEX)) {
      const kind = match[1] as InlineMarkerKind;
      const key = (match[2] ?? "").trim();
      const visibleLabel = match[3] ? match[3].trim() : null;
      found.push({
        kind,
        key,
        visibleLabel,
        scene_id: scene.scene_id,
        location: field,
      });
    }
  }

  return found;
}

/**
 * Valida la integridad referencial de todos los marcadores {{term:slug}},
 * {{recall:slug}}, {{sim:key}} y bloques simulator_key de un nodo.
 */
export function validateNodeReferences(
  content: NodeContentJson,
  catalogs: ReferentialCatalogs,
  selfSlug?: string
): { valid: boolean; violations: ReferentialViolation[] } {
  const violations: ReferentialViolation[] = [];

  const allScenes: SceneDefinition[] = [
    ...(content.preview_scenes ?? []),
    ...(content.n6_stages?.flatMap((s) => s.scenes) ?? []),
    ...(content.living_synthesis_scenes ?? []),
  ];

  for (const scene of allScenes) {
    // 1. Marcadores inline
    const markers = extractInlineMarkersFromScene(scene);
    for (const m of markers) {
      if (!SLUG_REGEX.test(m.key)) {
        violations.push({
          kind: m.kind,
          key: m.key,
          scene_id: m.scene_id,
          location: m.location,
          reason: "invalid_syntax",
        });
        continue;
      }

      if (m.kind === "term" && !catalogs.glossarySlugs.has(m.key)) {
        violations.push({
          kind: "term",
          key: m.key,
          scene_id: m.scene_id,
          location: m.location,
          reason: "missing_target",
        });
      } else if (
        m.kind === "recall" &&
        (!catalogs.nodeSlugs.has(m.key) || (selfSlug && m.key === selfSlug))
      ) {
        violations.push({
          kind: "recall",
          key: m.key,
          scene_id: m.scene_id,
          location: m.location,
          reason: "missing_target",
        });
      } else if (m.kind === "sim" && !catalogs.simulatorKeys.has(m.key)) {
        violations.push({
          kind: "sim",
          key: m.key,
          scene_id: m.scene_id,
          location: m.location,
          reason: "missing_target",
        });
      }
    }

    // 2. Bloques explícitos de simulador
    scene.blocks.forEach((block, idx) => {
      if (block.kind === "simulator") {
        if (!SLUG_REGEX.test(block.simulator_key)) {
          violations.push({
            kind: "simulator_block",
            key: block.simulator_key,
            scene_id: scene.scene_id,
            location: `blocks[${idx}].simulator_key`,
            reason: "invalid_syntax",
          });
        } else if (!catalogs.simulatorKeys.has(block.simulator_key)) {
          violations.push({
            kind: "simulator_block",
            key: block.simulator_key,
            scene_id: scene.scene_id,
            location: `blocks[${idx}].simulator_key`,
            reason: "missing_target",
          });
        }
      }
    });
  }

  return { valid: violations.length === 0, violations };
}
