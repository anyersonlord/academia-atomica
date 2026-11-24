"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { ThemeMode } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Moon }[] = [
  { mode: "dark-lab", label: "Dark Lab", Icon: Moon },
  { mode: "light-editorial", label: "Light Editorial", Icon: Sun },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Seleccionar tema visual"
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-panel)] p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ mode, label, Icon }) => {
        const active = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(mode)}
            className={cn(
              "focus-instrument relative inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-medium transition-colors duration-150",
              active
                ? "text-[var(--ink-primary)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]"
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-pill"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)]"
              />
            )}
            <Icon className="relative z-10 h-3.5 w-3.5 stroke-[1.6]" />
            <span className="relative z-10 whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
