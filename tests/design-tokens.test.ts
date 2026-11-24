import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatOklch,
  INK_TOKENS,
  PHYSICAL_TOKEN_LIST,
  SURFACE_TOKENS,
  type ThemeMode,
} from "@/lib/design/tokens";
import {
  contrastHexOnHex,
  contrastOklchOnHex,
  isWithinSrgbGamut,
} from "@/lib/design/contrast";

const THEMES: ThemeMode[] = ["dark-lab", "light-editorial"];

describe("Design Tokens — Zero-Trust Optical & WCAG Calibration", () => {
  it("never uses pure black (#000000) in any surface token (optical halation prevention)", () => {
    for (const surface of SURFACE_TOKENS) {
      for (const theme of THEMES) {
        expect(surface.hex[theme].toUpperCase()).not.toBe("#000000");
      }
    }
  });

  it("ensures every OKLCH physical token stays inside sRGB gamut for crisp rendering", () => {
    for (const token of PHYSICAL_TOKEN_LIST) {
      for (const theme of THEMES) {
        expect(
          isWithinSrgbGamut(token.oklch[theme].trace),
          `${token.key}.trace (${theme}) out of sRGB gamut`
        ).toBe(true);
        expect(
          isWithinSrgbGamut(token.oklch[theme].ink),
          `${token.key}.ink (${theme}) out of sRGB gamut`
        ).toBe(true);
      }
    }
  });

  it("maintains strict perceptual lightness uniformity across all 5 traces in Dark Lab", () => {
    const lightnesses = PHYSICAL_TOKEN_LIST.map(
      (t) => t.oklch["dark-lab"].trace.l
    );
    const spread = Math.max(...lightnesses) - Math.min(...lightnesses);
    expect(spread).toBeLessThanOrEqual(0.05);
  });

  it("passes WCAG 2.1 AA (>= 4.5:1) for all primary, secondary, and muted inks on Canvas, Panel, and Elevated", () => {
    const surfaces = SURFACE_TOKENS.filter((s) =>
      ["--bg-canvas", "--bg-panel", "--bg-elevated"].includes(s.token)
    );

    for (const theme of THEMES) {
      for (const ink of INK_TOKENS) {
        for (const surface of surfaces) {
          const ratio = contrastHexOnHex(ink.hex[theme], surface.hex[theme]);
          expect(
            ratio,
            `${ink.token} on ${surface.token} (${theme}) = ${ratio.toFixed(2)}:1`
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("passes WCAG 2.1 AA (>= 4.5:1) for ALL physical ink tokens (including thermal) on Canvas, Panel, and Elevated in both themes", () => {
    const surfaces = SURFACE_TOKENS.filter((s) =>
      ["--bg-canvas", "--bg-panel", "--bg-elevated"].includes(s.token)
    );

    for (const theme of THEMES) {
      for (const phys of PHYSICAL_TOKEN_LIST) {
        for (const surface of surfaces) {
          const ratio = contrastOklchOnHex(
            phys.oklch[theme].ink,
            surface.hex[theme]
          );
          expect(
            ratio,
            `phys.${phys.key}.ink on ${surface.token} (${theme}) = ${ratio.toFixed(2)}:1`
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("passes WCAG 2.1 Non-Text Graphical Contrast (>= 3.0:1) for ALL physical traces on Canvas, Panel, Recessed, and Elevated", () => {
    const surfaces = SURFACE_TOKENS.filter((s) =>
      ["--bg-canvas", "--bg-panel", "--bg-elevated", "--bg-recessed"].includes(
        s.token
      )
    );

    for (const theme of THEMES) {
      for (const phys of PHYSICAL_TOKEN_LIST) {
        for (const surface of surfaces) {
          const ratio = contrastOklchOnHex(
            phys.oklch[theme].trace,
            surface.hex[theme]
          );
          expect(
            ratio,
            `phys.${phys.key}.trace on ${surface.token} (${theme}) = ${ratio.toFixed(2)}:1`
          ).toBeGreaterThanOrEqual(3.0);
        }
      }
    }
  });

  it("maintains strict 1:1 parity between tokens.css and tokens.ts", () => {
    const css = fs.readFileSync(
      path.resolve(import.meta.dirname, "../src/styles/tokens.css"),
      "utf8"
    );
    for (const phys of PHYSICAL_TOKEN_LIST) {
      for (const theme of THEMES) {
        expect(css).toContain(formatOklch(phys.oklch[theme].trace));
        expect(css).toContain(formatOklch(phys.oklch[theme].ink));
      }
    }
  });
});
