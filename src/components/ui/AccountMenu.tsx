"use client";

import { useTransition } from "react";
import { Popover } from "radix-ui";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/acceso/actions";

interface AccountMenuProps {
  email: string;
}

export function AccountMenu({ email }: AccountMenuProps) {
  const [pending, startTransition] = useTransition();

  const initial = (email.trim()[0] ?? "A").toUpperCase();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Cuenta"
          className="focus-instrument tabular-readout inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-panel)] text-[11px] font-medium text-[var(--ink-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
        >
          {initial}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[232px] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5 text-left outline-none"
          style={{ boxShadow: "var(--shadow-popover)" }}
        >
          <div className="px-2.5 py-2">
            <p className="text-[11px] text-[var(--ink-muted)]">Sesión</p>
            <p className="mt-0.5 truncate text-xs text-[var(--ink-primary)]">
              {email}
            </p>
          </div>

          <div className="my-1 h-px bg-[var(--border-subtle)]" />

          <button
            type="button"
            disabled={pending}
            onClick={handleSignOut}
            className="focus-instrument flex w-full items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] transition-colors duration-150 hover:bg-[var(--bg-interactive)] hover:text-[var(--ink-primary)] disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>{pending ? "Cerrando sesión…" : "Cerrar sesión"}</span>
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
