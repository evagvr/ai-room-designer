import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeProductDims } from '../utils/dimensions'

const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await fetch('http://localhost:8000/api/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Email sau parolă incorecte')
        localStorage.setItem('authToken', data.token)
        set({ user: data.user, isAuthenticated: true })
      },

      logout: async () => {
        const token = localStorage.getItem('authToken')
        if (token) {
          await fetch('http://localhost:8000/api/auth/logout/', {
            method: 'POST',
            headers: { 'Authorization': `Token ${token}` },
          }).catch(() => {})
        }
        localStorage.removeItem('authToken')
        set({ user: null, isAuthenticated: false })
      },

      register: async (email, password) => {
        const res = await fetch('http://localhost:8000/api/auth/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, password2: password }),
        })
        const data = await res.json()
        if (!res.ok) {
          const msg = data.email?.[0] || data.password?.[0] || 'Eroare la înregistrare'
          throw new Error(msg)
        }
        localStorage.setItem('authToken', data.token)
        set({ user: data.user, isAuthenticated: true })
      },

      // Camera
      room: { length: '', width: '', height: '' },
      setRoom: (room) => set({ room }),

      // Stil
      selectedStyle: null,
      setStyle: (style) => set({ selectedStyle: style }),

      // Paleta de culori
      selectedPalettes: [],
      togglePalette: (palette) =>
        set((state) => ({
          selectedPalettes: state.selectedPalettes.includes(palette)
            ? state.selectedPalettes.filter((p) => p !== palette)
            : [...state.selectedPalettes, palette],
        })),

      // Buget
      maxBudget: '',
      setMaxBudget: (b) => set({ maxBudget: b }),

      // Mobilier (Agent 1)
      furnitureSuggestions: [],
      setFurnitureSuggestions: (items) => set({ furnitureSuggestions: items }),
      selectedFurniture: [],
      toggleFurnitureItem: (id) =>
        set((state) => ({
          selectedFurniture: state.selectedFurniture.includes(id)
            ? state.selectedFurniture.filter((i) => i !== id)
            : [...state.selectedFurniture, id],
        })),

      addProductToRoom: (product) =>
        set((state) => {
          product = normalizeProductDims(product)
          const existsInSuggestions = state.furnitureSuggestions.some((f) => f.id === product.id)
          const furnitureSuggestions = existsInSuggestions
            ? state.furnitureSuggestions
            : [...state.furnitureSuggestions, product]

          const selectedFurniture = state.selectedFurniture.includes(product.id)
            ? state.selectedFurniture
            : [...state.selectedFurniture, product.id]

          const rl = parseFloat(state.room.length) || 5
          const rw = parseFloat(state.room.width) || 4

          // 1. Gather all items (the new product plus existing ones)
          const allItems = [
            ...state.layout.filter(item => item.id !== product.id),
            product
          ]

          // 2. Sort them by category priority (large items like bed/seating first) and then by size
          const categoryPriority = {
            'bed': 0,
            'seating': 1,
            'table': 2,
            'storage': 3,
            'lighting': 4,
            'decor': 5,
          }

          const getArea = (item) => (item.width || 1.0) * (item.depth || 0.8)

          const sortedItems = [...allItems].sort((a, b) => {
            const priorityA = categoryPriority[a.category] !== undefined ? categoryPriority[a.category] : 9
            const priorityB = categoryPriority[b.category] !== undefined ? categoryPriority[b.category] : 9
            if (priorityA !== priorityB) {
              return priorityA - priorityB
            }
            return getArea(b) - getArea(a)
          })

          // 3. Sequential layout placement for all sorted items
          const placed = []

          const overlapsPlaced = (xPos, yPos, wDim, dDim, alreadyPlaced) => {
            const gap = 0.05
            for (const item of alreadyPlaced) {
              const itemW = item.rotation === 90 ? item.depth : item.width
              const itemH = item.rotation === 90 ? item.width : item.depth
              
              const noOverlap = (
                xPos + wDim + gap <= item.x ||
                item.x + itemW + gap <= xPos ||
                yPos + dDim + gap <= item.y ||
                item.y + itemH + gap <= yPos
              )
              if (!noOverlap) return true
            }
            return false
          }

          for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i]
            const w = item.width || 1.0
            const d = item.depth || 0.8
            
            let placedItem = null
            
            // Try rotation = 0 first, then 90 if needed to fit
            for (const rot of [0, 90]) {
              const iw = rot === 90 ? d : w
              const ih = rot === 90 ? w : d
              
              let foundSpot = false
              let bestX = 0.2
              let bestY = 0.2
              
              // Scan the grid from top-to-bottom, left-to-right (step: 5cm)
              for (let stepY = 0.2; stepY <= rw - ih - 0.2; stepY += 0.05) {
                for (let stepX = 0.2; stepX <= rl - iw - 0.2; stepX += 0.05) {
                  if (!overlapsPlaced(stepX, stepY, iw, ih, placed)) {
                    bestX = stepX
                    bestY = stepY
                    foundSpot = true
                    break
                  }
                }
                if (foundSpot) break
              }
              
              if (foundSpot) {
                placedItem = {
                  ...item,
                  x: Math.round(bestX * 100) / 100,
                  y: Math.round(bestY * 100) / 100,
                  rotation: rot,
                }
                break // placed successfully with this rotation
              }
            }
            
            // Fallback if no spot found with either rotation (place it at default offset)
            if (!placedItem) {
              const rot = 0
              const iw = w
              const ih = d
              let xOffset = 0.2
              let yOffset = 0.2
              
              if (placed.length > 0) {
                const last = placed[placed.length - 1]
                const lastW = last.rotation === 90 ? last.depth : last.width
                xOffset = Math.min(rl - iw - 0.1, last.x + lastW + 0.15)
                yOffset = last.y
                if (xOffset + iw > rl - 0.1) {
                  xOffset = 0.2
                  yOffset = Math.min(rw - ih - 0.1, last.y + (last.rotation === 90 ? last.width : last.depth) + 0.15)
                }
              }
              
              placedItem = {
                ...item,
                x: Math.max(0.1, Math.round(xOffset * 100) / 100),
                y: Math.max(0.1, Math.round(yOffset * 100) / 100),
                rotation: rot,
              }
            }
            
            placed.push(placedItem)
          }

          const layout = placed

          return { furnitureSuggestions, selectedFurniture, layout }
        }),

      // Layout (Agent 2)
      layout: [],
      setLayout: (layout) => set({ layout }),
      layoutVariants: [],
      setLayoutVariants: (variants) => set({ layoutVariants: variants }),
      activeVariant: 0,
      setActiveVariant: (i) => set({ activeVariant: i }),

      // Camere salvate
      savedRooms: [],
      saveRoom: (name) => {
        const s = get()
        const room = {
          id: Date.now(),
          name: name || `Room ${s.savedRooms.length + 1}`,
          config: s.room,
          style: s.selectedStyle,
          palettes: s.selectedPalettes,
          furniture: s.furnitureSuggestions,
          selectedFurniture: s.selectedFurniture,
          layout: s.layout,
          budget: s.maxBudget,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ savedRooms: [...state.savedRooms, room] }))
      },
      deleteRoom: (id) =>
        set((state) => ({ savedRooms: state.savedRooms.filter((r) => r.id !== id) })),
      renameRoom: (id, name) =>
        set((state) => ({
          savedRooms: state.savedRooms.map((r) => (r.id === id ? { ...r, name } : r)),
        })),
      loadRoom: (id) => {
        const s = get()
        const room = s.savedRooms.find((r) => r.id === id)
        if (room) {
          set({
            room: room.config,
            selectedStyle: room.style,
            selectedPalettes: room.palettes,
            furnitureSuggestions: room.furniture,
            selectedFurniture: room.selectedFurniture,
            layout: room.layout,
            maxBudget: room.budget,
          })
        }
      },

      // Navigare pași
      currentStep: 0,
      setStep: (step) => set({ currentStep: step }),

      // Resetare cameră nouă
      resetRoom: () =>
        set({
          room: { length: '', width: '', height: '' },
          selectedStyle: null,
          selectedPalettes: [],
          maxBudget: '',
          furnitureSuggestions: [],
          selectedFurniture: [],
          layout: [],
          layoutVariants: [],
          activeVariant: 0,
          currentStep: 0,
        }),
    }),
    {
      name: 'interior-designer-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        savedRooms: state.savedRooms,
      }),
    }
  )
)

export default useStore