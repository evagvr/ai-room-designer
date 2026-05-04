import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runAgent2, checkCollisions } from '../src/agents/agent2Optimizer'

global.fetch = vi.fn()

const mockRoom = { length: '5', width: '4', height: '2.7' }
const mockItems = [
  { id: 'f1', name: 'Canapea', category: 'seating', width: 2.0, depth: 0.85, height: 0.82 },
  { id: 'f2', name: 'Masă', category: 'table', width: 1.0, depth: 0.6, height: 0.45 },
  { id: 'f3', name: 'Fotoliu', category: 'seating', width: 0.85, depth: 0.85, height: 0.9 },
]

describe('Agent 2 — Spatial Optimizer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('generates layout with all items when API fails', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const layout = await runAgent2({ room: mockRoom, selectedItems: mockItems, variant: 0 })
    expect(layout.length).toBe(mockItems.length)
  })

  it('all items have x, y coordinates in fallback', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const layout = await runAgent2({ room: mockRoom, selectedItems: mockItems })
    layout.forEach(item => {
      expect(item).toHaveProperty('x')
      expect(item).toHaveProperty('y')
      expect(item).toHaveProperty('rotation')
      expect(typeof item.x).toBe('number')
      expect(typeof item.y).toBe('number')
    })
  })

  it('all items stay within room boundaries in fallback', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const layout = await runAgent2({ room: mockRoom, selectedItems: mockItems })
    const rl = parseFloat(mockRoom.length)
    const rw = parseFloat(mockRoom.width)
    layout.forEach(item => {
      const iw = item.rotation === 90 ? item.depth : item.width
      const ih = item.rotation === 90 ? item.width : item.depth
      expect(item.x).toBeGreaterThanOrEqual(0)
      expect(item.y).toBeGreaterThanOrEqual(0)
      expect(item.x + iw).toBeLessThanOrEqual(rl + 0.01) // small float tolerance
      expect(item.y + ih).toBeLessThanOrEqual(rw + 0.01)
    })
  })

  it('parses valid API response correctly', async () => {
    const positions = mockItems.map((item, i) => ({ id: item.id, x: i * 1.0, y: 0.1, rotation: 0, reasoning: 'test' }))
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ content: [{ text: JSON.stringify(positions) }] })
    })
    const layout = await runAgent2({ room: mockRoom, selectedItems: mockItems })
    expect(layout.length).toBe(mockItems.length)
    layout.forEach(item => {
      expect(item).toHaveProperty('x')
      expect(item).toHaveProperty('y')
    })
  })

  it('rotation values are either 0 or 90', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const layout = await runAgent2({ room: mockRoom, selectedItems: mockItems })
    layout.forEach(item => {
      expect([0, 90]).toContain(item.rotation)
    })
  })

  it('handles empty items array', async () => {
    const layout = await runAgent2({ room: mockRoom, selectedItems: [], variant: 0 })
    expect(layout).toBeInstanceOf(Array)
    expect(layout.length).toBe(0)
  })
})

describe('checkCollisions', () => {
  it('detects overlapping items', () => {
    const layout = [
      { id: 'a', x: 0, y: 0, width: 2, depth: 1, rotation: 0 },
      { id: 'b', x: 1, y: 0, width: 2, depth: 1, rotation: 0 }, // overlaps a
    ]
    const cols = checkCollisions(layout)
    expect(cols.has('a')).toBe(true)
    expect(cols.has('b')).toBe(true)
  })

  it('no false positives for non-overlapping items', () => {
    const layout = [
      { id: 'a', x: 0, y: 0, width: 1, depth: 1, rotation: 0 },
      { id: 'b', x: 2, y: 0, width: 1, depth: 1, rotation: 0 }, // gap of 1m
    ]
    const cols = checkCollisions(layout)
    expect(cols.size).toBe(0)
  })

  it('handles rotated items correctly', () => {
    const layout = [
      { id: 'a', x: 0, y: 0, width: 2, depth: 0.5, rotation: 0 },
      { id: 'b', x: 0, y: 1, width: 2, depth: 0.5, rotation: 0 }, // below a, no overlap
    ]
    const cols = checkCollisions(layout)
    expect(cols.size).toBe(0)
  })

  it('returns empty set for single item', () => {
    const layout = [{ id: 'a', x: 0, y: 0, width: 1, depth: 1, rotation: 0 }]
    const cols = checkCollisions(layout)
    expect(cols.size).toBe(0)
  })

  it('returns empty set for empty layout', () => {
    expect(checkCollisions([]).size).toBe(0)
  })
})
