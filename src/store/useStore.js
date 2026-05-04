import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
    
      room: { length: '', width: '', height: '' },
      setRoom: (room) => set({ room }),

      savedRooms: [],

      saveRoom: (name) =>
        set((state) => ({
          savedRooms: [
            ...state.savedRooms,
            {
              id: Date.now(),
              name: name || `Room ${state.savedRooms.length + 1}`,
              config: state.room,
            },
          ],
        })),

      deleteRoom: (id) =>
        set((state) => ({
          savedRooms: state.savedRooms.filter((r) => r.id !== id),
        })),

      renameRoom: (id, newName) =>
        set((state) => ({
          savedRooms: state.savedRooms.map((r) =>
            r.id === id ? { ...r, name: newName } : r
          ),
        })),

      loadRoom: (id) =>
        set((state) => {
          const room = state.savedRooms.find((r) => r.id === id)
          return room ? { room: room.config } : {}
        }),

      layout: [],
      setLayout: (layout) => set({ layout }),

      layoutVariants: [],
      setLayoutVariants: (variants) =>
        set({ layoutVariants: variants }),

      activeVariant: 0,
      setActiveVariant: (i) => set({ activeVariant: i }),


      furnitureSuggestions: [],
      setFurnitureSuggestions: (items) =>
        set({ furnitureSuggestions: items }),

      selectedFurniture: [],
      toggleFurnitureItem: (id) =>
        set((state) => ({
          selectedFurniture: state.selectedFurniture.includes(id)
            ? state.selectedFurniture.filter((i) => i !== id)
            : [...state.selectedFurniture, id],
        })),
    }),
    {
      name: 'app-store',
    }
  )
)

export default useStore