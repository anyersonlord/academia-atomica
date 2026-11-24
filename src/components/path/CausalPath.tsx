"use client";

import { useState } from "react";
import { Tooltip } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import {
  CAUSAL_LAYER_TOPOLOGY,
  LAYER_HOVER_QUANTITY,
  type LayerCode,
  type LayerRecord,
} from "@/lib/ontology/layer-graph";
import { PHYSICAL_TOKENS } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

interface CausalPathProps {
  layers: LayerRecord[];
}

interface NodeRowProps {
  layer: LayerRecord;
  isFirst?: boolean;
  isLast?: boolean;
  isExpanded: boolean;
  onToggleExpand: (code: LayerCode) => void;
}

function LayerNodeRow({
  layer,
  isFirst = false,
  isLast = false,
  isExpanded,
  onToggleExpand,
}: NodeRowProps) {
  const [hovered, setHovered] = useState(false);
  const isFrontier = layer.status === "active";
  const hoverQty = LAYER_HOVER_QUANTITY[layer.code];
  const hoverTraceVar = hoverQty
    ? `var(${PHYSICAL_TOKENS[hoverQty].cssVarTrace})`
    : "var(--ink-primary)";

  return (
    <div className="group relative grid grid-cols-[24px_1fr] gap-x-4">
      {/* Eje vertical continuo de borde a borde (0px de corte entre filas) */}
      <div className="relative flex justify-center" aria-hidden="true">
        {isFirst ? (
          <span className="absolute bottom-0 left-[11.5px] top-[15px] w-px bg-[var(--border-default)]" />
        ) : isLast ? (
          <span className="absolute left-[11.5px] top-0 h-[20px] w-px bg-[var(--border-default)]" />
        ) : (
          <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
        )}

        {/* Punto de estado monocromo (tinte físico solo al hover/foco si aplica) */}
        {isFrontier ? (
          <span className="relative z-10 mt-[6px] flex h-[17px] w-[17px] items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-canvas)]">
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--ink-primary)]" />
          </span>
        ) : (
          <span
            className="relative z-10 mt-[15.5px] h-[9px] w-[9px] rounded-full border-[1.25px] bg-[var(--bg-canvas)] transition-colors duration-150"
            style={{
              borderColor:
                hovered || isExpanded ? hoverTraceVar : "var(--border-strong)",
            }}
          />
        )}
      </div>

      {/* Contenido tipográfico puro (cero cajas; el padding vive aquí para no cortar el riel) */}
      <div className={cn("min-w-0", isFrontier ? "pb-7 pt-1" : "py-2.5")}>
        {isFrontier ? (
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="tabular-readout inline-block w-[2rem] shrink-0 text-xs font-medium text-[var(--ink-secondary)]">
                {layer.code}
              </span>
              <h3 className="text-[16px] font-medium tracking-[-0.015em] text-[var(--ink-primary)]">
                {layer.title}
              </h3>
            </div>
            <p className="mt-1.5 max-w-[56ch] pl-[2.5rem] text-[13.5px] leading-relaxed text-[var(--ink-secondary)]">
              {layer.subtitle}
            </p>
          </div>
        ) : (
          <div>
            <Tooltip.Root
              open={hovered && !isExpanded ? true : false}
              delayDuration={120}
            >
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => onToggleExpand(layer.code)}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                  onFocus={() => setHovered(true)}
                  onBlur={() => setHovered(false)}
                  className="focus-instrument flex w-full cursor-pointer items-baseline gap-x-2 rounded-[4px] text-left transition-colors duration-150"
                >
                  <span
                    className={cn(
                      "tabular-readout inline-block w-[2rem] shrink-0 text-xs transition-colors duration-150",
                      hovered || isExpanded
                        ? "text-[var(--ink-secondary)]"
                        : "text-[var(--ink-muted)]"
                    )}
                  >
                    {layer.code}
                  </span>
                  <span
                    className={cn(
                      "text-[14.5px] leading-snug tracking-[-0.01em] transition-colors duration-150",
                      hovered || isExpanded
                        ? "text-[var(--ink-primary)]"
                        : "text-[var(--ink-muted)]"
                    )}
                  >
                    {layer.title}
                  </span>
                </button>
              </Tooltip.Trigger>

              {/* Previsualización silenciosa debajo de la fila: no tapa las micro-leyendas de rama */}
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  collisionPadding={16}
                  className="pointer-events-none z-40 hidden max-w-[300px] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-secondary)] md:block"
                  style={{ boxShadow: "var(--shadow-popover)" }}
                >
                  <p>{layer.subtitle}</p>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            {/* Despliegue limpio por clic/toque (totalmente accesible en escritorio y móvil) */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="subtitle"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="pl-[2.5rem] pr-2 pt-1.5 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
                    {layer.subtitle}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export function CausalPath({ layers }: CausalPathProps) {
  const [expandedCode, setExpandedCode] = useState<LayerCode | null>(null);

  const byCode = new Map<LayerCode, LayerRecord>();
  for (const layer of layers) {
    byCode.set(layer.code, layer);
  }

  const toggleExpand = (code: LayerCode) => {
    setExpandedCode((prev) => (prev === code ? null : code));
  };

  const openingLayers = CAUSAL_LAYER_TOPOLOGY.openingTrunk
    .map((c) => byCode.get(c))
    .filter((l): l is LayerRecord => Boolean(l));

  const energyBranch = CAUSAL_LAYER_TOPOLOGY.branches[0];
  const fieldBranch = CAUSAL_LAYER_TOPOLOGY.branches[1];

  const energyLayers = energyBranch.layers
    .map((c) => byCode.get(c))
    .filter((l): l is LayerRecord => Boolean(l));

  const fieldLayers = fieldBranch.layers
    .map((c) => byCode.get(c))
    .filter((l): l is LayerRecord => Boolean(l));

  const convergenceLayers = CAUSAL_LAYER_TOPOLOGY.convergenceTrunk
    .map((c) => byCode.get(c))
    .filter((l): l is LayerRecord => Boolean(l));

  return (
    <Tooltip.Provider delayDuration={140} skipDelayDuration={250}>
      <motion.div
        initial={{ opacity: 0, clipPath: "inset(0 0 16% 0)" }}
        animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
        transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Tramo inicial: L0 → L1 */}
        <div>
          {openingLayers.map((layer, idx) => (
            <LayerNodeRow
              key={layer.code}
              layer={layer}
              isFirst={idx === 0}
              isLast={false}
              isExpanded={expandedCode === layer.code}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>

        {/* Bifurcación en escritorio: L1 se abre en Energía (L2–L4) y Campo (L5–L6) */}
        <div aria-hidden="true" className="relative hidden h-9 md:block">
          <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
          <span className="absolute left-[11.5px] top-[17px] h-[19px] w-[calc(50%+20.5px)] rounded-tr-[12px] border-r border-t border-[var(--border-default)]" />
        </div>

        {/* Dos ramas paralelas (en móvil se apilan con claridad causal) */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-10">
          {/* Rama 1: Energía (L2 → L3 → L4) */}
          <div className="relative flex flex-col">
            <div className="grid grid-cols-[24px_1fr] gap-x-4">
              <div className="relative" aria-hidden="true">
                <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
              </div>
              <p className="pb-2 pt-2 text-xs italic text-[var(--ink-muted)] md:pt-1">
                {energyBranch.legend}
              </p>
            </div>

            {energyLayers.map((layer) => (
              <LayerNodeRow
                key={layer.code}
                layer={layer}
                isFirst={false}
                isLast={false}
                isExpanded={expandedCode === layer.code}
                onToggleExpand={toggleExpand}
              />
            ))}

            <div aria-hidden="true" className="relative hidden flex-1 md:block">
              <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
            </div>
          </div>

          {/* Separador causal solo en móvil entre ambas ramas */}
          <div className="grid grid-cols-[24px_1fr] gap-x-4 md:hidden">
            <div className="relative" aria-hidden="true">
              <span className="absolute bottom-0 left-[11.5px] top-0 w-px border-l border-dashed border-[var(--border-default)]" />
            </div>
            <p className="py-3 text-[11px] text-[var(--ink-muted)]">
              En paralelo desde L1
            </p>
          </div>

          {/* Rama 2: Campo (L5 → L6), extendiendo su riel hasta la convergencia */}
          <div className="relative flex flex-col">
            <div className="grid grid-cols-[24px_1fr] gap-x-4">
              <div className="relative" aria-hidden="true">
                <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
              </div>
              <p className="pb-2 pt-0 text-xs italic text-[var(--ink-muted)] md:pt-1">
                {fieldBranch.legend}
              </p>
            </div>

            {fieldLayers.map((layer) => (
              <LayerNodeRow
                key={layer.code}
                layer={layer}
                isFirst={false}
                isLast={false}
                isExpanded={expandedCode === layer.code}
                onToggleExpand={toggleExpand}
              />
            ))}

            {/* Continuación silenciosa de la línea derecha en escritorio hasta el codo de convergencia */}
            <div aria-hidden="true" className="relative hidden flex-1 md:block">
              <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
            </div>
          </div>
        </div>

        {/* Convergencia en escritorio: ambas ramas se unen justo antes de L7 */}
        <div aria-hidden="true" className="relative hidden h-9 md:block">
          <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
          <span className="absolute left-[11.5px] top-0 h-[19px] w-[calc(50%+20.5px)] rounded-br-[12px] border-b border-r border-[var(--border-default)]" />
        </div>

        {/* Marca discreta de convergencia en móvil */}
        <div className="grid grid-cols-[24px_1fr] gap-x-4 md:hidden">
          <div className="relative min-h-full" aria-hidden="true">
            <span className="absolute bottom-0 left-[11.5px] top-0 w-px bg-[var(--border-default)]" />
          </div>
          <p className="py-3 text-[11px] text-[var(--ink-muted)]">
            Ambas ramas convergen
          </p>
        </div>

        {/* Tramo de convergencia e ingeniería: L7 → L11 */}
        <div>
          {convergenceLayers.map((layer, idx) => (
            <LayerNodeRow
              key={layer.code}
              layer={layer}
              isFirst={false}
              isLast={idx === convergenceLayers.length - 1}
              isExpanded={expandedCode === layer.code}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      </motion.div>
    </Tooltip.Provider>
  );
}
