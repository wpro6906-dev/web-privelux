/**
 * Formats a price number with comma thousands-separator.
 * Drops unnecessary trailing decimals: 100000 → "100,000", 50.5 → "50.5", 50 → "50"
 */
export function formatPrice(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Returns the actual selling price for a product:
 * - salePrice when isOnSale is true and salePrice is set
 * - price otherwise
 */
export function effectivePrice(product: {
  price: number | string;
  isOnSale?: boolean | null;
  salePrice?: number | string | null;
}): number {
  if (product.isOnSale && product.salePrice != null) {
    return Number(product.salePrice);
  }
  return Number(product.price);
}

/**
 * Applies Cloudinary's f_auto,q_auto transformation to any Cloudinary image URL.
 *
 * - f_auto: serves WebP, AVIF, or JPEG based on the browser's Accept header.
 *   This is the key fix for HEIC files — Chrome/Firefox cannot decode HEIC natively,
 *   but Cloudinary converts them to a supported format on the fly.
 * - q_auto: optimal quality/size balance chosen by Cloudinary.
 *
 * Safe to call with any URL — non-Cloudinary URLs and already-transformed URLs
 * are returned unchanged.
 */
export function cloudinaryImage(url: string | null | undefined): string {
  if (!url) return url ?? "";
  const MARKER = "/image/upload/";
  const idx = url.indexOf(MARKER);
  if (idx === -1) return url;
  const after = url.slice(idx + MARKER.length);
  if (after.startsWith("f_auto") || after.startsWith("q_auto")) return url;
  return url.slice(0, idx + MARKER.length) + "f_auto,q_auto/" + after;
}
