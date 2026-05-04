// Agent 1: AI Designer
// Generates furniture suggestions based on room config, style, palette, budget
// Agent 1: AI Designer
// Generates furniture suggestions based on room config, style, palette, budget

const ROMANIAN_STORES = ['IKEA', 'Dedeman', 'Vivre', 'Mobexpert']

const STORE_LINKS = {
  IKEA: 'https://www.ikea.com/ro/ro/search/?q=',
  Dedeman: 'https://www.dedeman.ro/ro/search?q=',
  Vivre: 'https://www.vivre.ro/search/?q=',
  Mobexpert: 'https://www.mobexpert.ro/search?q=',
}

export async function runAgent1({ room, style, palettes, maxBudget }) {
  const budgetConstraint = maxBudget
    ? `The total budget is maximum ${maxBudget} RON. Price each item accordingly.`
    : 'Suggest items at various price points typical for Romanian market in RON.'

  const prompt = `You are an expert interior designer AI agent. Generate a furniture list for a room.

Room dimensions: ${room.length}m length × ${room.width}m width × ${room.height}m height
Design style: ${style}
Color palette: ${palettes.join(', ')}
${budgetConstraint}

Generate EXACTLY 6-8 furniture items suitable for this room. Each item MUST fit within the room dimensions (${room.length}m × ${room.width}m).

Respond ONLY with a JSON array, no preamble, no markdown backticks. Example format:
[
  {
    "id": "f1",
    "name": "Item name",
    "category": "seating|storage|table|bed|lighting|decor|other",
    "width": 1.2,
    "depth": 0.8,
    "height": 0.75,
    "color": "hex color code like #A0856C",
    "colorName": "Warm Oak",
    "price": 1200,
    "description": "Short description of the piece",
    "storeLinks": [
      { "store": "IKEA", "url": "https://www.ikea.com/ro/ro/search/?q=sofa", "price": 1200 },
      { "store": "Vivre", "url": "https://www.vivre.ro/search/?q=sofa", "price": 1350 }
    ]
  }
]

Important rules:
- No item width or depth exceeds ${Math.min(room.length, room.width) * 0.7}m
- Colors must match the "${palettes.join(', ')}" palette
- Style must be "${style}"
- Include 2 store links per item from: IKEA, Dedeman, Vivre, Mobexpert
- Prices in RON (Romanian Lei)`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are Agent 1 of an AI interior design system. You generate furniture lists. Always respond ONLY with valid JSON arrays.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.map(b => b.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const items = JSON.parse(clean)

    return items.map((item, i) => ({
      ...item,
      id: item.id || `f${i + 1}`,
      storeLinks: item.storeLinks || [],
    }))
  } catch (err) {
    console.error('Agent 1 error:', err)
    return generateFallbackFurniture(room, style, palettes, maxBudget)
  }
}
function generateFallbackLinks(name) {
  const encoded = encodeURIComponent(name)
  return ROMANIAN_STORES.slice(0, 2).map(store => ({
    store,
    url: STORE_LINKS[store] + encoded,
    price: Math.floor(Math.random() * 2000) + 200,
  }))
}

function generateFallbackFurniture(room, style, palettes, maxBudget) {
  const budget = maxBudget ? parseInt(maxBudget) : 15000
  const styleColors = {
    minimalist: ['#F5F5F0', '#2C2C2C', '#E8E8E2'],
    scandinavian: ['#FFFFFF', '#A0856C', '#4A6741'],
    industrial: ['#4A4A4A', '#8B7355', '#C0C0C0'],
    bohemian: ['#D4956A', '#7B6E8F', '#C17F3E'],
    modern: ['#1A1A2E', '#E94560', '#F5F5F5'],
  }
  const colors = styleColors[style] || styleColors.modern

  const templates = [
    { name: 'Canapea 3 locuri', category: 'seating', width: 2.1, depth: 0.85, height: 0.82, basePrice: 2500 },
    { name: 'Masă de cafea', category: 'table', width: 1.1, depth: 0.6, height: 0.45, basePrice: 600 },
    { name: 'Bibliotecă', category: 'storage', width: 0.8, depth: 0.3, height: 1.8, basePrice: 1200 },
    { name: 'Fotoliu', category: 'seating', width: 0.85, depth: 0.85, height: 0.9, basePrice: 900 },
    { name: 'Lampă de podea', category: 'lighting', width: 0.4, depth: 0.4, height: 1.7, basePrice: 350 },
    { name: 'Comodă TV', category: 'storage', width: 1.6, depth: 0.45, height: 0.55, basePrice: 1400 },
    { name: 'Covor decorativ', category: 'decor', width: 2.0, depth: 1.4, height: 0.01, basePrice: 450 },
    { name: 'Noptieră', category: 'storage', width: 0.5, depth: 0.4, height: 0.55, basePrice: 380 },
  ]

  return templates
    .filter(t => t.width < room.length * 0.7 && t.depth < room.width * 0.7)
    .slice(0, 7)
    .map((t, i) => ({
      id: `f${i + 1}`,
      ...t,
      color: colors[i % colors.length],
      colorName: 'Design color',
      price: Math.min(Math.round(t.basePrice * (0.8 + Math.random() * 0.4)), budget / 4),
      description: `${t.name} în stil ${style}, perfect pentru camera ta.`,
      storeLinks: generateFallbackLinks(t.name),
    }))
}