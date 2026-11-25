---
trigger: glob
globs: supabase/**, scripts/**, src/lib/supabase/**, src/proxy.ts, src/app/**/actions.ts, src/app/api/**, .env.example, .gitignore
description: Datos, Supabase y seguridad Zero-Trust
---

# Datos y Zero-Trust

## Secretos
- Los secretos viven solo en `.env.local` (excluido de Git). `.env.example` nunca lleva valores reales. Los valores que contienen `#` van entre comillas; dentro de una URI de Postgres, `#` se escribe `%23`.
- `SUPABASE_SECRET_KEY` solo se usa en scripts CLI y en `src/lib/supabase/admin.ts` (`import "server-only"`). Nunca se importa desde `src/app/**` ni desde componentes cliente.
- Antes de cada commit: escanear el diff en staging (`ghp_`, `sb_secret_`, contraseñas, JWT). Nunca persistir el token de GitHub en `.git/config`.

## Migraciones
- Solo en `supabase/migrations/NNNN_descripcion.sql`, idempotentes (`IF NOT EXISTS`, `DROP … IF EXISTS`) y dentro de `BEGIN/COMMIT`. Una migración ya aplicada no se reescribe: se crea la siguiente.
- Cada tabla nueva lleva: `ENABLE ROW LEVEL SECURITY` explícito, `REVOKE ALL … FROM anon`, `GRANT` mínimo y políticas con `USING` y `WITH CHECK`.
  - Tablas personales: `auth.uid() = user_id`.
  - Tablas curriculares: `SELECT` para `authenticated`; escritura solo para `service_role`.
- Funciones y triggers: `SET search_path = public` y `SECURITY INVOKER`, salvo justificación en un ADR.
- Grafos: trigger anti-ciclos (`WITH RECURSIVE`) en prerrequisitos y en composiciones. `CHECK (origen <> destino)` en toda arista.
- Identidad: `id` (UUID) y `slug` (`^[a-z0-9-]+$` sin guiones extremos y estrictamente **sin puntos**, para que `?via=a.b` sea inequívoco) son inmutables (trigger que rechaza su `UPDATE`). Todo cambio de contenido publicado incrementa `content_revision`.

## Progreso y notas del aprendiz
- El progreso, el ciclo N-6 previo (cuando un nodo simple pasa a compuesto) y las notas propias jamás se borran ni quedan huérfanos; se versionan referenciando `node_revision`, `note_kind` (`mental_image` | `living_synthesis`) y `scene_id` estable (nunca índice numérico).
- `ON DELETE CASCADE` hacia datos del aprendiz solo desde `auth.users`. Desde nodos curriculares se usa `RESTRICT` y archivado, nunca borrado en cascada.

## Verificación
- Después de migrar, `pnpm db:verify` debe pasar (RLS en todas las tablas, bloqueo de ciclos, rol anónimo bloqueado). Cada tabla nueva amplía ese script.

## Portabilidad
- Todo dato curricular y personal debe poder exportarse por CLI a JSON/Markdown local (`exports/`, excluido de Git).
- Evitar funciones propietarias que impidan replicar el esquema en PostgreSQL estándar.
