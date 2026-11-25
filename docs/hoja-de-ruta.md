# Hoja de ruta viva

> Fuente de verdad del avance. Se actualiza al cerrar cada bloque. Última actualización: 2026-11-25.

## Estado actual
**Bloque 1.3B-1 — Propuesta técnica de esquema holónico, contratos Zod, tests de grafos y portabilidad CLI.** Pendiente de aprobación del autor antes de implementar y migrar.

## Bloques cerrados
| Bloque | Resultado | Commit |
| :--- | :--- | :--- |
| Hito 1.1 · Cimiento Zero-Trust | Next.js 16 + Supabase, migración 0001 con RLS en 7 tablas, trigger anti-ciclos, 12 capas sembradas, usuario único | `078a275` |
| Hito 1.2 · Design System | Tokens OKLCH (tema dual + 5 magnitudes), primitivas (KaTeX, slider, glosario, osciloscopio), `/design-system` | `078a275` |
| Hito 1.3A · Portada | Camino causal guiado en `/`, `/acceso` sin jerga, redirección silenciosa, cierre de sesión en servidor | `078a275` |
| Parada 0 · Constitución y Docs | Reglas permanentes en `.agents/rules/`, `GEMINI.md`, `README.md` y suite institucional `docs/` con ADRs 001–017 | Cierre Parada 0 |

## Próximas compuertas
| Orden | Bloque | Alcance | Compuerta |
| :-: | :--- | :--- | :--- |
| 1 | **1.3B-1** | Migración holónica `0002` (nodos universales, nodo raíz por capa, composiciones M:N con `group_label`, relaciones tipadas con `context_note`, revisiones por nodo, notas `mental_image`/`living_synthesis` con `scene_id` estable) + contratos Zod + validadores (`forbidden_terms`, referencias, `?via=`) + `pnpm export`. Sin UI. | Revisión de esquema y tests |
| 2 | **1.3B-2** | `/` conectada al flujo holónico (`/nodo/[slug]`): Previsualización → partes (1 a 20+ con agrupación/revelación progresiva) → Síntesis Viva + Brújula de Profundidad (`?via=`) + cierre de escala tipográfica | Auditoría en navegador |
| 3 | **1.3B-3** | Workbench N-6 por escenas encadenadas en `/nodo/[slug]`, prioridad escalonada de `Esc`, ficha de Recuerdo X ↔ YZ, lienzo multimedia 2D/3D listo, estado "Contenido en preparación" | Compuerta Visual #2 |
| 4 | **1.4** | Calibración con el primer nodo real `L0.1`, entregado por el autor | Validación pedagógica del autor |

## Diferido bajo demanda (ADR-006 — hasta que un nodo o capa real lo exija)
pgvector y búsqueda semántica · FSRS completo · React Three Fiber · tablas FMEA/FTA · protocolos NFPA 110 · calculadoras de ingeniería · Cloudflare R2.

## Decisiones calibradas para 1.3B-1 (aprobadas 2026-11-25)
1. **Conexión Capa ↔ Holón:** cada estrato `L0–L11` conserva `layers` como índice y tiene su propio **nodo raíz** en `concept_nodes` para abrir directamente su Previsualización viva.
2. **Ruta canónica y pila `?via=`:** ruta única `/nodo/[slug]?via=padre-a.padre-b` (se retira `/atomo/[slug]`), `slug` restringido a `^[a-z0-9-]+$` (sin puntos) y sanitización silenciosa + colapso/deduplicación de bucles.
3. **Revisiones y notas:** versionado por nodo completo en `node_revisions` (`content_revision`), anclando cada nota propia a `node_revision` + `note_kind` (`mental_image` | `living_synthesis`) + `scene_id` estable inmutable.
