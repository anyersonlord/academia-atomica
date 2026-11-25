# Academia Atómica — Grupos Electrógenos

Hub académico neuroeducativo sobre grupos electrógenos: de la partícula a la planta, sin saltos. Cada concepto se construye por descubrimiento guiado (Protocolo N-6) y cada sistema se recorre como un holón: primero el conjunto, luego sus partes y al final su síntesis viva.

> Proyecto en construcción progresiva. Cada nodo publicado es conocimiento validado por su autor; no existe contenido de relleno.

## Inicio rápido
Requisitos: Node 24+, pnpm 12+, un proyecto de Supabase.

```powershell
pnpm install
copy .env.example .env.local        # completar valores reales (nunca se suben a Git)
cmd /c "pnpm db:migrate && pnpm db:seed:layers && pnpm db:bootstrap-user && pnpm db:verify"
cmd /c "pnpm dev -p 3140"
```

Abre `http://localhost:3140` e inicia sesión con la cuenta definida en `BOOTSTRAP_USER_EMAIL` / `BOOTSTRAP_USER_PASSWORD`.

## Documentación
| Documento | Contenido |
| :--- | :--- |
| [Hoja de ruta](docs/hoja-de-ruta.md) | Estado actual y siguientes compuertas |
| [Decisiones (ADR)](docs/decisiones.md) | Decisiones arquitectónicas vigentes |
| [Arquitectura](docs/arquitectura.md) | Modelo holónico, grafo semántico y capas del sistema |
| [Ontología L0–L11](docs/ontologia-grupos-electrogenos.md) | Estratos causales y ejes de contraste del dominio |
| [Protocolo N-6](docs/protocolo-n6.md) | Ciclo neuroeducativo por escenas |
| [Sistema de diseño](docs/sistema-de-diseno.md) | Tokens OKLCH, tipografía y patrones |
| [Guía de autoría](docs/guia-de-autoria.md) | Cómo se crea e ingesta un nodo real |
| [Seguridad y portabilidad](docs/seguridad-y-portabilidad.md) | Modelo Zero-Trust, RLS y respaldo local |
| [Operaciones](docs/operaciones.md) | Comandos, verificación, base de datos y Git |

Las reglas permanentes del asistente de IA están en `.agents/rules/` y `GEMINI.md`.

## Estructura
```text
.agents/rules/        reglas permanentes (constitución + reglas por carpeta)
docs/                 documentación y ADRs
supabase/migrations/  esquema SQL versionado con RLS
scripts/              CLI de migración, siembra, verificación y auditoría
src/app/              rutas (/, /acceso, /design-system)
src/components/       interfaz (path, glossary, simulators, ui, providers)
src/lib/              lógica pura (design, ontology, supabase)
src/styles/tokens.css fuente única de los tokens de diseño
tests/                pruebas Vitest (tokens, grafos)
```

## Licencia
Pendiente de definir por el autor.
