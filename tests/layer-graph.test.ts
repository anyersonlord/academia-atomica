import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_LAYER_CODES,
  CAUSAL_LAYER_EDGES,
  CAUSAL_LAYER_TOPOLOGY,
  collectTopologyCodes,
  isLayerGraphAcyclic,
} from "@/lib/ontology/layer-graph";

describe("Causal Layer Topology — Integrity & Parity", () => {
  it("contains every layer L0–L11 exactly once with no gaps or duplicates", () => {
    const collected = collectTopologyCodes();
    expect(collected).toHaveLength(12);
    expect(new Set(collected).size).toBe(12);
    expect([...collected].sort()).toEqual([...ALL_LAYER_CODES].sort());
  });

  it("forms a strictly acyclic directed graph (DAG)", () => {
    expect(isLayerGraphAcyclic()).toBe(true);
    // Verificar que una arista inversa L7 -> L1 sería detectada como ciclo
    expect(
      isLayerGraphAcyclic(ALL_LAYER_CODES, [
        ...CAUSAL_LAYER_EDGES,
        { from: "L7", to: "L1" },
      ])
    ).toBe(false);
  });

  it("models the exact bifurcation at L1 and convergence into L7", () => {
    const fromL1 = CAUSAL_LAYER_EDGES.filter((e) => e.from === "L1").map(
      (e) => e.to
    );
    expect(fromL1).toEqual(["L2", "L5"]);

    const intoL7 = CAUSAL_LAYER_EDGES.filter((e) => e.to === "L7").map(
      (e) => e.from
    );
    expect(intoL7).toEqual(["L4", "L6"]);

    expect(CAUSAL_LAYER_TOPOLOGY.branches[0].layers).toEqual([
      "L2",
      "L3",
      "L4",
    ]);
    expect(CAUSAL_LAYER_TOPOLOGY.branches[1].layers).toEqual(["L5", "L6"]);
  });

  it("matches every layer code seeded in scripts/db-seed-layers.ts", () => {
    const seedSrc = fs.readFileSync(
      path.resolve(import.meta.dirname, "../scripts/db-seed-layers.ts"),
      "utf8"
    );
    for (const code of ALL_LAYER_CODES) {
      expect(seedSrc).toContain(`code: "${code}"`);
    }
  });
});
