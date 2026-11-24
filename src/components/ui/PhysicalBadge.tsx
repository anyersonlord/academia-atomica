import { PHYSICAL_TOKENS, type PhysicalQuantityKey } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

interface PhysicalBadgeProps {
  quantity: PhysicalQuantityKey;
  text?: string;
  showSymbol?: boolean;
  className?: string;
}

export function PhysicalBadge({
  quantity,
  text,
  showSymbol = false,
  className,
}: PhysicalBadgeProps) {
  const spec = PHYSICAL_TOKENS[quantity];

  return (
    <span
      className={cn(
        "tabular-readout inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] border px-2 py-0.5 text-[11px] font-medium leading-tight",
        className
      )}
      style={{
        backgroundColor: `var(${spec.cssVarSurface})`,
        borderColor: `var(${spec.cssVarBorder})`,
        color: `var(${spec.cssVarInk})`,
      }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `var(${spec.cssVarTrace})` }}
      />
      <span>{text ?? spec.shortLabel}</span>
      {showSymbol && (
        <span className="opacity-75">({spec.symbol})</span>
      )}
    </span>
  );
}
