import React, { useEffect } from 'react';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingCarousel } from './OnboardingCarousel';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
    const {
        isOpen,
        hasSeenOnboarding,
        openOnboarding,
        closeOnboarding,
        completeOnboarding
    } = useOnboardingStore();

    // Auto-open on first visit
    useEffect(() => {
        // Small delay to ensure hydration or just let the app load first
        const timer = setTimeout(() => {
            if (!hasSeenOnboarding) {
                openOnboarding();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [hasSeenOnboarding, openOnboarding]);

    const handleSkip = () => {
        completeOnboarding();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeOnboarding()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg md:max-w-2xl bg-bg-page rounded-2xl shadow-xl z-50 outline-none p-0 overflow-hidden h-[600px] max-h-[90vh] flex flex-col">

                    {/* Header */}
                    <div className="flex justify-end p-4 absolute top-0 right-0 z-10">
                        <Dialog.Close asChild>
                            <button
                                onClick={closeOnboarding}
                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Carousel */}
                    <div className="flex-1 w-full h-full pt-8">
                        <OnboardingCarousel
                            onComplete={completeOnboarding}
                            onSkip={handleSkip}
                        />
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
