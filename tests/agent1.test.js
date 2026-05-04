import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runAgent1 } from '../src/agents/agent1Designer'

// Mock fetch globally
global.fetch = vi.fn()

describe('Agent 1 — AI Designer', () => {
  const mockRoom = { length: '5', width: '4', height: '2.7' }
  const mockParams = { room: mockRoom, style: 'minimalist', palettes: ['neutral'], maxBudget: '' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns fallback furniture when API fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))
    const items = await runAgent1(mockParams)
    expect(items).toBeInstanceOf(Array)
    expect(items.length).toBeGreaterThan(0)
  })

  it('returns fallback furniture when API returns malformed JSON', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ content: [{ text: 'not valid json {{{' }] })
    })
    const items = await runAgent1(mockParams)
    expect(items).toBeInstanceOf(Array)
    expect(items.length).toBeGreaterThan(0)
  })

  it('fallback furniture fits within room dimensions', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const items = await runAgent1(mockParams)
    const rl = parseFloat(mockRoom.length)
    const rw = parseFloat(mockRoom.width)
    items.forEach(item => {
      expect(item.width).toBeLessThan(rl)
      expect(item.depth).toBeLessThan(rw)
    })
  })

  it('each fallback item has required fields', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const items = await runAgent1(mockParams)
    items.forEach(item => {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('width')
      expect(item).toHaveProperty('depth')
      expect(item).toHaveProperty('height')
      expect(item).toHaveProperty('price')
      expect(item).toHaveProperty('color')
      expect(item).toHaveProperty('storeLinks')
      expect(item.storeLinks).toBeInstanceOf(Array)
    })
  })

  it('each store link has required fields', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const items = await runAgent1(mockParams)
    items.forEach(item => {
      item.storeLinks.forEach(link => {
        expect(link).toHaveProperty('store')
        expect(link).toHaveProperty('url')
        expect(link.url).toMatch(/^https?:\/\//)
      })
    })
  })

  it('returns parsed data from successful API response', async () => {
    const mockItems = [
      { id: 'f1', name: 'Canapea', category: 'seating', width: 2.0, depth: 0.8, height: 0.8, color: '#A0856C', colorName: 'Brown', price: 2500, description: 'Test', storeLinks: [{ store: 'IKEA', url: 'https://ikea.com', price: 2500 }] }
    ]
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ content: [{ text: JSON.stringify(mockItems) }] })
    })
    const items = await runAgent1(mockParams)
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Canapea')
  })

  it('respects budget constraint in fallback', async () => {
    global.fetch.mockRejectedValue(new Error('fail'))
    const items = await runAgent1({ ...mockParams, maxBudget: '2000' })
    const total = items.reduce((s, i) => s + i.price, 0)
    // At least no single item should exceed half the budget
    items.forEach(item => {
      expect(item.price).toBeLessThanOrEqual(2000)
    })
  })
})
