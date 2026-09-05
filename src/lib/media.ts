/** Gambar cadangan bila media gagal dimuat. */
export const FALLBACK_IMAGE = "/logo-mtjsi.jpg";

/** Ubah path gambar database menjadi URL absolut dari root situs. */
export function getImageUrl(path?: string | null): string {
  if (!path) return FALLBACK_IMAGE;
  if (path.toLowerCase().startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

/** Handler onError standar: ganti ke gambar cadangan sekali saja. */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.dataset['fallbackApplied']) return;
  img.dataset['fallbackApplied'] = "true";
  img.src = FALLBACK_IMAGE;
}
