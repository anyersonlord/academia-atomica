# Protocolo N-6

> Ciclo neuroeducativo de cada nodo simple. Decisiones: ADR-005 y ADR-014. Implementación del chasis: Bloque 1.3B-3.

## Fundamento
| Mecanismo | Base | Cómo se aplica |
| :--- | :--- | :--- |
| Activar lo previo | Teoría de carga cognitiva (Sweller) | La Etapa 1 conecta con lo que el aprendiz ya domina |
| Conflicto antes que respuesta | Fracaso productivo (Kapur), PFL (Schwartz y Bransford) | La Etapa 2 plantea un fenómeno que el modelo previo no explica |
| Doble codificación | Paivio | Escena verbal + laboratorio visual sincronizado |
| Generación propia | Interrogación elaborativa, efecto de generación | Etapa 3 (predicción) y Etapa 4 (nota propia) |
| Nombre al final | Formación de conceptos | La etiqueta oficial llega en la Etapa 5, sobre una imagen ya formada |
| Contraste | Casos contrastivos | La Etapa 6 compara con su opuesto o variantes |
| Consolidación | Sistemas complementarios de aprendizaje | Repaso espaciado (FSRS completo diferido) |

## Las seis etapas
| # | Nombre visible | Propósito | Compuerta | Lienzo |
| :-: | :--- | :--- | :--- | :--- |
| 1 | Lo que ya sabes | Anclar en prerrequisitos asimilados | — | Oculto |
| 2 | Algo no encaja | Fenómeno observable que pide una explicación nueva | — | Si el fenómeno es visual |
| 3 | Experimenta | Manipular y descubrir la relación causal | Predicción causal registrada | Laboratorio activo |
| 4 | Constrúyela tú | Formular la imagen mental con palabras propias | Nota propia (longitud mínima) | **Modo Zen automático** |
| 5 | Ponle nombre | Término oficial, ecuación, norma | — | Referencia |
| 6 | Compáralo | Espejo frente al opuesto o las variantes | — | Espejo |

## Escenas
- Cada etapa contiene **1 a N escenas** secuenciales identificadas por un `scene_id` textual estable e inmutable (nunca por posición numérica), y cada escena tiene **una idea causal dominante**.
- Navegación: una escena con foco a la vez, con transición de 220 ms (fundido + 8 px). Sin scroll infinito.
- Las etapas completadas se pueden releer; las futuras están bloqueadas en silencio.
- Atajos: `Enter` o `→` continuar, `←` volver, `Z` Zen y `[` rail **se desactivan mientras el foco esté en `input`, `textarea`, `select` o `contenteditable`**. `Esc` opera con **prioridad escalonada**: el primer `Esc` cierra cualquier popover abierto (Glosario o Recuerdo) sin salir de Zen; si no hay popover abierto, sale de Modo Zen conservando intacto el texto escrito.

## Reglas de contenido
1. Antes de la Etapa 5 no aparece la etiqueta técnica oficial del propio nodo: se valida automáticamente en `pnpm test` contra una lista explícita por nodo (`forbidden_terms`) usando coincidencia de palabra o frase completa (sin falsos positivos por subcadenas como `"par"` en `"para"`).
2. Todo término técnico ajeno ya asimilado se marca con `{{term:slug}}`. Los conceptos previos se evocan con `{{recall:slug}}`. Todos los validadores referenciales corren en `pnpm test`.
3. Cada escena del laboratorio declara `{{sim:key}}`. Un simulador inexistente hace fallar `pnpm test`.
4. Ningún nodo de diseño se publica sin su Etapa 6 (contraste).

## Relación con el modelo holónico
- **Nodo simple:** recorre N-6 completo (su nota propia se guarda con `note_kind = 'mental_image'`).
- **Nodo compuesto:** Previsualización (orientación del conjunto, sin nombres técnicos nuevos) → recorrido de sus partes (agrupadas con `group_label` o revelación progresiva cuando hay 10–20+ partes, nunca como lista plana) → Síntesis Viva (escena integradora que exige explicar cómo trabajan juntas, guardando la nota con `note_kind = 'living_synthesis'`).
- **Transición Simple → Compuesto sin pérdida:** si un nodo que nació simple (con ciclo N-6, progreso y notas del autor) recibe hijos más adelante, no se destruye ni queda huérfano su contenido ni su historial; todo se preserva e integra en su Síntesis Viva.
- **Nodo evolucionado:** la Síntesis Viva se reabre solo para integrar las partes nuevas. La nota anterior queda visible como versión previa.

## Estados de progreso (objetivo)
`locked` → `ready` → `in_progress` (etapa/escena) → `assimilated` (con revisión) → `evolved` (hay partes nuevas sin integrar).
