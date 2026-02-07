import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ONBOARDING_STEPS } from './onboardingSteps';
import { OnboardingStep } from './OnboardingStep';

interface OnboardingCarouselProps {
    onComplete: () => void;
    onSkip?: () => void;
}

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({
    onComplete,
    onSkip
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalSteps = ONBOARDING_STEPS.length;
    const currentStep = ONBOARDING_STEPS[currentIndex];

    const handleNext = () => {
        if (currentIndex < totalSteps - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden px-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full"
                    >
                        <OnboardingStep step={currentStep} />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center space-x-2 my-6">
                {ONBOARDING_STEPS.map((_, index) => (
                    <div
                        key={index}
                        className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                                ? 'w-6 bg-accent-aqua'
                                : 'w-2 bg-gray-200 dark:bg-gray-700'
                            }`}
                    />
                ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center px-4 pt-4 pb-4 border-t border-border-standard">
                {/* Left: Skip or Back */}
                {currentIndex === 0 ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSkip}
                        className="text-text-secondary hover:text-text-primary"
                    >
                        Skip
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="text-text-secondary hover:text-text-primary pl-0 gap-1"
                    >
                        <ArrowLeft size={16} /> Back
                    </Button>
                )}

                {/* Right: Next or Complete */}
                <Button
                    variant={currentIndex === totalSteps - 1 ? 'accent' : 'primary'}
                    onClick={handleNext}
                    className="gap-2"
                >
                    {currentStep.ctaText ? (
                        currentStep.ctaText
                    ) : currentIndex === totalSteps - 1 ? (
                        <>Get Started <Check size={16} /></>
                    ) : (
                        <>Next <ArrowRight size={16} /></>
                    )}
                </Button>
            </div>
        </div>
    );
};
