// Agent 1: AI Designer
// Generates furniture suggestions based on room config, style, palette, budget

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
    return []
  }
}