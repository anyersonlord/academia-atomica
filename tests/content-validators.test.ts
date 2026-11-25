import { describe, expect, it } from "vitest";
import { NodeContentJsonSchema, type NodeContentJson } from "@/lib/schemas/node";
import {
  normalizeSpanishPreservingEnye,
  validateForbiddenTermsBeforeStage5,
  validateNodeReferences,
} from "@/lib/engine/content-validators";

function buildSampleReadyNode(stage2Prose: string, stage5Prose: string): NodeContentJson {
  return NodeContentJsonSchema.parse({
    state: "ready",
    preview_scenes: [],
    living_synthesis_scenes: [],
    n6_stages: [
      {
        stage: 1,
        scenes: [
          {
            scene_id: "s1-anclaje",
            dominant_idea: "Recordar qué ocurre al empujar una palanca.",
            blocks: [
              {
                kind: "prose",
                body: "Recuerda {{recall:fuerza-lineal}} y el término {{term:brazo-giro}}.",
              },
            ],
          },
        ],
      },
      {
        stage: 2,
        scenes: [
          {
            scene_id: "s2-fenomeno",
            dominant_idea: "Empujar lejos del eje gira más fácil que cerca.",
            blocks: [{ kind: "prose", body: stage2Prose }],
          },
        ],
      },
      {
        stage: 3,
        scenes: [
          {
            scene_id: "s3-experimento",
            dominant_idea: "Duplicar la distancia duplica el efecto de giro.",
            canvas_mode: "laboratory",
            blocks: [
              {
                kind: "simulator",
                simulator_key: "sim-par-basico",
                instruction: "Mueve el punto de apoyo para comparar ambos casos.",
              },
            ],
            prediction_gate: {
              prompt: "Si aplicas la misma fuerza al doble de distancia, ¿qué pasará?",
              options: [
                {
                  id: "opt-doble",
                  label: "El efecto de giro se duplica",
                  feedback: "Exacto: crece en proporción directa a la distancia.",
                  is_correct: true,
                },
                {
                  id: "opt-igual",
                  label: "Queda igual",
                  feedback: "Observa cómo cambia la palanca al alejar el empuje.",
                  is_correct: false,
                },
              ],
            },
          },
        ],
      },
      {
        stage: 4,
        scenes: [
          {
            scene_id: "s4-imagen",
            dominant_idea: "Sintetizar con tus palabras la combinación fuerza-distancia.",
            blocks: [
              {
                kind: "prose",
                body: "Describe la imagen mental que construiste antes de darle nombre.",
              },
            ],
            note_gate: {
              prompt: "Explica con tus palabras qué hace girar al eje con mayor facilidad.",
              min_chars: 40,
            },
          },
        ],
      },
      {
        stage: 5,
        scenes: [
          {
            scene_id: "s5-nombre",
            dominant_idea: "Bautizar formalmente la magnitud descubierta.",
            blocks: [{ kind: "prose", body: stage5Prose }],
          },
        ],
      },
      {
        stage: 6,
        scenes: [
          {
            scene_id: "s6-contraste",
            dominant_idea: "Distinguir empuje lineal frente a giro rotacional.",
            canvas_mode: "mirror",
            blocks: [
              {
                kind: "contrast_mirror",
                dimension: "Tipo de acción mecánica",
                left_label: "Fuerza lineal",
                right_label: "Par o torque",
                rows: [
                  {
                    aspect: "Efecto",
                    left: "Desplaza en línea recta",
                    right: "Produce rotación alrededor de un eje",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
}

describe("Spanish Lexical & Referential Content Validators", () => {
  it("normalizes Spanish accents while strictly preserving ñ distinct from n", () => {
    expect(normalizeSpanishPreservingEnye("Inducción Electromagnética")).toBe(
      "induccion electromagnetica"
    );
    expect(normalizeSpanishPreservingEnye("Cigüeñal y Cañón")).toBe(
      "cigueñal y cañon"
    );
    expect(normalizeSpanishPreservingEnye("cañón")).not.toBe(
      normalizeSpanishPreservingEnye("canon")
    );
  });

  it("does NOT false-positive on Spanish substrings ('par' in 'para', 'comparar', 'parte') nor inside internal marker keys", () => {
    const content = buildSampleReadyNode(
      "Esto sirve para comparar cada parte sin separar el mecanismo {{sim:sim-par-basico}}.",
      "En ingeniería llamamos par (o torque) a este efecto rotacional."
    );

    const res = validateForbiddenTermsBeforeStage5(content, ["par", "torque"]);
    expect(res.valid).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  it("catches forbidden terms in Stages 1–4 across case, missing accents, regex metacharacters, and visible marker labels", () => {
    const contentWithLeak = buildSampleReadyNode(
      "Aquí ocurre una induccion, un par neto, relación V/Hz y {{term:brazo-giro|torque oculto}}.",
      "En la Etapa 5 sí presentamos la inducción, el par, el torque y la relación V/Hz."
    );

    const res = validateForbiddenTermsBeforeStage5(contentWithLeak, [
      "inducción",
      "par",
      "torque",
      "V/Hz",
    ]);

    expect(res.valid).toBe(false);
    const caughtTerms = res.violations.map((v) => v.term);
    expect(caughtTerms).toEqual(["inducción", "par", "torque", "V/Hz"]);
  });

  it("preserves ñ distinction inside forbidden_terms ('cañón' does not flag 'canon')", () => {
    const content = buildSampleReadyNode(
      "El canon clásico del experimento se mantiene sencillo.",
      "Aquí nombramos el cañón de inyección."
    );
    const res = validateForbiddenTermsBeforeStage5(content, ["cañón"]);
    expect(res.valid).toBe(true);
  });

  it("validates referential integrity of {{term:}}, {{recall:}}, {{sim:}}, and simulator blocks", () => {
    const content = buildSampleReadyNode(
      "Observa el fenómeno físico.",
      "Ahora lo llamamos par motor."
    );

    const okRes = validateNodeReferences(
      content,
      {
        glossarySlugs: new Set(["brazo-giro"]),
        nodeSlugs: new Set(["fuerza-lineal"]),
        simulatorKeys: new Set(["sim-par-basico"]),
      },
      "par-motor"
    );
    expect(okRes.valid).toBe(true);

    const brokenRes = validateNodeReferences(
      content,
      {
        glossarySlugs: new Set(),
        nodeSlugs: new Set(),
        simulatorKeys: new Set(),
      },
      "par-motor"
    );
    expect(brokenRes.valid).toBe(false);
    expect(brokenRes.violations.map((v) => v.kind)).toEqual([
      "recall",
      "term",
      "simulator_block",
    ]);
  });

  it("rejects duplicate scene_id across stages in NodeContentJsonSchema", () => {
    const valid = buildSampleReadyNode("Texto limpio.", "Nombre oficial.");
    const stages = valid.n6_stages!;
    expect(() =>
      NodeContentJsonSchema.parse({
        ...valid,
        n6_stages: [
          stages[0],
          {
            stage: 2,
            scenes: [{ ...stages[1]!.scenes[0]!, scene_id: "s1-anclaje" }],
          },
          ...stages.slice(2),
        ],
      })
    ).toThrow(/scene_id duplicado/);
  });
});
