import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({

      user: null,
      isAuthenticated: false,
      login: (email) => set({ user: { email, id: Date.now() }, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      register: (email) => set({ user: { email, id: Date.now() }, isAuthenticated: true }),

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

      layout: [],
      setLayout: (layout) => set({ layout }),
      layoutVariants: [],
      setLayoutVariants: (variants) => set({ layoutVariants: variants }),
      activeVariant: 0,
      setActiveVariant: (i) => set({ activeVariant: i }),

    }),
    {
      name: 'interior-designer-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useStore