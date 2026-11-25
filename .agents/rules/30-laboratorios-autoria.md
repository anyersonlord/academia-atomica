---
trigger: glob
globs: src/components/simulators/**, src/lib/physics/**, src/content/**, src/lib/schemas/**, src/lib/assets/**
description: Laboratorios 2D/3D e integridad de autoría
---

# Laboratorios e integridad de autoría

## Regla de oro de simulación
- **Núcleo físico** en `src/lib/physics/<dominio>/`: TypeScript puro, sin React ni DOM, con unidades SI explícitas en nombres o tipos, y probado en Vitest contra ecuaciones y valores de referencia con fuente citada.
- **Vista** en `src/components/simulators/`: solo renderiza el estado que entrega el núcleo. Prohibidas las animaciones decorativas y los valores inventados en la vista.
- Excepción documentada: `CalibrationOscilloscope` es un arnés de calibración de tokens (solo para `/design-system`). No se reutiliza como laboratorio sin extraer antes su física a un núcleo probado.
- Cada simulador se registra por `simulator_key` y se carga en diferido con `dynamic(() => import(…), { ssr: false })`.

## Presupuesto de GPU (3D con React Three Fiber, solo cuando un nodo o capa real lo exija)
- Como máximo **un** contexto WebGL activo a la vez. `dispose()` de geometrías, materiales y texturas al desmontar. Pausar el bucle cuando `document.hidden`, y usar `frameloop="demand"` si no hay animación física.
- Geometría paramétrica o procedural dirigida por el núcleo físico, más mallas `.glb` modulares por pieza. Colores tomados de `tokens.ts` según el tema.
- 2D (SVG/Canvas) por defecto. 3D solo si la geometría espacial forma parte del concepto.

## Activos
- Ningún componente usa rutas absolutas a activos. Siempre `resolveAssetUrl(key)` (`src/lib/assets/`) con `NEXT_PUBLIC_ASSET_BASE_URL` y respaldo local, para conectar Cloudflare R2 sin migraciones.

## Autoría de contenido
- Cero texto de relleno. Solo contenido entregado o validado por el autor: nada de "lorem", ejemplos ficticios ni datos técnicos sin fuente.
- El contenido se valida con Zod (`src/lib/schemas/`) antes de llegar a la base de datos. Cada nodo lleva `schema_version`.
- Marcadores: `{{term:slug}}` (Glosario Vivo), `{{recall:slug}}` (puente X ↔ YZ), `{{sim:key}}` (laboratorio). Todos los validadores referenciales y léxicos se ejecutan automáticamente en `pnpm test` y fallan si algún slug o clave no existe.
- Etapas 1–4: prohibido introducir la etiqueta técnica oficial del propio nodo. Se valida automáticamente en `pnpm test` sobre una lista explícita por nodo (`forbidden_terms`) con coincidencia de palabra o frase completa (evitando falsos positivos en español como `"par"` dentro de `"para"`). Se habilita en la Etapa 5.
- Una idea causal dominante por escena. Todo nodo de diseño enlaza su contraste (Etapa 6).
- Modificar contenido publicado incrementa `content_revision`. Un `slug` nunca se reutiliza ni se cambia.
