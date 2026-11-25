import { describe, expect, it } from "vitest";
import { resolveAssetUrl } from "@/lib/assets/resolve-asset";

describe("Asset URL Resolver (R2 Readiness & Path Safety)", () => {
  it("resolves clean relative keys to local /assets/ fallback when base URL is empty", () => {
    expect(resolveAssetUrl("l7/alternador/rotor-saliente.glb", "")).toBe(
      "/assets/l7/alternador/rotor-saliente.glb"
    );
  });

  it("resolves against NEXT_PUBLIC_ASSET_BASE_URL trimming trailing slashes", () => {
    expect(
      resolveAssetUrl(
        "l4/motor/piston.glb",
        "https://cdn.academia-atomica.dev/"
      )
    ).toBe("https://cdn.academia-atomica.dev/l4/motor/piston.glb");
  });

  it("rejects path traversal, backslashes, leading slashes, and injected schemes", () => {
    expect(() => resolveAssetUrl("../secret.glb", "")).toThrow();
    expect(() => resolveAssetUrl("l7\\rotor.glb", "")).toThrow();
    expect(() => resolveAssetUrl("/l7/rotor.glb", "")).toThrow();
    expect(() => resolveAssetUrl("https://evil.example/x.glb", "")).toThrow();
    expect(() => resolveAssetUrl("", "")).toThrow();
  });
});
