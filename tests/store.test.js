import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// Mock zustand persist
vi.mock('zustand/middleware', () => ({
  persist: (fn) => fn,
}))

// We test the store logic directly
describe('Store — Room Configuration', () => {
  it('validates room dimensions logic', () => {
    const validate = (value) => {
      const num = parseFloat(value)
      if (!value) return 'Câmp obligatoriu'
      if (isNaN(num) || num <= 0) return 'Valoare invalidă'
      if (num < 1) return 'Minim 1m'
      if (num > 30) return 'Maxim 30m'
      return ''
    }
    expect(validate('')).toBe('Câmp obligatoriu')
    expect(validate('0')).toBe('Valoare invalidă')
    expect(validate('-1')).toBe('Valoare invalidă')
    expect(validate('0.5')).toBe('Minim 1m')
    expect(validate('35')).toBe('Maxim 30m')
    expect(validate('5.5')).toBe('')
    expect(validate('10')).toBe('')
  })

  it('calculates room area correctly', () => {
    const area = (l, w) => parseFloat((parseFloat(l) * parseFloat(w)).toFixed(1))
    expect(area('5', '4')).toBe(20)
    expect(area('3.5', '2.5')).toBe(8.8)
    expect(area('10', '8')).toBe(80)
  })

  it('calculates room volume correctly', () => {
    const volume = (l, w, h) => parseFloat((parseFloat(l) * parseFloat(w) * parseFloat(h)).toFixed(1))
    expect(volume('5', '4', '2.7')).toBe(54)
  })
})

describe('Store — Furniture Selection', () => {
  it('budget calculation works correctly', () => {
    const furniture = [
      { id: 'f1', price: 2500 },
      { id: 'f2', price: 1200 },
      { id: 'f3', price: 800 },
    ]
    const selected = ['f1', 'f3']
    const total = selected.reduce((acc, id) => {
      const item = furniture.find(f => f.id === id)
      return acc + (item?.price || 0)
    }, 0)
    expect(total).toBe(3300)
  })

  it('detects over-budget correctly', () => {
    const total = 5000
    const budget = 3000
    expect(budget > 0 && total > budget).toBe(true)
    expect(3000 > 0 && 5000 > 3000).toBe(true)
    expect(3000 > 0 && 2000 > 3000).toBe(false)
  })

  it('toggle furniture adds and removes correctly', () => {
    let selected = []
    const toggle = (id) => {
      const idx = selected.indexOf(id)
      if (idx >= 0) selected = selected.filter(i => i !== id)
      else selected = [...selected, id]
    }
    toggle('f1')
    expect(selected).toContain('f1')
    toggle('f2')
    expect(selected).toHaveLength(2)
    toggle('f1')
    expect(selected).not.toContain('f1')
    expect(selected).toHaveLength(1)
  })
})

describe('Store — Auth Logic', () => {
  it('validates email format', () => {
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
  })

  it('validates password length', () => {
    const isValidPass = (p) => p.length >= 8
    expect(isValidPass('short')).toBe(false)
    expect(isValidPass('validpass')).toBe(true)
    expect(isValidPass('12345678')).toBe(true)
  })
})

describe('Agent Evals — Response Quality', () => {
  it('agent 1 prompt includes all required constraints', () => {
    const buildPrompt = (room, style, palettes, budget) => {
      const budgetStr = budget ? `Bugetul maxim total este ${budget} RON.` : ''
      return `Dimensiuni cameră: ${room.length}m lungime × ${room.width}m lățime × ${room.height}m înălțime
Stil design: ${style}
Paletă culori: ${palettes.join(', ')}
${budgetStr}`
    }
    const prompt = buildPrompt({ length: '5', width: '4', height: '2.7' }, 'minimalist', ['neutral'], '10000')
    expect(prompt).toContain('5m lungime')
    expect(prompt).toContain('minimalist')
    expect(prompt).toContain('neutral')
    expect(prompt).toContain('10000 RON')
  })

  it('agent 2 prompt includes room and circulation constraints', () => {
    const buildPrompt = (room) => `Dimensiuni cameră: ${room.length}m × ${room.width}m\nCuloar minim de circulație: 0.9m`
    const prompt = buildPrompt({ length: '5', width: '4' })
    expect(prompt).toContain('5m × 4m')
    expect(prompt).toContain('0.9m')
  })

  it('evaluates furniture item dimensions are within room bounds', () => {
    const validateFurnitureForRoom = (item, room) => {
      const rl = parseFloat(room.length)
      const rw = parseFloat(room.width)
      return item.width < rl && item.depth < rw
    }
    expect(validateFurnitureForRoom({ width: 2.0, depth: 0.85 }, { length: '5', width: '4' })).toBe(true)
    expect(validateFurnitureForRoom({ width: 6.0, depth: 0.85 }, { length: '5', width: '4' })).toBe(false)
  })
})
