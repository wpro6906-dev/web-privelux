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
 * Applies safe Cloudinary delivery transformations.
 *
 * - f_auto: serves a format the current browser can decode efficiently.
 * - q_auto:good: keeps good visual quality while reducing transfer/decode cost.
 * - c_limit,w_N: optionally caps oversized source images without upscaling them.
 *
 * Keeping carousel images reasonably sized is especially important in Safari,
 * where several large images inside a continuously transformed track can cause
 * expensive decoding/repainting.
 *
 * Safe to call with any URL — non-Cloudinary URLs are returned unchanged.
 */
export function cloudinaryImage(
  url: string | null | undefined,
  options?: { width?: number },
): string {
  if (!url) return "";

  const cleanUrl = url.trim();
  if (!cleanUrl) return "";

  const MARKER = "/image/upload/";
  const idx = cleanUrl.indexOf(MARKER);
  if (idx === -1) return cleanUrl;

  const after = cleanUrl.slice(idx + MARKER.length);

  // Do not stack our automatic delivery transform on URLs that already have it.
  if (after.startsWith("f_auto") || after.startsWith("q_auto")) return cleanUrl;

  const transforms = ["f_auto", "q_auto:good"];
  if (options?.width && Number.isFinite(options.width) && options.width > 0) {
    transforms.push("c_limit", `w_${Math.round(options.width)}`);
  }

  return cleanUrl.slice(0, idx + MARKER.length) + transforms.join(",") + "/" + after;
}
