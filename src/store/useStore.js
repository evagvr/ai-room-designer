import { create } from 'zustand'
<<<<<<< feature/spatial-optimizer

const useStore = create((set) => ({
  // Layout (from Agent 2)
  layout: [],
  setLayout: (layout) => set({ layout }),
  layoutVariants: [],
  setLayoutVariants: (variants) => set({ layoutVariants: variants }),
  activeVariant: 0,
  setActiveVariant: (i) => set({ activeVariant: i }),
}))
=======
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      
      room: { length: '', width: '', height: '' },
      setRoom: (room) => set({ room }),

      furnitureSuggestions: [],
      setFurnitureSuggestions: (items) => set({ furnitureSuggestions: items }),
      selectedFurniture: [],
      toggleFurnitureItem: (id) => set((s) => ({
        selectedFurniture: s.selectedFurniture.includes(id)
          ? s.selectedFurniture.filter(i => i !== id)
          : [...s.selectedFurniture, id]
      })),

    })
  )
)
>>>>>>> main

export default useStore