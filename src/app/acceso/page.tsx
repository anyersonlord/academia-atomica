import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ThemeIconToggle } from "@/components/ui/ThemeIconToggle";
import { AccessForm } from "./AccessForm";

export const metadata: Metadata = {
  title: "Entrar — Academia Atómica",
};

export default async function AccesoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      <header className="h-12 border-b border-[var(--border-subtle)]">
        <div className="mx-auto flex h-full max-w-[920px] items-center justify-between px-6">
          <span className="text-[13px] font-medium tracking-[-0.01em] text-[var(--ink-primary)]">
            Academia Atómica
          </span>
          <ThemeIconToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[340px]">
          <p className="text-xs text-[var(--ink-muted)]">Grupos Electrógenos</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--ink-primary)]">
            Entrar a tu estudio
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-secondary)]">
            Tu recorrido y tus notas permanecen guardados en tu sesión.
          </p>

          <AccessForm />
        </div>
      </main>
    </div>
  );
}
