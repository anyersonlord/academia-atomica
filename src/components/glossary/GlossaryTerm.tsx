"use client";

import { Popover } from "radix-ui";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { PHYSICAL_TOKENS, type PhysicalQuantityKey } from "@/lib/design/tokens";
import { PhysicalBadge } from "@/components/ui/PhysicalBadge";
import { cn } from "@/lib/utils";

export interface GlossaryTermData {
  slug: string;
  term: string;
  mentalImageShort: string;
  technicalDefinition: string;
  originAtomCode?: string;
  physicalQuantity?: PhysicalQuantityKey;
}

interface GlossaryTermProps {
  entry: GlossaryTermData;
  children?: React.ReactNode;
  className?: string;
}

export function GlossaryTerm({
  entry,
  children,
  className,
}: GlossaryTermProps) {
  const accentColor = entry.physicalQuantity
    ? `var(${PHYSICAL_TOKENS[entry.physicalQuantity].cssVarBorder})`
    : "var(--border-strong)";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "focus-instrument inline cursor-pointer rounded-[2px] border-0 bg-transparent p-0 font-inherit text-inherit underline decoration-dotted decoration-[1.25px] underline-offset-[4px] transition-colors duration-150 hover:text-[var(--ink-primary)]",
            className
          )}
          style={{ textDecorationColor: accentColor }}
        >
          {children ?? entry.term}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 text-left text-sm text-[var(--ink-primary)] outline-none"
          style={{ boxShadow: "var(--shadow-popover)" }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <BookOpen className="h-3 w-3 stroke-[1.6]" />
                <span>Glosario Vivo</span>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-[var(--ink-primary)]">
                {entry.term}
              </p>
            </div>
            {entry.physicalQuantity && (
              <PhysicalBadge quantity={entry.physicalQuantity} />
            )}
          </div>

          <div className="mt-3 space-y-2.5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                Imagen mental pura
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-primary)]">
                {entry.mentalImageShort}
              </p>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                Formalización técnica
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                {entry.technicalDefinition}
              </p>
            </div>
          </div>

          {entry.originAtomCode && (
            <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--ink-muted)]">
              <span>Átomo de origen</span>
              <span className="tabular-readout inline-flex items-center gap-1 font-medium text-[var(--ink-secondary)]">
                {entry.originAtomCode}
                <ArrowUpRight className="h-3 w-3 stroke-[1.6]" />
              </span>
            </div>
          )}

          <Popover.Arrow
            width={12}
            height={6}
            className="fill-[var(--bg-elevated)]"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
