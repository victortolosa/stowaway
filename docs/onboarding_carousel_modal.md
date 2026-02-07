# Onboarding Carousel Modal - Implementation Plan

## Overview
A guided onboarding experience that introduces new users to the core features of Stowaway through an interactive carousel modal. The modal appears on first launch and walks users through the main concepts and workflows.

---

## Goals
- **Educate users** on core concepts: Places, Containers, and Items
- **Reduce friction** for first-time users by explaining the hierarchy
- **Drive engagement** by encouraging users to create their first entities
- **Be skippable** for users who want to dive in immediately

---

## Proposed Steps

### Step 1: Welcome
- Welcome message with app branding
- Brief value proposition
- "Get Started" / "Skip" buttons

### Step 2: How It Works
Visual diagram showing the hierarchy:

```
┌─────────────────────────────────────┐
│  📍 Place (Home, Office, Garage)    │
│  └── 📦 Container (Box, Shelf, Bin) │
│       └── 🏷️ Item (Your stuff)      │
└─────────────────────────────────────┘
```

- **Places** → Physical locations (Home, Office, Storage Unit)
- **Containers** → Organizational units within places (Boxes, Shelves, Drawers)
- **Items** → Individual things you're tracking

### Step 3: Quick Actions
- Overview of the "+" button for adding entities
- Mention batch creation for efficiency
- Optional: prompt to create first Place

### Step 4: Completion
- Celebration/success message
- "Start Organizing" CTA
- Optional checkbox: "Don't show again"

---

## Technical Design

### Config-Driven Architecture
All step content is defined in a single config file for easy updates:

```typescript
// src/components/onboarding/onboardingSteps.ts

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon?: string;           // Lucide icon name or emoji
  illustration?: string;   // Optional image path
  ctaText?: string;        // Custom CTA button text
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Stowaway',
    description: 'Keep track of everything you own...',
    icon: '👋',
  },
  {
    id: 'places',
    title: 'Start with Places',
    description: 'Places are physical locations...',
    icon: 'MapPin',
  },
  // ... add/remove/reorder steps here
];
```

### Component Structure
```
src/components/
  onboarding/
    OnboardingModal.tsx       # Main modal with open/close state
    OnboardingCarousel.tsx    # Renders steps from config
    OnboardingStep.tsx        # Generic step renderer
    onboardingSteps.ts        # ⭐ EDIT THIS FILE to change content
```

### How to Update Steps
1. Open `onboardingSteps.ts`
2. Add, remove, or reorder items in the `ONBOARDING_STEPS` array
3. Update `title`, `description`, `icon` as needed
4. No component changes required!

### State Management
- Track current step index
- Store completion status in localStorage or IndexedDB
- Persist "don't show again" preference

### Entry Points
- Auto-show on app first launch (check `onboardingComplete` flag)
- Manual access via Settings > "Replay Onboarding"

### UI/UX Considerations
- Progress dots or step indicator
- Previous/Next navigation buttons
- Step transition animations
- Responsive design for mobile-first experience
- Illustrations or icons for each concept

---

## Implementation Phases

### Phase 1: Core Modal Infrastructure
- [ ] Create `OnboardingModal` component with open/close logic
- [ ] Create `OnboardingStepper` with step navigation
- [ ] Add localStorage flag for completion tracking
- [ ] Add modal trigger on first app launch

### Phase 2: Step Content
- [ ] Design and implement each step component
- [ ] Add step illustrations or icons
- [ ] Write concise, friendly copy for each step

### Phase 3: Polish & Integration
- [ ] Add step transition animations
- [ ] Implement "Skip" and "Don't show again" functionality
- [ ] Add Settings toggle to replay onboarding
- [ ] Test on various screen sizes

---

## Open Questions
1. Should we include interactive demos (e.g., guided creation of first Place)?
2. What illustrations/graphics to use for each step?
3. Should onboarding be shown on web only, or also on future mobile apps?
4. Do we want analytics to track step completion/drop-off?

---

## Success Metrics
- Reduction in user confusion/support requests
- Increase in first-day entity creation
- Onboarding completion rate
- User retention after onboarding
