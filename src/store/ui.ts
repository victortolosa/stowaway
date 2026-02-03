import { create } from 'zustand'

interface ToastState {
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
}

interface UIState {
    toast: ToastState
    showToast: (message: string, type?: ToastState['type']) => void
    hideToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
    toast: {
        show: false,
        message: '',
        type: 'info',
    },
    showToast: (message, type = 'info') => {
        set({ toast: { show: true, message, type } })
        // Auto-hide after 3 seconds
        setTimeout(() => {
            set((state) => ({ toast: { ...state.toast, show: false } }))
        }, 3000)
    },
    hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),
}))
