"use client";

import { Slider } from "radix-ui";
import { PHYSICAL_TOKENS, type PhysicalQuantityKey } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

interface PrecisionSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
  quantity?: PhysicalQuantityKey;
  onChange: (value: number) => void;
  subReadout?: string;
  className?: string;
}

export function PrecisionSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 1,
  quantity,
  onChange,
  subReadout,
  className,
}: PrecisionSliderProps) {
  const accentTrace = quantity
    ? `var(${PHYSICAL_TOKENS[quantity].cssVarTrace})`
    : "var(--ink-primary)";
  const accentInk = quantity
    ? `var(${PHYSICAL_TOKENS[quantity].cssVarInk})`
    : "var(--ink-primary)";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-xs font-medium text-[var(--ink-secondary)]"
        >
          {label}
        </label>
        <div className="flex items-baseline gap-2">
          {subReadout && (
            <span className="tabular-readout text-[11px] text-[var(--ink-muted)]">
              {subReadout}
            </span>
          )}
          <span
            className="tabular-readout text-xs font-semibold"
            style={{ color: accentInk }}
          >
            {value.toFixed(decimals)}
            <span className="ml-0.5 text-[11px] font-normal text-[var(--ink-muted)]">
              {unit}
            </span>
          </span>
        </div>
      </div>

      <Slider.Root
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals) => {
          const next = vals[0];
          if (typeof next === "number") {
            onChange(next);
          }
        }}
        className="relative flex h-5 w-full touch-none select-none items-center"
      >
        <Slider.Track className="relative h-[2px] w-full grow overflow-hidden rounded-full bg-[var(--border-default)]">
          <Slider.Range
            className="absolute h-full"
            style={{ backgroundColor: accentTrace }}
          />
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          className="focus-instrument block h-3.5 w-3.5 cursor-ew-resize rounded-full border bg-[var(--bg-elevated)] transition-transform duration-100 hover:scale-110 active:scale-95"
          style={{ borderColor: accentTrace }}
        />
      </Slider.Root>
    </div>
  );
}
