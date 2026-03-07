# Visual Craft (Make it unmistakably designed)

Use this when you need **high aesthetic quality** and distinctive art direction.

## Step 1: Choose a clear art direction (commit)
Pick 1 primary + 1 accent direction. Write it as a sentence:
- “Editorial minimalism with brutalist typography accents.”
- “Retro-futuristic neon on deep charcoal with glassy surfaces.”
- “Organic, tactile, warm neutrals with subtle grain and rounded geometry.”
- “Industrial utilitarian UI with precise grids and high-contrast signals.”

## Step 2: Build the visual system (tokens with intent)
### Color
- Base: 1 background + 1 surface + 1 textPrimary
- Accents: 1 brand accent + 1 danger + 1 success (role-based)
Rules:
- Dominant neutrals + decisive accents beats rainbow palettes.
- Use contrast to create hierarchy, not decoration.

### Typography
- Pick a display voice + a body workhorse.
- Define a scale and stick to it: display / headline / title / body / caption.
Hierarchy rules:
- Max 3 font sizes per screen region.
- Increase line-height for dense content; tighten for headings.

### Spacing & layout
- Use a spacing scale (8-based is common).
- Align edges and rhythms; avoid “almost aligned” values.
- Create focal points: a deliberate hero region or anchor element.

### Depth & emphasis
- Use elevation sparingly; prefer hierarchy through spacing and type first.
- If using shadows: make them consistent and physically plausible.

## Step 3: Composition patterns
- Asymmetry with a grid: break the grid intentionally, not accidentally.
- Contrast pairs: big/small, quiet/loud, dense/sparse.
- Repetition: repeat shapes, radii, and spacing to feel cohesive.
- One signature moment: a hero animation, a unique header, a distinctive card.

## Step 4: Detail polish checklist
- [ ] Baseline alignment for type
- [ ] Consistent corner radius across components
- [ ] Consistent icon stroke/weight
- [ ] Hover/pressed/focus states feel deliberate
- [ ] No awkward widows/orphans in headings
- [ ] Skeletons match layout (no jitter on load)
- [ ] Empty states match tone (not generic clipart vibe)

## “Avoid AI slop” rules
- No default-looking component kits without customization.
- Avoid overused “purple gradient on white” unless the brand calls for it.
- Avoid generic spacing/type defaults; tune them to the context.
- Always add 1–2 distinctive brand signatures (type, shape, motion, texture).
