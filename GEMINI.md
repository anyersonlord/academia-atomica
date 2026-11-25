# GEMINI.md — Mapa operativo del workspace

> La constitución del proyecto se carga siempre desde `.agents/rules/00-constitucion.md`. Este archivo no la repite: solo indica **dónde está cada cosa y cómo se trabaja aquí**.

## Antes de actuar
1. Lee `docs/hoja-de-ruta.md` para saber en qué bloque estamos y cuál es la siguiente compuerta.
2. Si la tarea toca estructura (datos, modelo holónico, simuladores), revisa `docs/decisiones.md`. Si una petición contradice un ADR vigente, dilo antes de escribir código.
3. Trabaja solo dentro del bloque aprobado. Al terminar, verifica, actualiza la hoja de ruta y **detente** para la auditoría.

## Mapa de documentación
| Documento | Para qué sirve |
| :--- | :--- |
| `docs/hoja-de-ruta.md` | Estado vivo: bloques cerrados, bloque actual y siguientes compuertas |
| `docs/decisiones.md` | ADRs: decisiones vigentes contra la deriva arquitectónica |
| `docs/arquitectura.md` | Modelo holónico, grafo semántico, capas del sistema y flujo de datos |
| `docs/ontologia-grupos-electrogenos.md` | Mapa causal L0–L11 y ejes canónicos de contraste en espejo |
| `docs/protocolo-n6.md` | Ciclo neuroeducativo por escenas y estados holónicos |
| `docs/sistema-de-diseno.md` | Tokens, tipografía, composición y patrones de interfaz |
| `docs/guia-de-autoria.md` | Cómo se entrega, valida e ingesta un nodo real |
| `docs/seguridad-y-portabilidad.md` | Matriz RLS Zero-Trust, inmutabilidad y exportación local |
| `docs/operaciones.md` | Comandos, verificación, base de datos, Git y validación en navegador |

## Reglas por carpeta (se cargan solas por glob)
- `supabase/**`, `scripts/**`, `src/lib/supabase/**`, `src/app/api/**` → `.agents/rules/10-datos-zero-trust.md`
- `src/app/**`, `src/components/**`, `src/styles/**` → `.agents/rules/20-diseno-neurovisual.md`
- `src/components/simulators/**`, `src/lib/physics/**`, `src/content/**`, `src/lib/schemas/**`, `src/lib/assets/**` → `.agents/rules/30-laboratorios-autoria.md`

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 strict · Tailwind CSS v4 · Radix UI · Motion · KaTeX · Zod 4 · Vitest · Supabase (PostgreSQL + Auth + RLS) · pnpm. Monolito modular (ADR-001).

## Comandos (Windows: siempre con `cmd /c`, nunca en modo watch)
```powershell
cmd /c "pnpm test && pnpm typecheck && pnpm lint && set CI=true && pnpm run build"   # verificación completa
cmd /c "pnpm db:migrate && pnpm db:verify"                                          # migrar y auditar RLS
cmd /c "pnpm dev -p 3140"                                                           # servidor local (3000 suele estar ocupado)
```

## Convenciones
- Código e identificadores en inglés. UI, comentarios de dominio y documentación en español.
- Rutas con alias `@/`. Lógica pura en `src/lib/**`, sin React, probada en `tests/**`.
- Commits en Conventional Commits, con cuerpo descriptivo y sin secretos (escanear el staging antes de hacer push).
