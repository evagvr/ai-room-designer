import { create } from 'zustand'
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

export default useStore