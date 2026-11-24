"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AccessForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError("El correo o la contraseña no coinciden.");
        setPending(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión en este momento.");
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs text-[var(--ink-secondary)]"
        >
          Correo
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-instrument w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-panel)] px-3.5 py-2.5 text-sm text-[var(--ink-primary)] transition-colors focus:border-[var(--border-strong)]"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-xs text-[var(--ink-secondary)]"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-instrument w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-panel)] px-3.5 py-2.5 text-sm text-[var(--ink-primary)] transition-colors focus:border-[var(--border-strong)]"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs leading-relaxed"
          style={{ color: "var(--state-mismatch)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="focus-instrument inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--ink-primary)] transition-colors duration-150 hover:bg-[var(--bg-interactive)] disabled:opacity-50"
      >
        <span>{pending ? "Entrando…" : "Entrar"}</span>
        {!pending && <ArrowRight className="h-3.5 w-3.5 stroke-[1.6]" />}
      </button>
    </form>
  );
}
