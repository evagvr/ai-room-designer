// Agent 2: Spatial Optimizer — apelează backend Django

const API_BASE = 'http://localhost:8000/api'

export async function runAgent2({ room, selectedItems, variant = 0 }) {
  if (!selectedItems || selectedItems.length === 0) return []

  const rl = parseFloat(room?.length) || 5
  const rw = parseFloat(room?.width) || 4

  const generateFallback = () => {
    const placed = []
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i]
      const w = item.width || 1.0
      const d = item.depth || 0.8
      
      let x = 0.2
      let y = 0.2
      if (placed.length > 0) {
        const last = placed[placed.length - 1]
        const lastW = last.rotation === 90 ? last.depth : last.width
        x = last.x + lastW + 0.2
        y = last.y
        if (x + w > rl - 0.1) {
          x = 0.2
          y = last.y + (last.rotation === 90 ? last.width : last.depth) + 0.2
        }
      }
      
      const finalW = Math.min(w, rl - 0.2)
      const finalD = Math.min(d, rw - 0.2)
      
      placed.push({
        ...item,
        width: finalW,
        depth: finalD,
        x: Math.max(0, Math.min(x, rl - finalW)),
        y: Math.max(0, Math.min(y, rw - finalD)),
        rotation: 0,
      })
    }
    return placed
  }

  try {
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${API_BASE}/agents/optimizer/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({
        room,
        selectedItems,
        variant,
      }),
    })

    const data = await response.json()

    if (response.ok === false) {
      return generateFallback()
    }

    let rawLayout = null
    if (data.layout) {
      rawLayout = data.layout
    } else if (data.content && data.content[0] && data.content[0].text) {
      try {
        const parsed = JSON.parse(data.content[0].text)
        if (Array.isArray(parsed)) {
          rawLayout = parsed
        }
      } catch (e) {
        // nested parsing failed
      }
    }

    if (rawLayout && Array.isArray(rawLayout)) {
      const mapped = selectedItems.map(item => {
        const pos = rawLayout.find(p => p.id === item.id)
        if (pos) {
          return {
            ...item,
            x: typeof pos.x === 'number' ? pos.x : 0.2,
            y: typeof pos.y === 'number' ? pos.y : 0.2,
            rotation: [0, 90].includes(pos.rotation) ? pos.rotation : 0,
          }
        }
        // If not found in the layout output, place it with fallback logic
        return null
      })

      // If all items were successfully mapped, return them
      if (mapped.every(item => item !== null)) {
        return mapped
      }
    }

    return generateFallback()
  } catch (err) {
    return generateFallback()
  }
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
