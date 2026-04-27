import { create } from 'zustand'

const useStore = create((set) => ({
  // Room config
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

}))

export default useStore