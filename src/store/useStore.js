import { create } from 'zustand'

const useStore = create((set) => ({
  // Layout (from Agent 2)
  layout: [],
  setLayout: (layout) => set({ layout }),
  layoutVariants: [],
  setLayoutVariants: (variants) => set({ layoutVariants: variants }),
  activeVariant: 0,
  setActiveVariant: (i) => set({ activeVariant: i }),
}))

export default useStore