export type ThemeMode = "dark-lab" | "light-editorial";

export type PhysicalQuantityKey =
  | "electric"
  | "magnetic"
  | "thermal"
  | "mechanical"
  | "signal";

export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

export interface PhysicalTokenSpec {
  key: PhysicalQuantityKey;
  label: string;
  shortLabel: string;
  symbol: string;
  siUnits: string;
  scopeNote: string;
  reservedFromLayer?: string;
  lineStyle: "solid" | "field-dashed" | "thermal-envelope" | "vector-arrow" | "pulse-step";
  cssVarTrace: string;
  cssVarInk: string;
  cssVarSurface: string;
  cssVarBorder: string;
  oklch: Record<ThemeMode, { trace: OklchColor; ink: OklchColor }>;
}

export interface SurfaceTokenSpec {
  token: string;
  role: string;
  purpose: string;
  hex: Record<ThemeMode, string>;
}

export function formatOklch({ l, c, h }: OklchColor): string {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

export const SURFACE_TOKENS: readonly SurfaceTokenSpec[] = [
  {
    token: "--bg-canvas",
    role: "Base Canvas",
    purpose: "Fondo principal calibrado sin negro puro ni halación óptica",
    hex: { "dark-lab": "#0A0C10", "light-editorial": "#F8F9FA" },
  },
  {
    token: "--bg-panel",
    role: "Panel Estructural",
    purpose: "Navegación lateral, encabezados y contenedores de instrumento",
    hex: { "dark-lab": "#11141B", "light-editorial": "#F1F3F6" },
  },
  {
    token: "--bg-elevated",
    role: "Superficie Elevada",
    purpose: "Popovers del Glosario Vivo, bloques KaTeX y controles activos",
    hex: { "dark-lab": "#171B24", "light-editorial": "#FFFFFF" },
  },
  {
    token: "--bg-recessed",
    role: "Pozo de Instrumentación",
    purpose: "Plano de osciloscopio y lienzos físicos de alta lectura",
    hex: { "dark-lab": "#07090D", "light-editorial": "#EDF0F4" },
  },
  {
    token: "--bg-interactive",
    role: "Estado Interactivo",
    purpose: "Realimentación táctil sutil de hover/selección",
    hex: { "dark-lab": "#1E2430", "light-editorial": "#E6EBF1" },
  },
] as const;

export const INK_TOKENS: readonly SurfaceTokenSpec[] = [
  {
    token: "--ink-primary",
    role: "Tinta Primaria",
    purpose: "Prosa socrática 65–70ch y ecuaciones sin deslumbramiento",
    hex: { "dark-lab": "#EAECEF", "light-editorial": "#11151E" },
  },
  {
    token: "--ink-secondary",
    role: "Tinta Secundaria",
    purpose: "Subtítulos técnicos, unidades y etiquetas de control",
    hex: { "dark-lab": "#9BA3B4", "light-editorial": "#475162" },
  },
  {
    token: "--ink-muted",
    role: "Tinta Atenuada",
    purpose: "Metadatos, índices de capa y marcas de lectura WCAG AA",
    hex: { "dark-lab": "#7F889C", "light-editorial": "#5B6578" },
  },
] as const;

export const PHYSICAL_TOKENS: Record<PhysicalQuantityKey, PhysicalTokenSpec> = {
  electric: {
    key: "electric",
    label: "Carga / Electricidad",
    shortLabel: "Eléctrica",
    symbol: "q, V, I",
    siUnits: "C · V · A",
    scopeNote: "Flujo de carga, potencial eléctrico, corriente y ondas AC/DC",
    lineStyle: "solid",
    cssVarTrace: "--phys-electric",
    cssVarInk: "--phys-electric-ink",
    cssVarSurface: "--phys-electric-surface",
    cssVarBorder: "--phys-electric-border",
    oklch: {
      "dark-lab": {
        trace: { l: 0.77, c: 0.132, h: 222 },
        ink: { l: 0.83, c: 0.112, h: 222 },
      },
      "light-editorial": {
        trace: { l: 0.55, c: 0.118, h: 235 },
        ink: { l: 0.44, c: 0.096, h: 235 },
      },
    },
  },
  magnetic: {
    key: "magnetic",
    label: "Campo Magnético",
    shortLabel: "Magnética",
    symbol: "B, Φ",
    siUnits: "T · Wb",
    scopeNote: "Líneas de flujo, dominios ferromagnéticos e inducción de Faraday",
    lineStyle: "field-dashed",
    cssVarTrace: "--phys-magnetic",
    cssVarInk: "--phys-magnetic-ink",
    cssVarSurface: "--phys-magnetic-surface",
    cssVarBorder: "--phys-magnetic-border",
    oklch: {
      "dark-lab": {
        trace: { l: 0.75, c: 0.138, h: 292 },
        ink: { l: 0.82, c: 0.096, h: 292 },
      },
      "light-editorial": {
        trace: { l: 0.53, c: 0.175, h: 288 },
        ink: { l: 0.43, c: 0.16, h: 288 },
      },
    },
  },
  thermal: {
    key: "thermal",
    label: "Energía Térmica / Química",
    shortLabel: "Térmica",
    symbol: "Q, T, ΔH",
    siUnits: "J · K · °C",
    scopeNote: "Enlaces combustibles, entalpía, combustión y disipación térmica",
    lineStyle: "thermal-envelope",
    cssVarTrace: "--phys-thermal",
    cssVarInk: "--phys-thermal-ink",
    cssVarSurface: "--phys-thermal-surface",
    cssVarBorder: "--phys-thermal-border",
    oklch: {
      "dark-lab": {
        trace: { l: 0.78, c: 0.148, h: 68 },
        ink: { l: 0.84, c: 0.122, h: 70 },
      },
      "light-editorial": {
        trace: { l: 0.6, c: 0.144, h: 58 },
        ink: { l: 0.45, c: 0.122, h: 52 },
      },
    },
  },
  mechanical: {
    key: "mechanical",
    label: "Fuerza / Torque Mecánico",
    shortLabel: "Mecánica",
    symbol: "F, τ, ω",
    siUnits: "N · N·m · rad/s",
    scopeNote: "Presión en pistón, par motor, inercia rotacional y contrapar",
    lineStyle: "vector-arrow",
    cssVarTrace: "--phys-mechanical",
    cssVarInk: "--phys-mechanical-ink",
    cssVarSurface: "--phys-mechanical-surface",
    cssVarBorder: "--phys-mechanical-border",
    oklch: {
      "dark-lab": {
        trace: { l: 0.77, c: 0.135, h: 162 },
        ink: { l: 0.83, c: 0.112, h: 162 },
      },
      "light-editorial": {
        trace: { l: 0.54, c: 0.12, h: 162 },
        ink: { l: 0.43, c: 0.098, h: 162 },
      },
    },
  },
  signal: {
    key: "signal",
    label: "Señal / Control",
    shortLabel: "Control",
    symbol: "u(t), e(t)",
    siUnits: "PWM · CAN · Hz",
    scopeNote: "Token reservado para regulación AVR, gobernador y telemetría",
    reservedFromLayer: "L8",
    lineStyle: "pulse-step",
    cssVarTrace: "--phys-signal",
    cssVarInk: "--phys-signal-ink",
    cssVarSurface: "--phys-signal-surface",
    cssVarBorder: "--phys-signal-border",
    oklch: {
      "dark-lab": {
        trace: { l: 0.75, c: 0.148, h: 350 },
        ink: { l: 0.82, c: 0.118, h: 350 },
      },
      "light-editorial": {
        trace: { l: 0.55, c: 0.17, h: 350 },
        ink: { l: 0.44, c: 0.15, h: 350 },
      },
    },
  },
};

export const PHYSICAL_TOKEN_LIST: readonly PhysicalTokenSpec[] = [
  PHYSICAL_TOKENS.electric,
  PHYSICAL_TOKENS.magnetic,
  PHYSICAL_TOKENS.thermal,
  PHYSICAL_TOKENS.mechanical,
  PHYSICAL_TOKENS.signal,
];
