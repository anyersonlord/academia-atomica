# Operaciones

> Reglas de ejecución en Windows: siempre `cmd /c`, nunca modos watch ni comandos interactivos, y builds con `CI=true`.

## Comandos
| Comando | Qué hace |
| :--- | :--- |
| `pnpm dev -p 3140` | Servidor de desarrollo (el puerto 3000 suele estar ocupado) |
| `pnpm test` | Vitest (`tests/**/*.test.ts`) |
| `pnpm typecheck` | `tsc --noEmit` estricto |
| `pnpm lint` | ESLint (`eslint-config-next`) |
| `pnpm run build` | Build de producción (con `CI=true`) |
| `pnpm db:migrate` | Aplica `supabase/migrations/*.sql` sobre `DATABASE_URL` |
| `pnpm db:seed:layers` | Sincroniza el esqueleto L0–L11 |
| `pnpm db:bootstrap-user` | Crea o sincroniza la cuenta personal desde `.env.local` |
| `pnpm db:verify` | Auditoría Zero-Trust: RLS, capas, bloqueo de ciclos, rol anónimo |
| `pnpm exec tsx scripts/audit-tokens.ts` | Informe de gamut y contraste de los tokens físicos |

## Verificación completa (antes de cada compuerta y de cada commit)
```powershell
cmd /c "pnpm test && pnpm typecheck && pnpm lint && set CI=true && pnpm run build"
```
Criterio: código de salida 0, ESLint sin errores ni advertencias y ningún proceso Node colgado.

## Validación en navegador (estado actual)
1. Sin sesión, `/` redirige a `/acceso`. Cero jerga técnica.
2. Al entrar, `/` muestra la frontera y el camino causal. Hover sin saltos, clic o toque para desplegar, ambos temas y móvil a 390 px.
3. El monograma `A` → "Cerrar sesión" devuelve a `/acceso`.
4. `/design-system` (URL directa): las 5 trazas alineadas y el osciloscopio a 60 FPS.

## Variables de entorno
Plantilla en `.env.example`. Valores reales solo en `.env.local`. Si un valor contiene `#`, va entre comillas; dentro de una URI de Postgres, `#` se escribe `%23`.

## Git
- Ramas: `main` estable. Commits en Conventional Commits con cuerpo descriptivo.
- Antes de hacer push: escanear el staging en busca de secretos (`ghp_`, `sb_secret_`, contraseñas) y comprobar que `.env.local` aparece en `git check-ignore`.
- El token de GitHub nunca se guarda en `.git/config`; se pasa solo en la ejecución.
- Remoto: `https://github.com/anyersonlord/academia-atomica` (público: jamás subir datos sensibles).

## Respaldo y portabilidad (objetivo, 1.3B-1)
`pnpm export` → `exports/` (excluido de Git) con JSON completo y Markdown legible de nodos, relaciones, progreso y notas.
