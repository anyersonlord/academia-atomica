# Seguridad Zero-Trust y portabilidad del conocimiento

> Referencia consolidada de fronteras de seguridad, aislamiento en PostgreSQL y soberanía local de datos. Decisiones: ADR-002, ADR-004 y ADR-016. Regla activa asociada: `.agents/rules/10-datos-zero-trust.md`.

## 1. Fronteras de confianza

1. **Navegador (no confiable):** solo recibe `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Toda lectura o escritura depende de la sesión autenticada (`auth.uid()`) y de las políticas RLS en PostgreSQL.
2. **Servidor Next.js (`server-only`):** lee y refresca cookies HTTP de sesión mediante `@supabase/ssr`. Nunca expone claves administrativas al cliente.
3. **CLI administrativa (`scripts/`):** único entorno autorizado a usar `SUPABASE_SECRET_KEY` y `DATABASE_URL` para migrar esquema, sembrar nodos validados, auditar seguridad y exportar respaldos locales.
4. **Motor PostgreSQL:** última línea de defensa. Aunque existiera un fallo en la capa de aplicación, el motor impide accesos cruzados (RLS), ciclos en grafos (triggers recursivos) y mutaciones de identidad (`id`, `slug`).

## 2. Matriz de privilegios y RLS

| Categoría de tabla | Rol `anon` | Rol `authenticated` | Rol `service_role` (solo CLI) | Condición RLS |
| :--- | :--- | :--- | :--- | :--- |
| Interna (`schema_migrations`) | Revocado | Revocado | Completo | Sin políticas de cliente |
| Curricular (`layers`, `concept_nodes`, `node_compositions`, `node_relations`, `node_revisions`, `glossary_terms`) | Revocado | `SELECT` | Completo | `USING (true)` solo lectura para `authenticated`; `node_revisions` es *append-only* |
| Progreso y preferencias (`user_node_progress`, `user_workspace_preferences`) | Revocado | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | Completo | `USING (auth.uid() = user_id)` y `WITH CHECK (auth.uid() = user_id)` |
| Notas propias (`user_node_notes`) | Revocado | `SELECT`, `INSERT`, `UPDATE` (**`DELETE` revocado**) | Completo | `auth.uid() = user_id`; anclas inmutables y solo editable mientras `node_revision = content_revision` vigente (`ON DELETE CASCADE` únicamente desde `auth.users`) |

> En este proyecto de Supabase las opciones de concesión automática y RLS automático están desactivadas a nivel de plataforma; por tanto, **cada migración SQL debe declarar `GRANT`, `REVOKE` y `ENABLE ROW LEVEL SECURITY` de forma explícita**.

## 3. Invariantes de integridad del conocimiento

1. **Identidad inmutable:** una vez creado un nodo, su `id` (UUID) y su `slug` (`^[a-z0-9-]+$`, sin puntos) no pueden modificarse. Los enlaces externos, la pila `?via=padre-a.padre-b` de la Brújula de Profundidad (`/nodo/[slug]`) y las notas personales dependen de esta garantía.
2. **Evolución sin pérdida:** ningún nodo con notas asociadas se elimina en cascada (`ON DELETE RESTRICT`); si queda obsoleto se archiva. Editar contenido publicado incrementa `content_revision` por nodo completo en `node_revisions`. Cuando un nodo que nació Simple (con ciclo N-6 y notas propias) recibe hijos más adelante, ni su contenido ni su historial quedan huérfanos: todo se preserva e integra en su Síntesis Viva.
3. **Notas intocables:** las notas propias del aprendiz registran `node_revision`, `note_kind` (`mental_image` | `living_synthesis`) y `scene_id` estable inmutable. Si el nodo evoluciona o suma hijos nuevos, el sistema marca el estado **Evolucionado** pero jamás borra ni pisa el texto del aprendiz.
4. **Aciclicidad en base de datos:** tanto las aristas de prerrequisito como las de composición muchos-a-muchos validan ausencia de ciclos mediante triggers `BEFORE INSERT OR UPDATE` con `WITH RECURSIVE`.

## 4. Higiene de credenciales y repositorio público

El repositorio remoto (`anyersonlord/academia-atomica`) es público. Se aplican cuatro controles obligatorios:
- `.env.local` y `/exports/` están excluidos en `.gitignore`.
- En `.env.local`, cualquier contraseña con `#` se escribe entre comillas; en cadenas URI de PostgreSQL, `#` se codifica como `%23`.
- El token personal de GitHub no se guarda en `.git/config`; solo se inyecta de forma efímera al hacer `git push`.
- Antes de cada commit se inspecciona `git diff --cached` verificando ausencia total de claves, contraseñas, tokens e identificadores internos del proyecto en la nube.

## 5. Soberanía y portabilidad local (`exports/`)

Para evitar dependencia de proveedor (*vendor lock-in*), el Bloque 1.3B-1 incorpora exportación local determinista por CLI a la carpeta `exports/` (ignorada por Git):
- **JSON estructurado completo (`bundle.json`):** estratos, nodos, revisiones, composiciones M:N, relaciones semánticas, glosario, progreso, notas propias y preferencias de espacio de trabajo (`user_workspace_preferences`), todo con orden determinista.
- **Espejo legible en Markdown:** un archivo `.md` limpio por nodo con sus etapas, escenas, referencias y el historial cronológico de notas personales del autor, legible sin necesidad de base de datos ni navegador.
