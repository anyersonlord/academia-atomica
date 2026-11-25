# Registro de decisiones arquitectónicas (ADR)

Formato breve: **Contexto → Decisión → Consecuencias**. Estados: `Aceptado` (vigente), `Aceptado en principio` (principio aprobado; detalle técnico pendiente del bloque indicado), `Reemplazado por ADR-NNN`.

Una decisión aceptada no se contradice en silencio: se reemplaza con un ADR nuevo.

---

### ADR-001 · Monolito modular
- **Estado:** Aceptado · 2026-11-23
- **Contexto:** Una sola aplicación, un usuario principal, sin panel admin ni API pública.
- **Decisión:** Un solo repositorio Next.js con fronteras internas estrictas: base de datos y reglas (Supabase), servidor (`server-only`, Server Actions), administración por CLI (`scripts/`) y dominio puro (`src/lib/`).
- **Consecuencias:** Sin Turborepo ni CORS. Si algún día hace falta `apps/admin` o `apps/api`, se mueve `src/lib` a `packages/` de forma mecánica.

### ADR-002 · Supabase con Zero-Trust y RLS explícito
- **Estado:** Aceptado · 2026-11-23
- **Decisión:** PostgreSQL de Supabase. RLS habilitado explícitamente en cada tabla, `anon` revocado, `GRANT` mínimo. La secret key solo se usa en CLI y en módulos `server-only`. Secretos únicamente en `.env.local`.
- **Consecuencias:** Toda tabla nueva amplía `scripts/db-verify-rls.ts`. Conexión por Session Pooler (IPv4) con `%23` en lugar de `#` dentro de la URI.

### ADR-003 · Dominio exclusivo de grupos electrógenos
- **Estado:** Aceptado · 2026-11-23
- **Decisión:** No se modela arquitectura multi-disciplina (`domains`). Foco total en un solo dominio.

### ADR-004 · Usuario único con higiene multiusuario
- **Estado:** Aceptado · 2026-11-23
- **Decisión:** Cuenta personal creada por CLI (`db:bootstrap-user`). Todo dato personal lleva `user_id` y RLS `auth.uid() = user_id`. Sin registro público, roles ni paneles administrativos.

### ADR-005 · Evaluación determinista sin IA externa
- **Estado:** Aceptado · 2026-11-23
- **Decisión:** Las compuertas del N-6 son interactivas y deterministas: simuladores, predicciones causales y notas propias. No hay dependencias de LLM en tiempo de ejecución.

### ADR-006 · Organismo vivo y crecimiento bajo demanda
- **Estado:** Aceptado · 2026-11-23 (ajustado 2026-11-25)
- **Decisión:** Se publica solo lo que el autor ya integró. Nada en lote ni de relleno. pgvector, FSRS completo, 3D, FMEA/FTA y NFPA 110 se diseñan únicamente cuando un nodo o capa real los exija.

### ADR-007 · Tokens OKLCH con color físico inmutable
- **Estado:** Aceptado · 2026-11-23
- **Decisión:** Tema dual (Dark Lab por defecto y Light Editorial). La estructura es monocromática. Cinco magnitudes físicas en OKLCH dentro del gamut sRGB, con traza y tinta separadas. Fuente única: `tokens.css` ↔ `tokens.ts`, verificada por tests (gamut, WCAG, paridad).

### ADR-008 · Leyes anti-"AI slop"
- **Estado:** Aceptado · 2026-11-23
- **Decisión:** Sin meta-lenguaje de desarrollo en la UI real, sin card-itis, revelación progresiva, calidez serena y estados vacíos honestos. `/design-system` es un taller interno fuera de la navegación.

### ADR-009 · Topología causal de capas y nodo raíz por estrato
- **Estado:** Aceptado · 2026-11-23 (ampliado 2026-11-25)
- **Decisión:** `L0 → L1 → {L2→L3→L4 | L5→L6} → L7 → … → L11` vive en `src/lib/ontology/layer-graph.ts`, con tests de aciclicidad y paridad con la siembra. `layers` se mantiene como índice de estratos y cada capa `L0–L11` enlaza su propio **nodo raíz** en `concept_nodes` para abrir directamente su Previsualización viva sin casos especiales.

### ADR-010 · TypeScript 6 fijado
- **Estado:** Aceptado · 2026-11-23
- **Contexto:** `typescript-eslint` (usado por `eslint-config-next`) no soporta TypeScript 7.
- **Decisión:** Mantener `typescript@^6` hasta que exista soporte oficial.

