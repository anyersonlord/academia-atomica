import { describe, expect, it } from "vitest";
import {
  MAX_VIA_DEPTH,
  buildNodeHref,
  isValidNodeSlug,
  popViaParent,
  pushViaContext,
  sanitizeViaChain,
} from "@/lib/engine/via-path";

describe("Depth Compass (?via=) Sanitization & Loop Collapsing", () => {
  it("accepts only strict kebab-case slugs without dots", () => {
    expect(isValidNodeSlug("capa-l0")).toBe(true);
    expect(isValidNodeSlug("valvula-antirretorno-2")).toBe(true);

    expect(isValidNodeSlug("capa.l0")).toBe(false);
    expect(isValidNodeSlug("Capa-L0")).toBe(false);
    expect(isValidNodeSlug("-capa-l0")).toBe(false);
    expect(isValidNodeSlug("capa--l0")).toBe(false);
    expect(isValidNodeSlug("")).toBe(false);
  });

  it("silently strips malformed slugs and collapses internal loops", () => {
    const clean = sanitizeViaChain(
      "capa-l4.BAD_SLUG.sistema-combustible.bomba-cebado.sistema-combustible.filtro-primario",
      "valvula-antirretorno"
    );

    expect(clean).toEqual([
      "capa-l4",
      "sistema-combustible",
      "filtro-primario",
    ]);
  });

  it("truncates ancestor chain if currentSlug already appears inside via", () => {
    const clean = sanitizeViaChain(
      "capa-l4.sistema-combustible.bomba-cebado",
      "sistema-combustible"
    );
    expect(clean).toEqual(["capa-l4"]);
  });

  it("caps via depth at MAX_VIA_DEPTH preserving nearest context", () => {
    const deep = Array.from({ length: 24 }, (_, i) => `nodo-${i + 1}`);
    const clean = sanitizeViaChain(deep, "destino-final");
    expect(clean).toHaveLength(MAX_VIA_DEPTH);
    expect(clean[clean.length - 1]).toBe("nodo-24");
    expect(clean[0]).toBe(`nodo-${24 - MAX_VIA_DEPTH + 1}`);
  });

  it("pushes, pops, and builds canonical /nodo/[slug]?via= hrefs cleanly", () => {
    const nextVia = pushViaContext(
      ["capa-l4"],
      "sistema-combustible",
      "bomba-cebado"
    );
    expect(nextVia).toEqual(["capa-l4", "sistema-combustible"]);
    expect(buildNodeHref("bomba-cebado", nextVia)).toBe(
      "/nodo/bomba-cebado?via=capa-l4.sistema-combustible"
    );

    const parent = popViaParent(nextVia, "bomba-cebado");
    expect(parent).toEqual({
      parentSlug: "sistema-combustible",
      parentVia: ["capa-l4"],
      returnHref: "/nodo/sistema-combustible?via=capa-l4",
    });

    const rootParent = popViaParent(["capa-l4"], "sistema-combustible");
    expect(rootParent).toEqual({
      parentSlug: "capa-l4",
      parentVia: [],
      returnHref: "/nodo/capa-l4",
    });
  });
});
