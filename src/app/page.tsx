import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ThemeIconToggle } from "@/components/ui/ThemeIconToggle";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { CausalPath } from "@/components/path/CausalPath";
import type { LayerCode, LayerRecord } from "@/lib/ontology/layer-graph";

interface FrontierAtomRow {
  code: string;
  slug: string;
  title: string;
  status: "calibration" | "draft" | "published";
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/acceso");
  }

  const [{ data: layersData }, { data: atomsData }] = await Promise.all([
    supabase
      .from("layers")
      .select("code, order_index, title, subtitle, physical_scope, status")
      .order("order_index", { ascending: true }),
    supabase
      .from("concept_atoms")
      .select("code, slug, title, status")
      .in("status", ["published", "calibration"])
      .order("code", { ascending: true })
      .limit(1),
  ]);

  const layers = (layersData ?? []) as LayerRecord[];
  const frontierLayer =
    layers.find((l) => l.status === "active") ?? layers[0] ?? null;
  const frontierAtom = (atomsData?.[0] ?? null) as FrontierAtomRow | null;

  const frontierLayerNumber = frontierLayer
    ? frontierLayer.code.replace("L", "")
    : "0";
  const frontierCodeLabel = frontierAtom
    ? frontierAtom.code
    : `${(frontierLayer?.code ?? "L0") as LayerCode}.1`;

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--ink-primary)] transition-colors duration-200">
      {/* Cabecera minimalista de 48px */}
      <header className="sticky top-0 z-30 h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/92 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-[820px] items-center justify-between px-6">
          <span className="text-[13px] font-medium tracking-[-0.01em] text-[var(--ink-primary)]">
            Academia Atómica
          </span>

          <div className="flex items-center gap-2">
            <ThemeIconToggle />
            <AccountMenu email={user.email ?? ""} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-6 pb-24 pt-14 sm:pt-16">
        {/* Apertura editorial serena */}
        <section className="max-w-[60ch]">
          <h1 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--ink-primary)] sm:text-[36px]">
            Grupos Electrógenos
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--ink-secondary)]">
            De la partícula a la planta, sin saltos.
          </p>
        </section>

        <div className="my-10 h-px bg-[var(--border-subtle)]" />

        {/* Frontera actual (sin tarjetas ni ruido) */}
        <section aria-labelledby="frontier-heading">
          <p
            id="frontier-heading"
            className="text-xs text-[var(--ink-muted)]"
          >
            Tu frontera
          </p>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-[16px] leading-snug tracking-[-0.012em] text-[var(--ink-primary)]">
                <span className="tabular-readout mr-2 text-xs font-medium text-[var(--ink-secondary)]">
                  {frontierCodeLabel}
                </span>
                <span className="font-medium">
                  {frontierAtom
                    ? frontierAtom.title
                    : `Capa ${frontierLayerNumber} — ${frontierLayer?.title ?? "Axioma lógico y ontología física"}`}
                </span>
              </p>

              {!frontierAtom && (
                <p className="mt-1.5 text-[13.5px] text-[var(--ink-muted)]">
                  En preparación
                </p>
              )}
            </div>

            {frontierAtom && (
              <Link
                href={`/atomo/${frontierAtom.slug}`}
                className="focus-instrument inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-1.5 text-xs font-medium text-[var(--ink-primary)] transition-colors duration-150 hover:bg-[var(--bg-interactive)]"
              >
                <span>Comenzar</span>
                <ArrowRight className="h-3.5 w-3.5 stroke-[1.6]" />
              </Link>
            )}
          </div>
        </section>

        <div className="my-10 h-px bg-[var(--border-subtle)]" />

        {/* El camino causal vertical */}
        <section aria-labelledby="path-heading">
          <div className="mb-7 flex items-baseline justify-between gap-4">
            <h2
              id="path-heading"
              className="text-xs font-normal text-[var(--ink-muted)]"
            >
              El camino
            </h2>
            <span className="text-[11px] text-[var(--ink-muted)] opacity-75">
              Pulsa cualquier capa para ver su alcance
            </span>
          </div>

          <CausalPath layers={layers} />
        </section>
      </main>
    </div>
  );
}
