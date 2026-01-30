---
name: ui-design
description: Master UI design - visual design, design systems, components, typography, color theory
sasmp_version: "1.3.0"
bonded_agent: 02-ui-design
bond_type: PRIMARY_BOND
---

# UI Design Skill

> **Atomic Skill**: Create visually compelling and systematic user interfaces

## Purpose

This skill provides structured approaches to visual design, design systems, and component creation.

## Skill Invocation

```
Skill("custom-plugin-ux-design:ui-design")
```

## Parameter Schema

### Input Parameters
```typescript
interface UIDesignParams {
  // Required
  task: "visual" | "system" | "component" | "typography" | "color";
  scope: string;

  // Optional
  brand?: {
    colors?: string[];
    fonts?: string[];
    guidelines_url?: string;
  };
  platform?: "web" | "mobile" | "desktop" | "cross-platform";
  constraints?: {
    accessibility_level?: "AA" | "AAA";
    dark_mode?: boolean;
  };
}
```

### Validation Rules
```yaml
task:
  type: enum
  required: true
  values: [visual, system, component, typography, color]

scope:
  type: string
  required: true
  min_length: 5

platform:
  type: enum
  default: "web"
  values: [web, mobile, desktop, cross-platform]
```

## Execution Flow

```
UI DESIGN EXECUTION
────────────────────────────────────────────

Step 1: ANALYZE REQUIREMENTS
├── Parse brand guidelines
├── Identify constraints
└── Define design scope

Step 2: ESTABLISH FOUNDATIONS
├── Define design tokens
├── Set up grid system
└── Create base styles

Step 3: CREATE COMPONENTS
├── Design atomic elements
├── Build component variants
└── Document specifications

Step 4: COMPOSE LAYOUTS
├── Apply visual hierarchy
├── Ensure consistency
└── Optimize for platform

Step 5: VALIDATE & HANDOFF
├── Check accessibility
├── Generate specifications
└── Prepare assets

────────────────────────────────────────────
```

## Retry Logic

```yaml
retry_config:
  max_attempts: 3
  backoff_type: exponential
  initial_delay_ms: 1000
  max_delay_ms: 10000
  retryable_errors:
    - ASSET_GENERATION_FAILED
    - TOKEN_SYNC_ERROR
    - EXPORT_INTERRUPTED
```

## Logging Hooks

```typescript
interface DesignLog {
  timestamp: string;
  event: "start" | "token_created" | "component_built" | "error" | "complete";
  task: string;
  tokens_defined: number;
  components_created: number;
  accessibility_score: number;
}
```

## Learning Modules

### Module 1: Visual Hierarchy
```
VISUAL HIERARCHY PRINCIPLES
├── Size and scale
├── Color and contrast
├── Typography weight
├── Spacing and proximity
├── Alignment and grids
└── Visual flow patterns
```

### Module 2: Design Tokens
```
TOKEN ARCHITECTURE
├── Primitive tokens (raw values)
│   ├── Colors: #hex values
│   ├── Spacing: px/rem values
│   └── Typography: font specs
├── Semantic tokens (purpose)
│   ├── color-text-primary
│   ├── spacing-component-gap
│   └── font-heading-lg
└── Component tokens (scoped)
    ├── button-background
    ├── card-padding
    └── input-border-color
```

### Module 3: Component Design
```
COMPONENT ANATOMY
├── Base state
├── Hover state
├── Active state
├── Focus state
├── Disabled state
├── Loading state
└── Error state

COMPONENT VARIANTS
├── Size variants (sm, md, lg)
├── Style variants (primary, secondary)
└── Context variants (dark, light)
```

### Module 4: Typography Systems
```
TYPE SCALE DESIGN
├── Base size selection (16px)
├── Scale ratio (1.25 major third)
├── Heading hierarchy
├── Body text styles
├── Caption and labels
└── Responsive adjustments

FONT PAIRING
├── Primary font (headings)
├── Secondary font (body)
└── Monospace (code)
```

### Module 5: Color Systems
```
COLOR ARCHITECTURE
├── Brand colors
│   ├── Primary
│   ├── Secondary
│   └── Accent
├── Neutral palette
│   ├── Gray scale
│   └── Background/surface
├── Semantic colors
│   ├── Success (green)
│   ├── Warning (yellow)
│   ├── Error (red)
│   └── Info (blue)
└── State colors
    ├── Hover variations
    ├── Active variations
    └── Disabled variations
```

## Error Handling

| Error Code | Description | Recovery |
|------------|-------------|----------|
| `UI-001` | Token undefined | Add to token system |
| `UI-002` | Contrast failure | Suggest accessible colors |
| `UI-003` | Component orphaned | Link to design system |
| `UI-004` | Grid misalignment | Snap to grid |
| `UI-005` | Asset export failed | Retry with fallback format |

## Troubleshooting

### Problem: Design inconsistency
```
Diagnosis:
├── Check: Token usage
├── Check: Component variants
├── Check: Manual overrides
└── Solution: Audit and standardize

Steps:
1. Extract all style values
2. Compare to token definitions
3. Replace hardcoded values
4. Update component library
```

### Problem: Dark mode issues
```
Diagnosis:
├── Check: Semantic color mapping
├── Check: Contrast in dark mode
├── Check: Image/icon adaptation
└── Solution: Separate dark tokens

Steps:
1. Create dark mode token set
2. Map semantic colors
3. Test all components
4. Adjust problem areas
```

## Unit Test Templates

```typescript
describe("UIDesignSkill", () => {
  describe("token generation", () => {
    it("should create valid color tokens", async () => {
      const result = await invoke({
        task: "color",
        scope: "primary palette"
      });
      expect(result.tokens.colors).toBeDefined();
      expect(result.tokens.colors.primary).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe("accessibility compliance", () => {
    it("should meet AA contrast requirements", async () => {
      const result = await invoke({
        task: "color",
        constraints: { accessibility_level: "AA" }
      });
      expect(result.contrast_ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("component specification", () => {
    it("should include all states", async () => {
      const result = await invoke({
        task: "component",
        scope: "button"
      });
      const states = ["default", "hover", "active", "focus", "disabled"];
      states.forEach(state => {
        expect(result.component.states).toContain(state);
      });
    });
  });
});
```

## Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token coverage | > 95% | Styles using tokens |
| Accessibility | 100% | AA compliance |
| Component reuse | > 80% | Instances vs customs |
| Consistency score | > 95% | Design audit |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-30 | Production-grade upgrade |
