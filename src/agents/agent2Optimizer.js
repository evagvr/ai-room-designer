// Agent 2: Spatial Optimizer
// Calculates optimal x,y positions and rotations for furniture in the room

const MIN_AISLE = 0.9 // 90cm minimum circulation aisle

export async function runAgent2({ room, selectedItems, variant = 0 }) {
  const itemsJson = selectedItems.map(item => ({
    id: item.id,
    name: item.name,
    width: item.width,
    depth: item.depth,
    height: item.height,
    category: item.category,
  }))

  const variantInstruction = variant > 0
    ? `This is layout variant ${variant + 1}. Create a MEANINGFULLY DIFFERENT arrangement from variant 1. Try different orientations, groupings, or furniture placement strategies.`
    : 'This is the primary layout. Focus on optimal flow and livability.'

  const prompt = `You are Agent 2 of an AI interior design system — a spatial optimization expert.

Room dimensions: ${room.length}m (length/X-axis) × ${room.width}m (width/Y-axis)
Minimum circulation aisle: ${MIN_AISLE}m between furniture items

Furniture to place:
${JSON.stringify(itemsJson, null, 2)}

${variantInstruction}

Rules:
1. All furniture must fit INSIDE the room (x >= 0, y >= 0, x + item_width <= ${room.length}, y + item_depth <= ${room.width})
2. No two items may overlap
3. Maintain ${MIN_AISLE}m clearance between items where possible
4. rotation must be 0 or 90 (degrees)
5. If rotation is 90, swap width and depth for collision checks
6. Place sofas/seating facing a focal point (TV unit, window)
7. Beds should be against a wall

Respond ONLY with a JSON array, no preamble, no markdown. Format:
[
  {
    "id": "f1",
    "x": 0.5,
    "y": 0.3,
    "rotation": 0,
    "reasoning": "Against north wall for best flow"
  }
]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are Agent 2 of an AI interior design system. You calculate furniture positions. Always respond ONLY with valid JSON arrays. Be precise with coordinates.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.map(b => b.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const positions = JSON.parse(clean)

    const layout = selectedItems.map(item => {
      const pos = positions.find(p => p.id === item.id)
      if (!pos) return fallbackPosition(item, selectedItems, room, selectedItems.indexOf(item))
      return {
        ...item,
        x: Math.max(0, Math.min(pos.x, room.length - (pos.rotation === 90 ? item.depth : item.width))),
        y: Math.max(0, Math.min(pos.y, room.width - (pos.rotation === 90 ? item.width : item.depth))),
        rotation: pos.rotation || 0,
        reasoning: pos.reasoning || '',
      }
    })

    return validateAndFixLayout(layout, room)
  } catch (err) {
    console.error('Agent 2 error:', err)
    return generateFallbackLayout(selectedItems, room)
  }
}

function fallbackPosition(item, allItems, room, index) {
  const cols = Math.ceil(Math.sqrt(allItems.length))
  const col = index % cols
  const row = Math.floor(index / cols)
  const cellW = room.length / cols
  const cellH = room.width / Math.ceil(allItems.length / cols)
  return {
    ...item,
    x: col * cellW + 0.1,
    y: row * cellH + 0.1,
    rotation: 0,
    reasoning: 'Auto-positioned',
  }
}

function validateAndFixLayout(layout, room) {
  return layout.map(item => {
    const w = item.rotation === 90 ? item.depth : item.width
    const d = item.rotation === 90 ? item.width : item.depth
    return {
      ...item,
      x: Math.max(0, Math.min(item.x, room.length - w)),
      y: Math.max(0, Math.min(item.y, room.width - d)),
    }
  })
}

function generateFallbackLayout(items, room) {
  const placed = []
  const margin = 0.1

  return items.map((item, i) => {
    let x = margin
    let y = margin
    let placed_ok = false
    const attempts = 20

    for (let a = 0; a < attempts && !placed_ok; a++) {
      x = margin + (Math.random() * (room.length - item.width - 2 * margin))
      y = margin + (Math.random() * (room.width - item.depth - 2 * margin))

      const overlaps = placed.some(p => {
        const pw = p.rotation === 90 ? p.depth : p.width
        const pd = p.rotation === 90 ? p.width : p.depth
        return !(
          x + item.width < p.x - 0.3 ||
          x > p.x + pw + 0.3 ||
          y + item.depth < p.y - 0.3 ||
          y > p.y + pd + 0.3
        )
      })

      if (!overlaps) placed_ok = true
    }

    const result = { ...item, x, y, rotation: 0, reasoning: 'Auto-positioned' }
    placed.push(result)
    return result
  })
}

export function checkCollisions(layout) {
  const collisions = new Set()
  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      const a = layout[i]
      const b = layout[j]
      const aw = a.rotation === 90 ? a.depth : a.width
      const ad = a.rotation === 90 ? a.width : a.depth
      const bw = b.rotation === 90 ? b.depth : b.width
      const bd = b.rotation === 90 ? b.width : b.depth
      if (!(a.x + aw < b.x || a.x > b.x + bw || a.y + ad < b.y || a.y > b.y + bd)) {
        collisions.add(a.id)
        collisions.add(b.id)
      }
    }
  }
  return collisions
}
