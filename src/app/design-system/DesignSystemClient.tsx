"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Focus, Lock, Ruler, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MathFormula } from "@/components/ui/MathFormula";
import { PhysicalBadge } from "@/components/ui/PhysicalBadge";
import {
  GlossaryTerm,
  type GlossaryTermData,
} from "@/components/glossary/GlossaryTerm";
import { CalibrationOscilloscope } from "@/components/simulators/CalibrationOscilloscope";
import {
  formatOklch,
  INK_TOKENS,
  PHYSICAL_TOKEN_LIST,
  SURFACE_TOKENS,
} from "@/lib/design/tokens";
import {
  contrastHexOnHex,
  contrastOklchOnHex,
  oklchToHex,
  wcagGrade,
} from "@/lib/design/contrast";
import { cn } from "@/lib/utils";

const SPECIMEN_GLOSSARY: Record<string, GlossaryTermData> = {
  "flujo-magnetico": {
    slug: "flujo-magnetico",
    term: "flujo magnético",
    mentalImageShort:
      "Cantidad neta de líneas de campo magnético que atraviesan una superficie abierta, como lluvia cruzando el marco de una ventana.",
    technicalDefinition:
      "Integral de superficie de la densidad de campo magnético B sobre un área orientada: Φ = ∫ B · dA, medida en webers (Wb).",
    originAtomCode: "Espécimen · L5",
    physicalQuantity: "magnetic",
  },
  "contrapar-electromagnetico": {
    slug: "contrapar-electromagnetico",
    term: "contrapar electromagnético",
    mentalImageShort:
      "Freno invisible que siente el motor diésel en el eje en el instante exacto en que una carga eléctrica empieza a pedir corriente.",
    technicalDefinition:
      "Par resistente de origen Lorentz (Ley de Lenz) que se opone al giro del rotor proporcionalmente a la potencia activa demandada.",
    originAtomCode: "Espécimen · L5",
    physicalQuantity: "mechanical",
  },
};

