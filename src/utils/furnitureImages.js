/**
 * Imagini din public/images/ — respectă base path Vite (ex. /ai-room-designer/).
 */

const BASE = import.meta.env.BASE_URL || '/'

function publicAsset(path) {
  const clean = String(path).replace(/^\//, '')
  return `${BASE}${clean}`.replace(/\/{2,}/g, '/')
}

const LOCAL_CATEGORY_FALLBACK = {
  seating: publicAsset('images/vimle.jpg'),
  bed: publicAsset('images/pat_1.jpg'),
  table: publicAsset('images/masa.jpg'),
  storage: publicAsset('images/birou.jpg'),
  lighting: publicAsset('images/lampa_1.jpg'),
  decor: publicAsset('images/masadecor.jpg'),
  general: publicAsset('images/masa.jpg'),
}

function resolveCatalogImageUrl(imageUrl) {
  if (!imageUrl) return null
  const url = String(imageUrl).trim()
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  if (url.startsWith('images/')) {
    return publicAsset(url)
  }
  if (url.startsWith('/images/')) {
    return publicAsset(url.slice(1))
  }
  if (url.startsWith('/')) {
    return publicAsset(url.slice(1))
  }
  return publicAsset(`images/${url}`)
}

function localFallbackForItem(item) {
  const category = (item?.category || '').toLowerCase()
  return LOCAL_CATEGORY_FALLBACK[category] || LOCAL_CATEGORY_FALLBACK.general
}

/**
 * @param {Object} item Produs din catalog
 * @returns {string} URL imagine
 */
export function getFurnitureImage(item) {
  if (!item) return LOCAL_CATEGORY_FALLBACK.general

  const catalogUrl = resolveCatalogImageUrl(item.image_url)
  if (catalogUrl) return catalogUrl

  return localFallbackForItem(item)
}

export function getFurnitureImageFallback(item) {
  return localFallbackForItem(item)
}
