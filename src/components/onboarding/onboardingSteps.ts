
import { Plus, QrCode, type LucideIcon } from 'lucide-react';

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon?: LucideIcon; // Lucide icon component
    emoji?: string;
    image?: string; // Path to illustration
    component?: React.ReactNode; // Custom component for creating complex layouts
    ctaText?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to Stowaway',
        description: 'Keep track of everything you own. Stop searching, start finding.',
        emoji: '👋',
        ctaText: 'Let\'s Go',
    },
    {
        id: 'how-it-works',
        title: 'How It Works',
        description: 'Stowaway helps you organize your physical world hierarchically.',
        // Custom component handles visuals
        // Custom component will be rendered by the carousel for this step ID
    },
    {
        id: 'quick-actions',
        title: 'Quick Actions',
        description: 'Use the + button anywhere to add new items, containers, or places.',
        icon: Plus,
    },
    {
        id: 'qr-codes',
        title: 'Scan & Find',
        description: 'Print QR codes for your containers. Scan them later to instantly see what\'s inside without opening the box.',
        icon: QrCode,
        ctaText: 'Start Organizing',
    },
];
