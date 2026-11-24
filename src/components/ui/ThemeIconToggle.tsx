"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeIconToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark-lab";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a lectura clara" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a lectura clara" : "Cambiar a modo oscuro"}
      className={cn(
        "focus-instrument inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--ink-secondary)] transition-colors duration-150 hover:bg-[var(--bg-panel)] hover:text-[var(--ink-primary)]",
        className
      )}
    >
      {isDark ? (
        <Sun className="h-[15px] w-[15px] stroke-[1.5]" />
      ) : (
        <Moon className="h-[15px] w-[15px] stroke-[1.5]" />
      )}
    </button>
  );
}
