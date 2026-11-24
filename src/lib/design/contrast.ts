import type { OklchColor } from "./tokens";

export interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function srgbChannelToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgbChannel(c: number): number {
  const clamped = clamp01(c);
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

export function hexToLinearRgb(hex: string): LinearRgb {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) {
    throw new Error(`Color hex inválido: ${hex}`);
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  return {
    r: srgbChannelToLinear(r),
    g: srgbChannelToLinear(g),
    b: srgbChannelToLinear(b),
  };
}

/**
 * Conversión exacta OKLCH -> OKLab -> Linear sRGB (especificación Björn Ottosson).
 */
export function oklchToLinearRgb({ l, c, h }: OklchColor): LinearRgb {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return {
    r: clamp01(r),
    g: clamp01(g),
    b: clamp01(bl),
  };
}

export function oklchToHex(color: OklchColor): string {
  const lin = oklchToLinearRgb(color);
  const toByte = (v: number) =>
    Math.round(linearToSrgbChannel(v) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${toByte(lin.r)}${toByte(lin.g)}${toByte(lin.b)}`;
}

export function isWithinSrgbGamut(color: OklchColor): boolean {
  const hRad = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hRad);
  const b = color.c * Math.sin(hRad);

  const l_ = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = color.l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const eps = 0.005;
  return (
    r >= -eps &&
    r <= 1 + eps &&
    g >= -eps &&
    g <= 1 + eps &&
    bl >= -eps &&
    bl <= 1 + eps
  );
}

/** Luminancia relativa WCAG 2.1 */
export function relativeLuminance({ r, g, b }: LinearRgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG 2.1 (1.0 a 21.0) */
export function contrastRatio(a: LinearRgb, b: LinearRgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastOklchOnHex(fg: OklchColor, bgHex: string): number {
  return contrastRatio(oklchToLinearRgb(fg), hexToLinearRgb(bgHex));
}

export function contrastHexOnHex(fgHex: string, bgHex: string): number {
  return contrastRatio(hexToLinearRgb(fgHex), hexToLinearRgb(bgHex));
}

export function wcagGrade(ratio: number): "AAA" | "AA" | "AA-Large" | "Fail" {
  if (ratio >= 7.0) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3.0) return "AA-Large";
  return "Fail";
}
