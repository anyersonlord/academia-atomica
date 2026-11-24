import katex from "katex";
import { PHYSICAL_TOKENS, type PhysicalQuantityKey } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

interface MathFormulaProps {
  tex: string;
  block?: boolean;
  label?: string;
  caption?: string;
  quantity?: PhysicalQuantityKey;
  className?: string;
}

export function MathFormula({
  tex,
  block = false,
  label,
  caption,
  quantity,
  className,
}: MathFormulaProps) {
  const html = katex.renderToString(tex, {
    displayMode: block,
    throwOnError: false,
    strict: "warn",
    trust: false,
  });

  if (!block) {
    return (
      <span
        className={cn("inline-block align-baseline px-0.5", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const accentVar = quantity
    ? `var(${PHYSICAL_TOKENS[quantity].cssVarTrace})`
    : "var(--border-strong)";

  return (
    <figure
      className={cn(
        "relative my-5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{ backgroundColor: accentVar }}
      />
      {(label || quantity) && (
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
          <span className="tabular-readout text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            {label ?? "Ecuación"}
          </span>
          {quantity && (
            <span
              className="tabular-readout inline-flex items-center gap-1.5 text-[11px] font-medium"
              style={{ color: `var(${PHYSICAL_TOKENS[quantity].cssVarInk})` }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: `var(${PHYSICAL_TOKENS[quantity].cssVarTrace})`,
                }}
              />
              {PHYSICAL_TOKENS[quantity].shortLabel}
            </span>
          )}
        </div>
      )}
      <div
        className="px-5 py-4 text-center"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {caption && (
        <figcaption className="border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 text-xs text-[var(--ink-secondary)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
