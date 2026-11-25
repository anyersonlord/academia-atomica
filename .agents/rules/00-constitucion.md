---
trigger: always_on
description: Constitución permanente de Academia Atómica — Grupos Electrógenos (siempre activa, innegociable)
---

# Constitución del proyecto

## 1. Axioma
- La unidad mínima es la **Lógica**. Todo fenómeno de un grupo electrógeno es consecuencia trazable de leyes más fundamentales.
- **Continuidad causal-cognitiva:** ningún concepto aparece sin que sus prerrequisitos existan antes como imagen mental consolidada. Cero cajas negras, cero saltos.
- El objetivo no es terminar, es que el aprendiz construya una imagen mental nítida. Profundidad antes que velocidad.

## 2. Producto
- Hub académico **exclusivo de grupos electrógenos** (sin arquitectura multi-disciplina). Usuario principal: el autor. Uso individual intensivo, con higiene `user_id` + RLS para poder crecer.
- **Organismo vivo:** cada nodo publicado es conocimiento que el autor ya integró. Prohibido redactar contenido en lote, texto de relleno o física inventada. El contenido real lo entrega y valida el autor.
- Doble naturaleza: curso desde cero + fuente de verdad (diagnóstico, mantenimiento, normativa). La segunda crece bajo demanda.

## 3. Modelo holónico
- Una sola entidad conceptual universal. Nada es "definitivamente sistema" ni "definitivamente pieza".
- Nodo sin hijos → ciclo N-6. Nodo con hijos (1 a 20+) → **Previsualización serena → Recorrido de partes → Síntesis Viva**.
- Composición muchos-a-muchos: una pieza existe una sola vez y participa en varios padres con su rol en el padre, su aporte de integración y dos órdenes distintos (estructural ≠ descubrimiento). Anti-ciclos en SQL.
- Transición sin pérdida: si un nodo que nació simple (con ciclo N-6 y notas propias) recibe hijos más adelante, no se destruye ni queda huérfano su contenido ni su historial; todo se preserva e integra en su Síntesis Viva. Si un nodo ya asimilado recibe hijos nuevos, la Síntesis Viva los integra y el nodo queda **Evolucionado**. Nunca se borran progreso ni notas.
- Relaciones tipadas: prerrequisito (DAG), composición, contraste, puente de recuerdo (X ↔ YZ).

## 4. Protocolo N-6 (nombres visibles)
1 Lo que ya sabes · 2 Algo no encaja · 3 Experimenta · 4 Constrúyela tú · 5 Ponle nombre · 6 Compáralo.
- Cada etapa se compone de micro-escenas secuenciales: **una idea causal dominante por escena**, cero scroll infinito.
- **Ninguna etiqueta técnica oficial antes de la Etapa 5.** Primero descubrimiento, luego imagen mental, al final el nombre.
- Compuertas deterministas, sin IA externa: predicción causal (Etapa 3) y nota propia (Etapa 4). La Etapa 4 activa el Modo Zen automático.
- Todo contraste se enseña en espejo (Etapa 6): con escobillas ↔ sin escobillas, Shunt ↔ PMG ↔ AREP, isócrono ↔ droop…

## 5. Leyes anti-"AI slop" (UI real)
1. Cero meta-lenguaje de desarrollo en la UI (hitos, RLS, Supabase, OKLCH, compuertas). `/design-system` es solo taller interno.
2. Cero "card-itis" y cero badges en mayúsculas repetidos: jerarquía tipográfica, espacio negativo, divisores sutiles.
3. Serena y cálida, nunca clínica ni abrumadora. Movimiento solo funcional (≤ 250 ms, respeta `prefers-reduced-motion`).
4. Revelación progresiva: una sola cosa con foco a la vez.
5. Estados vacíos honestos: "Contenido en preparación" en un espacio limpio, sin skeletons ni placeholders falsos.

## 6. Color físico inmutable (L0 → L11)
La estructura es monocromática. El color vivo es **solo** para magnitudes: `electric` (carga/electricidad), `magnetic` (campo), `thermal` (térmica/química), `mechanical` (fuerza/torque) y `signal` (control, reservado desde L8). Fuente única: `src/styles/tokens.css` ↔ `src/lib/design/tokens.ts` (OKLCH dentro de sRGB, WCAG verificado por tests). Prohibidos los hex sueltos y `#000000`.

## 7. Disciplina de trabajo
- Paso a paso con compuertas: proponer → aprobar → construir → verificar (tests, typecheck, lint, build con `CI=true`, navegador) → **detenerse** y mostrar.
- No adelantar módulos diferidos (pgvector, FSRS completo, 3D, FMEA/FTA) hasta que un nodo o capa real los exija.
- Al iniciar sesión: leer `docs/hoja-de-ruta.md`. Al cerrar un bloque: actualizarla. Toda decisión estructural nueva se registra como ADR en `docs/decisiones.md`. Si una petición contradice un ADR, señalarlo antes de actuar.
- Identificadores de código en inglés; UI y documentación en español.
