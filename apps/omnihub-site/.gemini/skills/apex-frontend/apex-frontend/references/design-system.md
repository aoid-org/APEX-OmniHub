# Design System OS

## Tokens (role-based)
### Color roles
- bg, surface, surfaceAlt
- textPrimary, textSecondary, textMuted
- border, divider
- accent, accentHover
- danger, warning, success, info

### Type scale
- display, headline, title, body, caption
Include weights + line-heights.

### Spacing scale
2, 4, 8, 12, 16, 24, 32, 48 (extend if needed)

### Radius
4, 8, 12, 16

### Elevation
0–5 (define shadows per platform)

### Motion
fast 120ms, base 180ms, slow 240ms

## Components (minimum set)
- Buttons (primary/secondary/tertiary/destructive)
- Inputs (text, password, select)
- List row
- Card
- Modal/sheet
- Toast/snackbar
- Tabs
- Navigation bar/app bar
- Loading skeleton

Each component must document states and a11y.

## Governance
- Source of truth: token file (JSON/YAML) → generated per platform
- Semver releases + changelog
- Contribution process (how to add a component)
- Enforcement: lint rules to prevent raw values

## Adoption plan
- Start with top 10 screens
- Replace one component family at a time
- Provide codemods where possible
- Track usage and deprecations
