// Agent 1: filtrează mobilier din catalogul DB (fără generare LLM)
// Dimensiunile sunt normalizate în API (cm → m)
// Fallback: folosește direct custom_products.json când backend-ul nu e disponibil

import catalogData from '../../backend/furniture/custom_products.json'

const API_BASE = 'http://localhost:8000/api'

/**
 * Mapează un produs din custom_products.json la formatul așteptat de frontend.
 */
function mapCatalogProduct(item, index) {
  const price = parseFloat(item.price) || 0
  return {
    id: `cat-${index}`,
    name: item.name,
    category: item.category || 'other',
    width: parseFloat(item.width) || 1.0,
    depth: parseFloat(item.depth) || 0.8,
    height: parseFloat(item.height) || 1.0,
    color: item.color_hex || '#888888',
    colorName: item.color_name || 'Neutru',
    price,
    description: item.description || '',
    image_url: item.image_url || null,
    storeLinks: [
      { store: item.store, url: item.url, price },
    ],
  }
}

/**
 * Filtrează catalogul local după dimensiunile camerei, stil și buget.
 */
function filterFromCatalog(room, style, maxBudget) {
  const rl = parseFloat(room?.length) || 5
  const rw = parseFloat(room?.width) || 4
  const budgetLimit = parseFloat(maxBudget) || Infinity

  // Stiluri compatibile (ex: industrial acceptă și modern)
  const styleCompat = {
    modern:       ['modern', 'minimalist'],
    scandinavian: ['scandinavian', 'minimalist', 'modern'],
    industrial:   ['industrial', 'modern'],
    minimalist:   ['minimalist', 'modern', 'scandinavian'],
    classic:      ['classic', 'modern'],
    bohemian:     ['classic', 'modern', 'scandinavian'],
  }
  const acceptedStyles = styleCompat[style] || [style, 'modern']

  const filtered = catalogData
    .map((item, i) => mapCatalogProduct(item, i))
    .filter(item => {
      // Filtrare după dimensiuni (trebuie să intre în cameră)
      const fitsRoom = item.width < rl * 0.85 && item.depth < rw * 0.85
      // Filtrare după buget
      const fitsbudget = budgetLimit === Infinity || item.price <= budgetLimit
      // Filtrare după stil
      const fitsStyle = acceptedStyles.includes(
        catalogData[parseInt(item.id.replace('cat-', ''))]?.style || 'modern'
      )
      return fitsRoom && fitsbudget && fitsStyle
    })

  if (filtered.length === 0) {
    // Dacă niciun produs nu se potrivește stilului, relaxăm filtrul de stil
    return catalogData
      .map((item, i) => mapCatalogProduct(item, i))
      .filter(item => {
        const fitsRoom = item.width < rl * 0.85 && item.depth < rw * 0.85
        const fitsbudget = budgetLimit === Infinity || item.price <= budgetLimit
        return fitsRoom && fitsbudget
      })
      .slice(0, 8)
  }

  // Amestecăm și limităm la 8 produse diverse (câte unul per categorie dacă posibil)
  const byCategory = {}
  for (const item of filtered) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  const result = []
  const categories = Object.keys(byCategory)
  let i = 0
  while (result.length < 8 && i < 20) {
    for (const cat of categories) {
      if (byCategory[cat].length > 0) {
        result.push(byCategory[cat].shift())
        if (result.length >= 8) break
      }
    }
    i++
  }

  return result
}

export async function runAgent1({ room, style, palettes, maxBudget }) {
  const token = localStorage.getItem('authToken')

  try {
    const response = await fetch(`${API_BASE}/agents/designer/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({ room, style, palettes, maxBudget }),
    })

    const data = await response.json()

    if (response.ok === false) {
      return filterFromCatalog(room, style, maxBudget)
    }

    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      return data.items
    }

    if (data.content && data.content[0] && data.content[0].text) {
      try {
        const parsed = JSON.parse(data.content[0].text)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        // failed to parse nested JSON, trigger fallback
      }
    }

    return filterFromCatalog(room, style, maxBudget)
  } catch (err) {
    // Backend indisponibil (GitHub Pages) → folosim catalogul local
    return filterFromCatalog(room, style, maxBudget)
  }
}