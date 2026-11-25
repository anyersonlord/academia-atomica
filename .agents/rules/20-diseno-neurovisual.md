---
trigger: glob
globs: src/app/**, src/components/**, src/styles/**
description: Diseño y ergonomía neuro-visual de la interfaz
---

# Diseño y ergonomía neuro-visual

## Tokens
- Solo variables de `tokens.css` (`--bg-*`, `--ink-*`, `--border-*`, `--phys-*`). Prohibidos hex/rgb sueltos en componentes; los lienzos Canvas leen `tokens.ts`.
- Superficies: Dark Lab `#0A0C10 → #11141B → #171B24`; Light Editorial `#F8F9FA → #F1F3F6 → #FFFFFF`. Bordes de 1 px rgba. Sin sombras salvo en elementos flotantes (`--shadow-popover`). Sin gradientes decorativos.
- Texto pequeño con color físico: `--phys-*-ink`. Trazas gráficas: `--phys-*`.

## Tipografía y ritmo
- Geist para prosa e interfaz; Geist Mono para instrumentación. Prosa socrática con `.socratic-prose` (≤ 68ch, 17 px, interlineado 1.72).
- Todo número, unidad, slider, código de nodo o progreso usa `.tabular-readout` (tabular-nums).
- Ecuaciones solo con `<MathFormula>` (KaTeX). Términos del glosario solo con `<GlossaryTerm>`, sin desplazar el layout.
- Sentence case en español. En la UI real, etiquetas pequeñas en minúsculas normales; nada de MAYÚSCULAS repetidas.

## Composición
- Menos cajas, más aire. En el Workbench, el único elemento enmarcado es el lienzo del laboratorio.
- Padres con 10–20+ hijos: agrupación (`group_label`) o revelación progresiva centrada en el paso activo; prohibido volcar listas planas donde todos los hijos compitan con el mismo peso visual.
- Cero salto de layout en hover. Lo que se despliega se abre con clic o toque accesible (`aria-expanded`).
- Movimiento ≤ 250 ms con ease `[0.22, 1, 0.36, 1]`, solo funcional. Respetar `prefers-reduced-motion` (`MotionConfig reducedMotion="user"`).
- Móvil desde el primer día: sin desborde horizontal a 360 px.

## Workbench y navegación
- Ruta canónica universal: `/nodo/[slug]` (se retira `/atomo/[slug]`).
- Una etapa y una escena con foco a la vez. Rail lateral colapsado por defecto. El lienzo sticky aparece solo cuando la escena lo pide.
- La Etapa 4 activa el Modo Zen automático. Los atajos `Enter`, `→`, `←`, `Z` y `[` se desactivan mientras el foco esté en `input`, `textarea`, `select` o `contenteditable`. `Esc` opera con prioridad escalonada: el primer `Esc` cierra cualquier popover abierto (Glosario o Recuerdo) sin salir de Zen; si no hay popover abierto, sale de Modo Zen conservando intacto el texto escrito.
- Brújula de Profundidad: miga de pan fractal + retorno al padre exacto desde el que se entró (`/nodo/[slug]?via=padre-a.padre-b`, con sanitización silenciosa y colapso/deduplicación de bucles para que la URL nunca crezca sin cota), mostrando el rol del hijo dentro de ese padre.
- Ficha de Recuerdo Contextual (X ↔ YZ): popover discreto con la nota propia del aprendiz, sin abandonar la escena actual.

## Accesibilidad
- Contraste WCAG AA como mínimo (verificado en `tests/design-tokens.test.ts`). Foco visible con `.focus-instrument`. Radix para primitivas interactivas. `lang="es"`.

## Servidor y cliente
- Server Components por defecto; `"use client"` solo donde hay interacción.
- Los datos del aprendiz se leen siempre con el cliente SSR con sesión (RLS), nunca con la secret key.
