// Agent 1: filtrează mobilier din catalogul DB (fără generare LLM)
// Dimensiunile sunt normalizate în API (cm → m)

const API_BASE = 'http://localhost:8000/api'

export async function runAgent1({ room, style, palettes, maxBudget }) {
  const token = localStorage.getItem('authToken')
  const rl = parseFloat(room?.length) || 5
  const rw = parseFloat(room?.width) || 4
  const budgetLimit = parseFloat(maxBudget) || Infinity

  const generateFallback = () => {
    const fallbackDb = [
      { id: 'fb-bed', name: 'Pat', category: 'bed', width: 2.0, depth: 1.6, height: 0.8, price: 1200, color: '#A0856C', storeLinks: [{ store: 'IKEA', url: 'https://ikea.com' }] },
      { id: 'fb-sofa', name: 'Canapea', category: 'seating', width: 1.8, depth: 0.9, height: 0.85, price: 1500, color: '#4A5568', storeLinks: [{ store: 'IKEA', url: 'https://ikea.com' }] },
      { id: 'fb-table', name: 'Masă', category: 'table', width: 1.2, depth: 0.8, height: 0.75, price: 400, color: '#2D3748', storeLinks: [{ store: 'IKEA', url: 'https://ikea.com' }] },
      { id: 'fb-chair', name: 'Scaun', category: 'seating', width: 0.5, depth: 0.5, height: 0.9, price: 150, color: '#E2E8F0', storeLinks: [{ store: 'IKEA', url: 'https://ikea.com' }] },
      { id: 'fb-wardrobe', name: 'Dulap', category: 'storage', width: 1.5, depth: 0.6, height: 2.0, price: 900, color: '#FFFFFF', storeLinks: [{ store: 'IKEA', url: 'https://ikea.com' }] }
    ]

    const items = fallbackDb
      .map(item => {
        const itemW = Math.min(item.width, Math.max(0.4, rl - 0.2))
        const itemD = Math.min(item.depth, Math.max(0.4, rw - 0.2))
        const itemPrice = budgetLimit < Infinity ? Math.min(item.price, budgetLimit) : item.price
        return {
          ...item,
          width: Math.round(itemW * 100) / 100,
          depth: Math.round(itemD * 100) / 100,
          price: Math.round(itemPrice),
        }
      })
      .filter(item => item.price <= budgetLimit)

    if (items.length === 0) {
      return [{
        id: 'fb-mini',
        name: 'Scaun mic',
        category: 'seating',
        width: 0.4,
        depth: 0.4,
        height: 0.8,
        price: Math.min(50, budgetLimit),
        color: '#000000',
        storeLinks: [{ store: 'IKEA', url: 'https://ikea.com' }]
      }]
    }

    return items
  }

  try {
    const response = await fetch(`${API_BASE}/agents/designer/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({
        room,
        style,
        palettes,
        maxBudget,
      }),
    })

    const data = await response.json()

    if (response.ok === false) {
      return generateFallback()
    }

    if (data.items) {
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

    return generateFallback()
  } catch (err) {
    return generateFallback()
  }
}