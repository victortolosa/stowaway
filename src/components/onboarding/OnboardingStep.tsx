import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingStep as OnboardingStepType } from './onboardingSteps';
import { OnboardingHierarchy } from './OnboardingHierarchy';

interface OnboardingStepProps {
    step: OnboardingStepType;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({ step }) => {
    const Icon = step.icon;

    return (
        <div className="flex flex-col items-center text-center space-y-6 py-4">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center justify-center"
            >
                {step.id === 'how-it-works' ? (
                    <OnboardingHierarchy />
                ) : step.image ? (
                    <img
                        src={step.image}
                        alt={step.title}
                        className="w-64 h-64 object-contain"
                    />
                ) : step.emoji ? (
                    <div className="text-6xl animate-bounce-subtle">{step.emoji}</div>
                ) : Icon ? (
                    <div className="p-4 bg-accent-aqua/10 rounded-full text-accent-aqua">
                        <Icon size={48} />
                    </div>
                ) : null}
            </motion.div>

            <div className="space-y-3 max-w-sm px-4">
                <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-2xl font-bold text-text-primary"
                >
                    {step.title}
                </motion.h2>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-text-secondary leading-relaxed"
                >
                    {step.description}
                </motion.p>
            </div>
        </div>
    );
};
