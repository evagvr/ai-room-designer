import { create } from 'zustand'

const useStore = create((set) => ({
  // Room config
    room: { length: '', width: '', height: '' },
    setRoom: (room) => set({ room }),
}))

export default useStore