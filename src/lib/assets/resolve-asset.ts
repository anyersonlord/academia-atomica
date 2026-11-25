const SAFE_ASSET_KEY_REGEX =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\.[a-z0-9]{2,8}$/;

/**
 * Resuelve claves relativas de activos 3D/multimedia (ej. "l7/alternador/rotor.glb")
 * contra NEXT_PUBLIC_ASSET_BASE_URL (listo para Cloudflare R2) o el respaldo local "/assets/".
 * Bloquea rutas absolutas, esquemas inyectados y saltos de directorio ("..").
 */
export function resolveAssetUrl(
  key: string,
  baseUrlOverride?: string
): string {
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    trimmed.includes("://") ||
    trimmed.startsWith("/") ||
    !SAFE_ASSET_KEY_REGEX.test(trimmed)
  ) {
    throw new Error(`Clave de activo inválida o insegura: "${key}"`);
  }

  const rawBase = (
    baseUrlOverride ??
    process.env.NEXT_PUBLIC_ASSET_BASE_URL ??
    ""
  ).trim();

  if (rawBase.length > 0) {
    const cleanBase = rawBase.replace(/\/+$/, "");
    return `${cleanBase}/${trimmed}`;
  }

  return `/assets/${trimmed}`;
}