### ADR-011 · Modelo holónico: una sola entidad conceptual universal y transición sin pérdida
- **Estado:** Aceptado · 2026-11-25 · esquema en el Bloque 1.3B-1
- **Contexto:** Las tablas rígidas por nivel (sistema, subsistema, componente, átomo) impiden que una pieza "final" pueda abrirse en sus partes.
- **Decisión:** Una sola entidad de nodo (`concept_nodes`) bajo la ruta canónica única `/nodo/[slug]` (retirando `/atomo/[slug]`). Si no tiene hijos, sigue el ciclo N-6. Si los tiene (1 a 20+), adquiere Previsualización → Recorrido de partes → Síntesis Viva. Cuando un nodo que nació Simple (con ciclo N-6 y notas del autor) recibe hijos después, ni su contenido ni su historial quedan huérfanos: todo se preserva e integra en su Síntesis Viva.
- **Consecuencias:** `concept_atoms` evoluciona hacia `concept_nodes` mediante migración nueva, sin reescribir la 0001.

### ADR-012 · Composición M:N con anti-ciclos, agrupación, doble orden y pila `?via=`
- **Estado:** Aceptado · 2026-11-25 · esquema en el Bloque 1.3B-1
- **Decisión:** Tabla `node_compositions` padre ↔ hijo con `role_in_parent`, aporte de integración, `group_label` opcional (para agrupar 10–20+ hijos sin abrumar), `structural_order` y `discovery_order` separados, y trigger anti-ciclos. Si un nodo asimilado recibe hijos nuevos, pasa a **Evolucionado** sin perder progreso ni notas. La Brújula de Profundidad usa `/nodo/[slug]?via=padre-a.padre-b`, restringiendo `slug` a `^[a-z0-9-]+$` (sin puntos) y aplicando sanitización silenciosa + colapso de bucles.

### ADR-013 · Grafo semántico tipado y Recuerdo Contextual
- **Estado:** Aceptado · 2026-11-25 · esquema en el Bloque 1.3B-1
- **Decisión:** Relaciones tipadas en `node_relations` (`prerequisite`, `contrast`, `recall_bridge`) con `strength` y `context_note` opcional (eje de contraste o motivo del puente). Anti-ciclos en SQL para `prerequisite`. Desde una etapa de X, el aprendiz abre in situ una ficha con su propia nota de YZ.

### ADR-014 · Protocolo N-6 por micro-escenas, validador léxico y prioridad de `Esc`
- **Estado:** Aceptado · 2026-11-24 (ajustado 2026-11-25)
- **Decisión:** Cada etapa contiene escenas secuenciales con `scene_id` estable inmutable y una idea causal dominante. La etiqueta oficial antes de Etapa 5 se bloquea en `pnpm test` mediante una lista explícita `forbidden_terms` por nodo con coincidencia de palabra/frase completa. La Etapa 4 activa Modo Zen y bloquea `Enter`, `→`, `←`, `Z`, `[` al escribir, mientras `Esc` opera con prioridad escalonada (cierra popover abierto primero; si no hay popover, sale de Zen conservando el texto).

### ADR-015 · Núcleo físico separado de la vista; 3D bajo demanda
- **Estado:** Aceptado · 2026-11-24
- **Decisión:** La física pura vive en `src/lib/physics/` y se prueba en Vitest. La vista (SVG/Canvas/R3F) solo renderiza estado. Los simuladores se cargan en diferido por `simulator_key`, con un solo contexto WebGL a la vez, `dispose` al desmontar y pausa con la pestaña oculta. Los activos se resuelven con `resolveAssetUrl(key)` y `NEXT_PUBLIC_ASSET_BASE_URL`, listos para Cloudflare R2.

### ADR-016 · Identidad inmutable, revisiones por nodo y notas tipadas portables
- **Estado:** Aceptado · 2026-11-24 (ajustado 2026-11-25)
- **Decisión:** `id` y `slug` (`^[a-z0-9-]+$`) inmutables por trigger, `content_revision` por nodo completo en `node_revisions`, y notas en `user_node_notes` ancladas a `node_revision` + `note_kind` (`mental_image` | `living_synthesis`) + `scene_id` estable. Validadores de `{{term:}}`, `{{recall:}}` y `{{sim:}}` ejecutados en `pnpm test`. Exportación CLI completa a JSON/Markdown local.

### ADR-017 · Reglas permanentes del workspace
- **Estado:** Aceptado · 2026-11-24
- **Decisión:** Constitución `always_on` breve en `.agents/rules/00-constitucion.md`, reglas modulares por glob (`10`, `20`, `30`), `GEMINI.md` como mapa operativo sin duplicar la constitución, y documentación extensa en `docs/` (se lee bajo demanda).
- **Consecuencias:** El contexto siempre cargado se mantiene muy por debajo del presupuesto de reglas. Cualquier cambio constitucional exige un ADR.
