import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
    isOpen: boolean;
    hasSeenOnboarding: boolean;

    openOnboarding: () => void;
    closeOnboarding: () => void;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            isOpen: false,
            hasSeenOnboarding: false,

            openOnboarding: () => set({ isOpen: true }),

            closeOnboarding: () => set({ isOpen: false }),

            completeOnboarding: () => set({
                isOpen: false,
                hasSeenOnboarding: true
            }),

            resetOnboarding: () => set({
                hasSeenOnboarding: false,
                isOpen: true
            }),
        }),
        {
            name: 'stowaway-onboarding-storage',
            partialize: (state) => ({ hasSeenOnboarding: state.hasSeenOnboarding }),
        }
    )
);
