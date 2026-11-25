# Sistema de diseño

> Estética: instrumentación científica de precisión + diseño editorial moderno. Decisiones: ADR-007 y ADR-008. Taller de calibración: `/design-system` (interno).

## Superficies y tintas
| Rol | Variable | Dark Lab | Light Editorial |
| :--- | :--- | :-: | :-: |
| Base | `--bg-canvas` | `#0A0C10` | `#F8F9FA` |
| Panel | `--bg-panel` | `#11141B` | `#F1F3F6` |
| Elevada | `--bg-elevated` | `#171B24` | `#FFFFFF` |
| Pozo de instrumento | `--bg-recessed` | `#07090D` | `#EDF0F4` |
| Interactiva | `--bg-interactive` | `#1E2430` | `#E6EBF1` |
| Tinta primaria | `--ink-primary` | `#EAECEF` | `#11151E` |
| Tinta secundaria | `--ink-secondary` | `#9BA3B4` | `#475162` |
| Tinta atenuada | `--ink-muted` | `#7F889C` | `#5B6578` |

Bordes: `--border-subtle`, `--border-default` y `--border-strong` (1 px rgba).

## Color físico (OKLCH, inmutable de L0 a L11)
| Magnitud | Traza | Tinta de texto | Uso |
| :--- | :--- | :--- | :--- |
| Eléctrica | `--phys-electric` | `--phys-electric-ink` | Carga, potencial, corriente, ondas |
| Magnética | `--phys-magnetic` | `--phys-magnetic-ink` | Flujo, campo, inducción |
| Térmica / química | `--phys-thermal` | `--phys-thermal-ink` | Enlaces, combustión, calor |
| Mecánica | `--phys-mechanical` | `--phys-mechanical-ink` | Fuerza, par, inercia |
| Señal / control | `--phys-signal` | `--phys-signal-ink` | Reservado desde L8 |

Garantías verificadas por tests: todo dentro del gamut sRGB, tintas con contraste ≥ 4.5:1, trazas ≥ 3:1, paridad CSS ↔ TS y cero `#000000`.

## Tipografía
- Geist (prosa e interfaz) y Geist Mono (instrumentación, `.tabular-readout`).
- Prosa socrática: `.socratic-prose` (68ch, 17 px, interlineado 1.72).
- Títulos en sentence case con tracking negativo leve. Etiquetas pequeñas en minúsculas normales.
- **Escala jerárquica pendiente de cierre fino:** la escala tipográfica explícita para títulos de nodos holónicos, Previsualizaciones y encabezados de escena se cerrará formalmente en el **Bloque 1.3B-2**.

## Patrones aprobados
| Patrón | Dónde | Notas |
| :--- | :--- | :--- |
| Camino causal | `/` (`CausalPath`) | Riel de 1 px, bifurcación y convergencia exactas, monocromo en reposo, tinte físico sutil en hover |
| Frontera | `/` | Una sola línea de foco; estado honesto "En preparación" |
| Recorrido de 10–20+ partes | `/nodo/[slug]` *(1.3B-2)* | Agrupación semántica (`group_label`) o revelación progresiva centrada en el paso activo; prohibido volcar listas planas donde todos los hijos compitan con igual peso visual |
| Glosario Vivo | `<GlossaryTerm>` | Popover sin desplazar el texto: imagen mental + formalización |
| Ecuación | `<MathFormula>` | Bloque con barra lateral de 2 px del color de la magnitud dominante |
| Slider de precisión | `<PrecisionSlider>` | Radix, valor tabular, color de la magnitud |
| Cabecera | `/`, `/acceso` | Marca, icono de tema y monograma de cuenta. Nada más. |

## Prohibido
Card-itis · badges en mayúsculas repetidos · gradientes decorativos · sombras pesadas · animaciones en bucle · skeletons como estado vacío · meta-lenguaje de desarrollo · saltos de layout en hover.

## Movimiento
≤ 250 ms, ease `[0.22, 1, 0.36, 1]`, siempre funcional. `prefers-reduced-motion` respetado globalmente.
