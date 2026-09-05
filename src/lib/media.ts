/** Gambar cadangan bila media gagal dimuat. */
export const FALLBACK_IMAGE = "/logo-mtjsi.jpg";

/**
 * Pastikan URL media selalu bisa diakses di production (Vercel/GitHub Pages).
 * - URL absolut (http/https/data) dibiarkan apa adanya.
 * - URL relatif diberi awalan "/" (dan base URL saat dipakai di server/SSR).
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return FALLBACK_IMAGE;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  const base =
    (import.meta.env['VITE_PUBLIC_SITE_URL'] as string | undefined) ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

/** Handler onError standar: ganti ke gambar cadangan sekali saja. */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.dataset['fallbackApplied']) return;
  img.dataset['fallbackApplied'] = "true";
  img.src = FALLBACK_IMAGE;
}
