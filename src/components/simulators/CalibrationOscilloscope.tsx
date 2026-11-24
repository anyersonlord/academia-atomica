"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  PHYSICAL_TOKENS,
  PHYSICAL_TOKEN_LIST,
  type PhysicalQuantityKey,
} from "@/lib/design/tokens";
import { oklchToHex } from "@/lib/design/contrast";
import { PrecisionSlider } from "@/components/ui/PrecisionSlider";
import { cn } from "@/lib/utils";

interface SimParams {
  frequencyHz: number;
  fluxPu: number;
  loadPct: number;
  running: boolean;
  channels: Record<PhysicalQuantityKey, boolean>;
}

const DEFAULT_PARAMS: SimParams = {
  frequencyHz: 60.0,
  fluxPu: 1.0,
  loadPct: 65.0,
  running: true,
  channels: {
    electric: true,
    magnetic: true,
    mechanical: true,
    thermal: true,
    signal: false,
  },
};

export function CalibrationOscilloscope() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [fpsReadout, setFpsReadout] = useState<number>(60);

  const paramsRef = useRef<SimParams>(params);
  const themeRef = useRef(theme);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Valores físicos derivados deterministas para telemetría tabular
  const rpm4Pole = (params.frequencyHz * 120) / 4;
  const inducedVoltagePu = (params.frequencyHz / 60) * params.fluxPu;
  const loadFraction = params.loadPct / 100;
  const torquePu = inducedVoltagePu * loadFraction;
  const thermalDissipationPu = loadFraction * loadFraction;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = container.clientWidth;
    let height = 276;

    const resize = () => {
      width = Math.max(280, container.clientWidth);
      height = 276;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTs = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;

    const drawFrame = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      fpsAccum += dt;
      fpsFrames += 1;
      if (fpsAccum >= 0.45) {
        const measured = Math.round(fpsFrames / fpsAccum);
        setFpsReadout(measured);
        fpsAccum = 0;
        fpsFrames = 0;
      }

      const p = paramsRef.current;
      const currentTheme = themeRef.current;

      if (p.running) {
        // Escala temporal visual calibrada (60 Hz -> velocidad legible de laboratorio)
        phaseRef.current += dt * (p.frequencyHz / 60) * 3.1;
      }

      const bgRecessed = currentTheme === "dark-lab" ? "#07090D" : "#EDF0F4";
      const gridMinor =
        currentTheme === "dark-lab"
          ? "rgba(255,255,255,0.05)"
          : "rgba(15,23,42,0.06)";
      const gridMajor =
        currentTheme === "dark-lab"
          ? "rgba(255,255,255,0.12)"
          : "rgba(15,23,42,0.13)";
      const axisText = currentTheme === "dark-lab" ? "#7F889C" : "#5B6578";

      const colors: Record<PhysicalQuantityKey, string> = {
        electric: oklchToHex(PHYSICAL_TOKENS.electric.oklch[currentTheme].trace),
        magnetic: oklchToHex(PHYSICAL_TOKENS.magnetic.oklch[currentTheme].trace),
        thermal: oklchToHex(PHYSICAL_TOKENS.thermal.oklch[currentTheme].trace),
        mechanical: oklchToHex(
          PHYSICAL_TOKENS.mechanical.oklch[currentTheme].trace
        ),
        signal: oklchToHex(PHYSICAL_TOKENS.signal.oklch[currentTheme].trace),
      };

      // 1. Fondo del pozo de instrumentación
      ctx.fillStyle = bgRecessed;
      ctx.fillRect(0, 0, width, height);

      // 2. Retícula científica subpixel
      const cols = 10;
      const rows = 6;
      const midY = height / 2;

      ctx.lineWidth = 1;
      for (let i = 1; i < cols; i++) {
        const x = Math.round((width / cols) * i) + 0.5;
        ctx.strokeStyle = i === cols / 2 ? gridMajor : gridMinor;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let j = 1; j < rows; j++) {
        const y = Math.round((height / rows) * j) + 0.5;
        ctx.strokeStyle = j === rows / 2 ? gridMajor : gridMinor;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Marcas de división sobre eje central
      ctx.strokeStyle = gridMajor;
      const tickStep = width / 50;
      for (let x = tickStep; x < width; x += tickStep) {
        ctx.beginPath();
        ctx.moveTo(x, midY - 3);
        ctx.lineTo(x, midY + 3);
        ctx.stroke();
      }

      const ampScale = height * 0.34;
      const cyclesAcross = 2.0 * (p.frequencyHz / 60);
      const omegaScale = (cyclesAcross * Math.PI * 2) / width;
      const phi0 = p.fluxPu;
      const emfAmp = Math.min(1.35, (p.frequencyHz / 60) * phi0);
      const loadFrac = p.loadPct / 100;
      const ph = phaseRef.current;

      // 3. Traza Térmica (envolvente de disipación I²R — cuadrática con carga)
      if (p.channels.thermal) {
        const thermalLevel = loadFrac * loadFrac * 0.78;
        const baseThermalY = midY - thermalLevel * ampScale;
        ctx.save();
        ctx.strokeStyle = colors.thermal;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const theta = x * omegaScale - ph;
          const ripple = Math.sin(2 * theta) * 0.04 * loadFrac * ampScale;
          const y = baseThermalY - ripple;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Traza Magnética (Flujo Φ(t) = Φ0 cos(ωt) — línea discontinua de campo)
      if (p.channels.magnetic) {
        ctx.save();
        ctx.strokeStyle = colors.magnetic;
        ctx.lineWidth = 1.75;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const theta = x * omegaScale - ph;
          const y = midY - Math.cos(theta) * (phi0 * 0.78) * ampScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 5. Traza Mecánica (Contrapar electromagnético τ(t) ∝ I · sin²(ωt))
      if (p.channels.mechanical) {
        ctx.save();
        ctx.strokeStyle = colors.mechanical;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const theta = x * omegaScale - ph;
          const s = Math.sin(theta);
          const torque = s * s * loadFrac * emfAmp * 0.85;
          const y = midY - torque * ampScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 6. Traza Eléctrica (FEM inducida e(t) ∝ ωΦ0 sin(ωt) — 90° respecto a Φ)
      if (p.channels.electric) {
        ctx.save();
        ctx.strokeStyle = colors.electric;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const theta = x * omegaScale - ph;
          const y = midY - Math.sin(theta) * (emfAmp * 0.86) * ampScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 7. Traza Señal/Control (Reservado L8+: pulso PWM de excitación AVR)
      if (p.channels.signal) {
        const duty = Math.min(0.88, 0.22 + loadFrac * 0.58);
        const periodPx = width / 8;
        const lowY = height - 20;
        const highY = height - 56;
        ctx.save();
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const shiftPx = ((ph * 18) % periodPx + periodPx) % periodPx;
        for (let x = 0; x <= width; x += 1) {
          const local = ((x + shiftPx) % periodPx) / periodPx;
          const y = local < duty ? highY : lowY;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 8. Leyendas de escala sutiles
      ctx.fillStyle = axisText;
      ctx.font = "11px var(--font-geist-mono), ui-monospace, monospace";
      ctx.fillText("+1.0 pu", 10, 18);
      ctx.fillText("0.0", 10, midY - 6);
      ctx.fillText("-1.0 pu", 10, height - 10);

      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const toggleChannel = (key: PhysicalQuantityKey) => {
    setParams((prev) => ({
      ...prev,
      channels: { ...prev.channels, [key]: !prev.channels[key] },
    }));
  };

  const stepQuarterCycle = () => {
    setParams((prev) => ({ ...prev, running: false }));
    phaseRef.current += Math.PI / 12; // +15° eléctricos
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)]">
      {/* Cabecera del instrumento */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="tabular-readout rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-secondary)]">
            ARNÉS 60 FPS
          </span>
          <span className="text-xs font-medium text-[var(--ink-primary)]">
            Acoplamiento Electromecánico de Calibración (4 Polos)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="tabular-readout text-[11px] text-[var(--ink-muted)]">
            {fpsReadout} FPS
          </span>
          <span className="h-3 w-px bg-[var(--border-default)]" />
          <button
            type="button"
            onClick={() =>
              setParams((prev) => ({ ...prev, running: !prev.running }))
            }
            className="focus-instrument inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--bg-interactive)]"
          >
            {params.running ? (
              <>
                <Pause className="h-3 w-3 stroke-[1.7]" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 stroke-[1.7]" />
                <span>Reanudar</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={stepQuarterCycle}
            title="Avanzar +15° eléctricos"
            className="focus-instrument inline-flex items-center gap-1 rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-interactive)] hover:text-[var(--ink-primary)]"
          >
            <StepForward className="h-3 w-3 stroke-[1.7]" />
            <span className="tabular-readout">+15°</span>
          </button>
          <button
            type="button"
            onClick={() => {
              phaseRef.current = 0;
              setParams(DEFAULT_PARAMS);
            }}
            title="Restablecer valores nominales"
            className="focus-instrument inline-flex items-center rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-interactive)] hover:text-[var(--ink-primary)]"
          >
            <RotateCcw className="h-3.5 w-3.5 stroke-[1.7]" />
          </button>
        </div>
      </div>

      {/* Selector de canales físicos */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-2">
        {PHYSICAL_TOKEN_LIST.map((spec) => {
          const active = params.channels[spec.key];
          return (
            <button
              key={spec.key}
              type="button"
              onClick={() => toggleChannel(spec.key)}
              aria-pressed={active}
              className={cn(
                "focus-instrument tabular-readout inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "opacity-100"
                  : "border-[var(--border-subtle)] bg-transparent text-[var(--ink-muted)] opacity-65 hover:opacity-100"
              )}
              style={
                active
                  ? {
                      backgroundColor: `var(${spec.cssVarSurface})`,
                      borderColor: `var(${spec.cssVarBorder})`,
                      color: `var(${spec.cssVarInk})`,
                    }
                  : undefined
              }
            >
              <span
                className="h-1.5 w-3 rounded-full"
                style={{
                  backgroundColor: active
                    ? `var(${spec.cssVarTrace})`
                    : "var(--ink-muted)",
                }}
              />
              <span>{spec.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Lienzo HiDPI Canvas */}
      <div ref={containerRef} className="w-full border-b border-[var(--border-subtle)]">
        <canvas
          ref={canvasRef}
          aria-label="Osciloscopio interactivo de calibración de tokens físicos"
          className="block w-full"
        />
      </div>

      {/* Barra de telemetría en vivo (tabular-nums obligatorio) */}
      <div className="grid grid-cols-2 gap-px border-b border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-4">
        <div className="bg-[var(--bg-panel)] px-4 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">Velocidad síncrona</div>
          <div className="tabular-readout mt-0.5 text-sm font-semibold text-[var(--ink-primary)]">
            {rpm4Pole.toFixed(0)}{" "}
            <span className="text-xs font-normal text-[var(--ink-muted)]">RPM</span>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] px-4 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">FEM inducida (pico)</div>
          <div
            className="tabular-readout mt-0.5 text-sm font-semibold"
            style={{ color: "var(--phys-electric-ink)" }}
          >
            {inducedVoltagePu.toFixed(2)}{" "}
            <span className="text-xs font-normal text-[var(--ink-muted)]">pu</span>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] px-4 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">Contrapar medio</div>
          <div
            className="tabular-readout mt-0.5 text-sm font-semibold"
            style={{ color: "var(--phys-mechanical-ink)" }}
          >
            {torquePu.toFixed(2)}{" "}
            <span className="text-xs font-normal text-[var(--ink-muted)]">pu</span>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] px-4 py-2.5">
          <div className="text-[11px] text-[var(--ink-muted)]">Disipación Joule (I²R)</div>
          <div
            className="tabular-readout mt-0.5 text-sm font-semibold"
            style={{ color: "var(--phys-thermal-ink)" }}
          >
            {(thermalDissipationPu * 100).toFixed(1)}{" "}
            <span className="text-xs font-normal text-[var(--ink-muted)]">%</span>
          </div>
        </div>
      </div>

      {/* Controles táctiles calibrados */}
      <div className="grid gap-6 p-4 md:grid-cols-3">
        <PrecisionSlider
          id="cal-freq"
          label="Frecuencia eléctrica"
          value={params.frequencyHz}
          min={15}
          max={75}
          step={0.5}
          unit="Hz"
          decimals={1}
          quantity="electric"
          subReadout={`${rpm4Pole.toFixed(0)} RPM`}
          onChange={(v) => setParams((prev) => ({ ...prev, frequencyHz: v }))}
        />
        <PrecisionSlider
          id="cal-flux"
          label="Flujo magnético del rotor"
          value={params.fluxPu}
          min={0.2}
          max={1.2}
          step={0.05}
          unit="pu"
          decimals={2}
          quantity="magnetic"
          onChange={(v) => setParams((prev) => ({ ...prev, fluxPu: v }))}
        />
        <PrecisionSlider
          id="cal-load"
          label="Carga eléctrica aplicada"
          value={params.loadPct}
          min={0}
          max={100}
          step={1}
          unit="%"
          decimals={0}
          quantity="mechanical"
          subReadout={`Q ${(thermalDissipationPu * 100).toFixed(0)}%`}
          onChange={(v) => setParams((prev) => ({ ...prev, loadPct: v }))}
        />
      </div>
    </div>
  );
}
