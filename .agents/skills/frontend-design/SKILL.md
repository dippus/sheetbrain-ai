---
name: frontend-design
description: Production frontend design toolkit, UI/UX Pro Max aesthetic principles, design tokens, typography scales, micro-interactions, and accessibility standards based on Claude Code Frontend Design Toolkit.
---

# Frontend Design Toolkit & Aesthetic Constitution

## 1. Aesthetic Direction (Kill AI Slop)
- Never default to generic Inter font, purple gradients, or floating white cards.
- Pick an intentional aesthetic: Dark OLED Luxury, Modern Fintech Glassmorphism, or Precision Swiss Minimalist.
- Use curated, high-contrast semantic palettes with brand-tinted neutrals (e.g. Slate/Zinc 950 bases, Emerald/Amber/Cyan accents).
- High visual density with clean whitespace hierarchy ("Ma").

## 2. Typography & Hierarchy
- Strong, deliberate font pairing: Clean geometric/grotesque sans-serif for UI, monospaced tabular numbers for financial/spreadsheet figures.
- Explicit tabular font variant (`font-variant-numeric: tabular-nums`) for all numbers and calculations.
- Tight tracking for headlines (`tracking-tight`), relaxed leading for descriptions.

## 3. Surface & Elevation (The 3-Layer Rule)
- **Base Layer (L0)**: Deep dark background (`#020617` or `#0b0f19`).
- **Surface Layer (L1)**: Elevated containers with 1px border (`border-slate-800/80`), subtle backdrop blur (`backdrop-blur-md`), and gentle inner shadow.
- **Interactive Layer (L2)**: Active cards, inputs, and buttons with emerald/cyan glow, hover scale transitions, and active press states.

## 4. Micro-Interactions & Motion
- Fast, snappy transitions (150ms–200ms `ease-out`).
- Loading states: Shimmer skeleton or subtle pulse. Never block the interface.
- Toast notifications: Slide-in and fade-in with color-coded status badges.
- Data changes: Color-coded delta highlights (e.g. amber/emerald delta tags).

## 5. Accessibility & Responsive Craft
- WCAG AA contrast ratio (>4.5:1) for all text against backgrounds.
- Keyboard navigable: Explicit `:focus-visible` ring outlines.
- Responsive grid: 12-column fluid desktop layout collapsing into stacked mobile viewports.
