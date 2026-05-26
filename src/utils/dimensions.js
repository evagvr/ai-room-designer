/**
 * Dimensiuni catalog: valori > 10 sunt centimetri → metri.
 */
export function normalizeDim(value, fallback = 1) {
  const n = parseFloat(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  if (n > 10) return Math.round((n / 100) * 1000) / 1000
  return n
}

export function normalizeProductDims(product) {
  if (!product) return product
  return {
    ...product,
    width: normalizeDim(product.width, 1),
    depth: normalizeDim(product.depth, 0.8),
    height: product.height != null ? normalizeDim(product.height, 1) : product.height,
  }
}
