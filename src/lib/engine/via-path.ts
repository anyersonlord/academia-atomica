import { SLUG_REGEX } from "@/lib/schemas/node";

export const MAX_VIA_DEPTH = 16;

export function isValidNodeSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 96 && SLUG_REGEX.test(slug);
}

/**
 * Sanitiza en silencio la pila ?via=padre-a.padre-b:
 * 1. Filtra slugs inválidos (con puntos, mayúsculas o vacíos) y opcionalmente desconocidos.
 * 2. Si el nodo actual aparece en la cadena, trunca todo desde ese punto (evita auto-referencia y rebote).
 * 3. Colapsa cualquier bucle interno (a.b.c.b.d -> a.b.d) para que la URL jamás crezca sin cota.
 * 4. Aplica cota máxima MAX_VIA_DEPTH conservando el contexto más cercano al nodo actual.
 */
export function sanitizeViaChain(
  rawVia: string | readonly string[] | null | undefined,
  currentSlug: string,
  knownSlugs?: ReadonlySet<string>
): string[] {
  if (!rawVia) return [];

  const rawTokens =
    typeof rawVia === "string" ? rawVia.split(".") : Array.from(rawVia);

  const collapsed: string[] = [];

  for (const raw of rawTokens) {
    const token = raw.trim();
    if (!isValidNodeSlug(token)) {
      continue;
    }
    if (knownSlugs && !knownSlugs.has(token)) {
      continue;
    }
    if (token === currentSlug) {
      // Llegamos al propio nodo destino: la pila hacia él termina justo antes
      break;
    }

    const existingIdx = collapsed.indexOf(token);
    if (existingIdx !== -1) {
      // Colapsar el ciclo intermedio (a.b.c.b -> a.b)
      collapsed.splice(existingIdx + 1);
      continue;
    }

    collapsed.push(token);
  }

  if (collapsed.length > MAX_VIA_DEPTH) {
    return collapsed.slice(collapsed.length - MAX_VIA_DEPTH);
  }

  return collapsed;
}

export function serializeViaParam(chain: readonly string[]): string | null {
  if (chain.length === 0) return null;
  return chain.join(".");
}

export function buildNodeHref(
  targetSlug: string,
  viaChain?: readonly string[],
  knownSlugs?: ReadonlySet<string>
): string {
  const cleanVia = sanitizeViaChain(viaChain, targetSlug, knownSlugs);
  const serialized = serializeViaParam(cleanVia);
  return serialized
    ? `/nodo/${targetSlug}?via=${serialized}`
    : `/nodo/${targetSlug}`;
}

/**
 * Construye la nueva pila ?via= al hacer zoom desde currentSlug hacia targetChildSlug.
 */
export function pushViaContext(
  currentVia: readonly string[],
  currentSlug: string,
  targetChildSlug: string,
  knownSlugs?: ReadonlySet<string>
): string[] {
  if (!isValidNodeSlug(currentSlug)) {
    return sanitizeViaChain(currentVia, targetChildSlug, knownSlugs);
  }
  return sanitizeViaChain(
    [...currentVia, currentSlug],
    targetChildSlug,
    knownSlugs
  );
}

export interface ImmediateParentContext {
  parentSlug: string;
  parentVia: string[];
  returnHref: string;
}

/**
 * Resuelve el padre inmediato de retorno desde la Brújula de Profundidad.
 */
export function popViaParent(
  currentVia: readonly string[],
  currentSlug: string,
  knownSlugs?: ReadonlySet<string>
): ImmediateParentContext | null {
  const clean = sanitizeViaChain(currentVia, currentSlug, knownSlugs);
  if (clean.length === 0) {
    return null;
  }
  const parentSlug = clean[clean.length - 1]!;
  const parentVia = clean.slice(0, -1);
  return {
    parentSlug,
    parentVia,
    returnHref: buildNodeHref(parentSlug, parentVia, knownSlugs),
  };
}
