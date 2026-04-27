import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
    persist(
        (set) => ({
        // Auth
        user: null,
        isAuthenticated: false,
        login: (email) => set({ user: { email, id: Date.now() }, isAuthenticated: true }),
        logout: () => set({ user: null, isAuthenticated: false }),
        register: (email) => set({ user: { email, id: Date.now() }, isAuthenticated: true }),
        
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