export function DesignSystemClient() {
  const { theme } = useTheme();
  const [zenMode, setZenMode] = useState(false);
  const [showMeasureRuler, setShowMeasureRuler] = useState(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "z" || e.key === "Z") {
        setZenMode((prev) => !prev);
      }
      if (e.key === "Escape" && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zenMode]);

  const panelHex = theme === "dark-lab" ? "#11141B" : "#F1F3F6";
  const elevatedHex = theme === "dark-lab" ? "#171B24" : "#FFFFFF";

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--ink-primary)] transition-colors duration-200">
      {/* Barra superior minimalista de 48px */}
      <header className="sticky top-0 z-40 h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-[1220px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3 min-w-0">
            {!zenMode && (
              <Link
                href="/"
                className="focus-instrument inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-xs text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-panel)] hover:text-[var(--ink-primary)]"
              >
                <ArrowLeft className="h-3.5 w-3.5 stroke-[1.6]" />
                <span className="hidden sm:inline">Inicio</span>
              </Link>
            )}
            <span className="h-3.5 w-px bg-[var(--border-default)]" />
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-semibold tracking-tight text-[var(--ink-primary)]">
                Academia Atómica
              </span>
              <span className="text-xs text-[var(--ink-muted)]">/</span>
              <span className="tabular-readout hidden text-[11px] uppercase tracking-[0.07em] text-[var(--ink-secondary)] lg:inline">
                Compuerta Visual #1 · Design System
              </span>
              <span className="tabular-readout text-[11px] uppercase tracking-[0.07em] text-[var(--ink-secondary)] lg:hidden">
                Design System
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setZenMode((prev) => !prev)}
              aria-pressed={zenMode}
              className={cn(
                "focus-instrument inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium transition-colors",
                zenMode
                  ? "border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
                  : "border-[var(--border-default)] bg-[var(--bg-panel)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              )}
            >
              <Focus className="h-3.5 w-3.5 stroke-[1.6]" />
              <span>{zenMode ? "Salir de Zen" : "Modo Zen"}</span>
              <kbd className="tabular-readout ml-0.5 rounded border border-[var(--border-default)] px-1 text-[10px] text-[var(--ink-muted)]">
                Z
              </kbd>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1220px] px-5 py-12">
        {/* Encabezado editorial sobrio */}
        {!zenMode && (
          <section className="max-w-[72ch] border-b border-[var(--border-subtle)] pb-10">
            <div className="tabular-readout inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 stroke-[1.6]" />
              <span>Fase 1 · Hito 1.2 · Ergonomía Neuro-Visual</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[var(--ink-primary)]">
              Sistema de Design Tokens y Calibración Óptica
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-secondary)]">
              Espécimen vivo de validación antes de ensamblar el chasis del
              Workbench (Hito 1.3). La interfaz estructural es estrictamente
              monocromática por elevación de luminancia; el color vivo en
              espacio <span className="tabular-readout">OKLCH</span> está
              reservado en exclusiva a las cinco magnitudes físicas inmutables
              de <span className="tabular-readout">L0</span> a{" "}
              <span className="tabular-readout">L11</span>.
            </p>
          </section>
        )}

        {/* SECCIÓN 01: Elevación por Luminancia Escalonada */}
        {!zenMode && (
          <section className="border-b border-[var(--border-subtle)] py-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="tabular-readout text-[11px] uppercase tracking-[0.09em] text-[var(--ink-muted)]">
                  01 · Superficies y Tintas Monocromáticas
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.015em]">
                  Elevación por Luminancia Escalonada (Cero{" "}
                  <span className="tabular-readout">#000000</span>)
                </h2>
              </div>
              <span className="tabular-readout text-xs text-[var(--ink-muted)]">
                Tema activo:{" "}
                <strong className="font-medium text-[var(--ink-primary)]">
                  {theme}
                </strong>
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Demostración anidada física de los 3 planos */}
              <div className="lg:col-span-5">
                <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--ink-primary)]">
                      Nivel 0 · Base Canvas
                    </span>
                    <span className="tabular-readout text-[var(--ink-muted)]">
                      {SURFACE_TOKENS[0]?.hex[theme]}
                    </span>
                  </div>

                  <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)] p-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--ink-primary)]">
                        Nivel 1 · Panel Estructural
                      </span>
                      <span className="tabular-readout text-[var(--ink-muted)]">
                        {SURFACE_TOKENS[1]?.hex[theme]}
                      </span>
                    </div>

                    <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--ink-primary)]">
                          Nivel 2 · Superficie Elevada
                        </span>
                        <span className="tabular-readout text-[var(--ink-muted)]">
                          {SURFACE_TOKENS[2]?.hex[theme]}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-[var(--ink-secondary)]">
                        Jerarquía pura por luminancia escalonada y bordes de{" "}
                        <span className="tabular-readout">1px rgba</span>, sin
                        sombras pesadas ni halación óptica.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de superficies y tintas con ratios WCAG */}
              <div className="space-y-4 lg:col-span-7">
                <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)]">
                  <div className="border-b border-[var(--border-subtle)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--ink-muted)]">
                    Tintas Monocromáticas — Verificación WCAG sobre Panel ({panelHex})
                  </div>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {INK_TOKENS.map((ink) => {
                      const ratio = contrastHexOnHex(ink.hex[theme], panelHex);
                      const grade = wcagGrade(ratio);
                      return (
                        <div
                          key={ink.token}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div
                              className="text-sm font-medium"
                              style={{ color: `var(${ink.token})` }}
                            >
                              {ink.role} —{" "}
                              <span className="tabular-readout text-xs font-normal opacity-80">
                                {ink.token}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                              {ink.purpose}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="tabular-readout text-xs text-[var(--ink-secondary)]">
                              {ink.hex[theme]}
                            </span>
                            <span className="tabular-readout rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-primary)]">
                              {ratio.toFixed(2)}:1 · {grade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECCIÓN 02: Semántica Cromática Física Inmutable (OKLCH) */}
        {!zenMode && (
          <section className="border-b border-[var(--border-subtle)] py-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="tabular-readout text-[11px] uppercase tracking-[0.09em] text-[var(--ink-muted)]">
                  02 · Semántica Cromática Física Inmutable (OKLCH)
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.015em]">
                  Cinco Magnitudes Físicas Constantes de{" "}
                  <span className="tabular-readout">L0</span> a{" "}
                  <span className="tabular-readout">L11</span>
                </h2>
              </div>
              <p className="max-w-[54ch] text-xs text-[var(--ink-secondary)]">
                Cada magnitud separa su token gráfico de traza (
                <span className="tabular-readout">--phys-*</span>) de su tinta
                de texto pequeño (
                <span className="tabular-readout">--phys-*-ink</span>),
                calibrados dentro del gamut sRGB para pasar WCAG AA/AAA en ambos
                temas.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {PHYSICAL_TOKEN_LIST.map((spec) => {
                const current = spec.oklch[theme];
                const traceRatioPanel = contrastOklchOnHex(
                  current.trace,
                  panelHex
                );
                const inkRatioPanel = contrastOklchOnHex(current.ink, panelHex);
                const inkRatioElevated = contrastOklchOnHex(
                  current.ink,
                  elevatedHex
                );

                return (
                  <article
                    key={spec.key}
                    className="flex flex-col rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)] p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <PhysicalBadge quantity={spec.key} showSymbol />
                        {spec.reservedFromLayer && (
                          <span className="tabular-readout inline-flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                            <Lock className="h-2.5 w-2.5 stroke-[1.8]" />
                            {spec.reservedFromLayer}+
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-[var(--ink-primary)]">
                        {spec.label}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                        {spec.scopeNote}
                      </p>
                    </div>

                    {/* Muestra visual de traza gráfica — alineada en línea base horizontal */}
                    <div className="mt-4 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3 py-2.5">
                      <div className="flex items-center justify-between text-[10px] text-[var(--ink-muted)]">
                        <span>TRAZA GRÁFICA</span>
                        <span className="tabular-readout">
                          {traceRatioPanel.toFixed(2)}:1
                        </span>
                      </div>
                      <div
                        className="mt-2 h-1.5 w-full rounded-full"
                        style={{
                          backgroundColor: `var(${spec.cssVarTrace})`,
                        }}
                      />
                    </div>

                    {/* Prueba de legibilidad de texto pequeño en Panel y Elevado */}
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1.5 text-[11px]">
                        <span
                          className="whitespace-nowrap font-medium"
                          style={{ color: `var(${spec.cssVarInk})` }}
                        >
                          Panel
                        </span>
                        <span className="tabular-readout whitespace-nowrap text-[10px] text-[var(--ink-muted)]">
                          {inkRatioPanel.toFixed(2)}:1 ·{" "}
                          {wcagGrade(inkRatioPanel)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px]">
                        <span
                          className="whitespace-nowrap font-medium"
                          style={{ color: `var(${spec.cssVarInk})` }}
                        >
                          Elevado
                        </span>
                        <span className="tabular-readout whitespace-nowrap text-[10px] text-[var(--ink-muted)]">
                          {inkRatioElevated.toFixed(2)}:1 ·{" "}
                          {wcagGrade(inkRatioElevated)}
                        </span>
                      </div>
                    </div>

                    {/* Coordenadas OKLCH y HEX */}
                    <div className="mt-4 space-y-1 border-t border-[var(--border-subtle)] pt-3 text-[10px] text-[var(--ink-muted)]">
                      <div className="tabular-readout flex justify-between">
                        <span>trace</span>
                        <span className="text-[var(--ink-secondary)]">
                          {oklchToHex(current.trace)}
                        </span>
                      </div>
                      <div className="tabular-readout truncate opacity-85">
                        {formatOklch(current.trace)}
                      </div>
                      <div className="tabular-readout flex justify-between pt-1">
                        <span>ink</span>
                        <span className="text-[var(--ink-secondary)]">
                          {oklchToHex(current.ink)}
                        </span>
                      </div>
                      <div className="tabular-readout truncate opacity-85">
                        {formatOklch(current.ink)}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* SECCIÓN 03: Ergonomía Editorial, Prosa 65–70ch, Glosario Vivo, KaTeX y Modo Zen */}
        <section
          className={cn(
            "py-12 transition-all duration-200",
            zenMode
              ? "mx-auto max-w-[74ch] py-16"
              : "border-b border-[var(--border-subtle)]"
          )}
        >
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="tabular-readout text-[11px] uppercase tracking-[0.09em] text-[var(--ink-muted)]">
                {zenMode
                  ? "Modo Enfoque (Zen) Activo · Carga Extrínseca Mínima"
                  : "03 · Tipografía Editorial, Glosario Vivo y KaTeX"}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.015em]">
                Ritmo de Lectura Socrática (
                <span className="tabular-readout">65ch–70ch</span>)
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowMeasureRuler((prev) => !prev)}
              className="focus-instrument inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]"
            >
              <Ruler className="h-3.5 w-3.5 stroke-[1.6]" />
              <span>{showMeasureRuler ? "Ocultar regla 68ch" : "Mostrar regla 68ch"}</span>
            </button>
          </div>

          <div
            className={cn(
              "rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 sm:p-10",
              zenMode && "border-[var(--border-default)] bg-[var(--bg-canvas)] px-4 sm:px-12"
            )}
          >
            {/* Aviso honesto de que esto es un espécimen de calibración */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3 text-[11px] text-[var(--ink-muted)]">
              <span className="tabular-readout uppercase tracking-[0.07em]">
                Espécimen Tipográfico · No es contenido de L0.1
              </span>
              <span className="tabular-readout">
                Geist 17px · interlineado 1.72 · medida máx 68ch
              </span>
            </div>

            {showMeasureRuler && (
              <div
                aria-hidden="true"
                className="mb-5 flex max-w-[var(--prose-measure)] items-center justify-between border-b border-dashed border-[var(--border-strong)] pb-1 text-[10px] text-[var(--ink-muted)]"
              >
                <span className="tabular-readout">0ch</span>
                <span className="tabular-readout">
                  Ancho óptimo cognitivo: 68ch
                </span>
                <span className="tabular-readout">68ch</span>
              </div>
            )}

            <div className="socratic-prose">
              <p>
                Cuando el eje gira sin conectar todavía ningún consumidor
                externo, el motor primario apenas vence su propia fricción y la
                inercia del conjunto. Sin embargo, en el instante en que el
                circuito exterior se cierra, la variación de{" "}
                <GlossaryTerm entry={SPECIMEN_GLOSSARY["flujo-magnetico"]!} />{" "}
                ya no solo establece una diferencia de potencial{" "}
                <MathFormula tex="e(t)" /> entre bornes: ahora sostiene una
                corriente real que interactúa con el campo del rotor y genera un{" "}
                <GlossaryTerm
                  entry={SPECIMEN_GLOSSARY["contrapar-electromagnetico"]!}
                />{" "}
                opuesto al movimiento.
              </p>

              <p>
                Pulsa cualquiera de los dos términos subrayados con línea
                punteada para verificar que el <strong>Glosario Vivo</strong>{" "}
                muestra la imagen mental pura y su formalización técnica sin
                desplazar una sola línea de texto ni romper la cadencia de
                lectura.
              </p>

              <MathFormula
                block
                quantity="electric"
                label="Relación Síncrona Frecuencia — Polos · KaTeX"
                tex={String.raw`f = \frac{p \cdot N}{120} \qquad\Longrightarrow\qquad e(t) = -N_e \frac{d\Phi(t)}{dt}`}
                caption="La barra lateral izquierda de 2px adopta exclusivamente el token físico de la magnitud dominante (Eléctrica)."
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN 04: Instrumentación 60 FPS y Telemetría Tabular */}
        {!zenMode && (
          <section className="pt-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="tabular-readout text-[11px] uppercase tracking-[0.09em] text-[var(--ink-muted)]">
                  04 · Simulación HiDPI a 60 FPS y Telemetría Tabular
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.015em]">
                  Prueba de Fluidez, Cero Salto Numérico y Conmutación de Tema
                </h2>
              </div>
              <p className="max-w-[52ch] text-xs text-[var(--ink-secondary)]">
                Manipula los controles y alterna entre{" "}
                <strong className="font-medium text-[var(--ink-primary)]">
                  Dark Lab
                </strong>{" "}
                y{" "}
                <strong className="font-medium text-[var(--ink-primary)]">
                  Light Editorial
                </strong>{" "}
                para auditar nitidez de trazas, separación visual de las cinco
                magnitudes y estabilidad horizontal de{" "}
                <span className="tabular-readout">tabular-nums</span>.
              </p>
            </div>

            <CalibrationOscilloscope />
          </section>
        )}
      </main>
    </div>
  );
}
