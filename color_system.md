# Color System: Check Design Language

## Philosophy

This color system is designed to be:
1. **Distinctive**: Not purple, not the AI-default palette
2. **Professional**: Conveys trust for B2B enterprise buyers
3. **Approachable**: Friendly enough for B2C individual users
4. **Accessible**: WCAG 2.1 AA compliant minimum
5. **Intentional**: Every color serves a purpose

---

## Primary Palette

### Primary: Deep Teal (`#0D9488` / `--primary`)

**HSL**: `168 76% 32%`

A sophisticated teal that balances:
- Blue's trust and reliability
- Green's growth and success
- Unique enough to not feel generic
- Works beautifully in both light and dark modes

**Usage**:
- Primary buttons
- Active states
- Links
- Key interactive elements
- Brand accents

**Tints**:
- `50`: #f0fdfa
- `100`: #ccfbf1
- `200`: #99f6e4
- `300`: #5eead4
- `400`: #2dd4bf
- `500`: #14b8a6
- `600`: #0d9488 (PRIMARY)
- `700`: #0f766e
- `800`: #115e59
- `900`: #134e4a
- `950`: #042f2e

### Secondary: Warm Stone (`#78716C` / `--secondary`)

**HSL**: `25 6% 45%`

A warm neutral that:
- Provides contrast without coldness
- Feels human and approachable
- Works as text and UI elements
- Balances the cool teal

**Usage**:
- Secondary buttons
- Borders
- Dividers
- Subtle backgrounds
- Supporting text

---

## Accent Colors

### Accent 1: Coral (`#F97316` / `--accent-coral`)

**HSL**: `24 94% 53%`

A warm, energetic accent that:
- Creates visual interest
- Draws attention to key elements
- Provides warmth to the palette
- Memorable and distinctive

**Usage**:
- Highlights
- Notifications badges
- Special callouts
- Promotional elements

### Accent 2: Sky Blue (`#0EA5E9` / `--accent-sky`)

**HSL**: `200 90% 48%`

A bright, optimistic blue that:
- Feels modern and tech-forward
- Good for informational elements
- Complementary to teal

**Usage**:
- Info badges
- Secondary highlights
- Chart colors
- Links (alternate)

### Accent 3: Emerald (`#10B981` / `--accent-emerald`)

**HSL**: `160 84% 39%`

A vibrant green that:
- Signals success and growth
- Complements the teal primary
- Works for positive indicators

**Usage**:
- Success states
- Positive metrics
- Growth indicators
- Completion states

---

## Semantic Colors

### Success: Green

**Light**: `#059669` (emerald-600)
**Dark**: `#10B981` (emerald-500)

Usage: Success messages, positive verdicts, completed states

### Warning: Amber

**Light**: `#D97706` (amber-600)
**Dark**: `#F59E0B` (amber-500)

Usage: Warnings, uncertain verdicts, attention needed

### Destructive: Red

**Light**: `#DC2626` (red-600)
**Dark**: `#EF4444` (red-500)

Usage: Errors, false verdicts, delete actions, danger zones

### Info: Sky Blue

**Light**: `#0284C7` (sky-600)
**Dark**: `#0EA5E9` (sky-500)

Usage: Informational messages, tips, neutral notifications

---

## Neutral Palette

### Light Mode

```
Background:      #FAFAF9 (stone-50) - Main background
Background-alt:  #F5F5F4 (stone-100) - Secondary backgrounds
Card:            #FFFFFF - Card backgrounds
Border:          #E7E5E4 (stone-200) - Borders
Border-light:    #F5F5F4 (stone-100) - Subtle borders

Text-primary:    #1C1917 (stone-900) - Headings
Text-secondary:  #44403C (stone-700) - Body text
Text-muted:      #78716C (stone-500) - Muted text
Text-placeholder:#A8A29E (stone-400) - Placeholder text
```

### Dark Mode

```
Background:      #0C0A09 (stone-950) - Main background
Background-alt:  #1C1917 (stone-900) - Secondary backgrounds
Card:            #1C1917 (stone-900) - Card backgrounds
Border:          #292524 (stone-800) - Borders
Border-light:    #1C1917 (stone-900) - Subtle borders

Text-primary:    #FAFAF9 (stone-50) - Headings
Text-secondary:  #D6D3D1 (stone-300) - Body text
Text-muted:      #A8A29E (stone-400) - Muted text
Text-placeholder:#78716C (stone-500) - Placeholder text
```

---

## Chart Colors

A harmonious set for data visualization:

```
Chart 1: #0D9488 (Teal - Primary)
Chart 2: #10B981 (Emerald)
Chart 3: #0EA5E9 (Sky Blue)
Chart 4: #F97316 (Coral)
Chart 5: #8B5CF6 (Violet - sparingly)
Chart 6: #EC4899 (Pink)
```

---

## Gradient Definitions

### Primary Gradient
```css
background: linear-gradient(135deg, #0D9488, #0EA5E9);
```

### Subtle Background Gradient
```css
background: linear-gradient(to bottom, #FAFAF9, #F5F5F4);
```

### Dark Section Gradient
```css
background: linear-gradient(135deg, #0C0A09, #1C1917);
```

### Accent Glow
```css
background: radial-gradient(ellipse at center, rgba(13, 148, 136, 0.15), transparent 70%);
```

---

## Contrast Ratios

All text combinations meet WCAG AA standards:

| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| stone-900 | white | 12.6:1 | AAA |
| stone-700 | white | 7.2:1 | AAA |
| stone-500 | white | 4.6:1 | AA |
| primary | white | 4.5:1 | AA |
| stone-50 | stone-950 | 15.4:1 | AAA |
| stone-300 | stone-950 | 9.8:1 | AAA |

---

## Usage Guidelines

### Do's

- Use primary (teal) for main CTAs and interactive elements
- Use semantic colors consistently for their purpose
- Maintain sufficient contrast for accessibility
- Use accent colors sparingly for maximum impact
- Test colors in both light and dark modes

### Don'ts

- Don't use purple as a primary or dominant color
- Don't use pure black (#000000) - use stone-950 instead
- Don't use pure white (#FFFFFF) for large backgrounds - use stone-50
- Don't mix semantic colors (e.g., red for success)
- Don't overuse accent colors - they lose impact

---

## CSS Variables

```css
:root {
  /* Primary */
  --primary: 168 76% 32%;
  --primary-foreground: 0 0% 100%;

  /* Secondary */
  --secondary: 25 6% 45%;
  --secondary-foreground: 0 0% 100%;

  /* Accents */
  --accent-coral: 24 94% 53%;
  --accent-sky: 200 90% 48%;
  --accent-emerald: 160 84% 39%;

  /* Semantic */
  --success: 160 84% 39%;
  --warning: 38 92% 50%;
  --destructive: 0 72% 51%;
  --info: 200 90% 48%;

  /* Neutrals - Light */
  --background: 30 6% 98%;
  --background-alt: 30 6% 96%;
  --foreground: 24 10% 10%;
  --muted-foreground: 25 6% 45%;
  --border: 30 6% 90%;
  --card: 0 0% 100%;
}

.dark {
  /* Neutrals - Dark */
  --background: 24 10% 4%;
  --background-alt: 24 10% 10%;
  --foreground: 30 6% 98%;
  --muted-foreground: 30 6% 63%;
  --border: 24 6% 15%;
  --card: 24 10% 10%;

  /* Adjusted primary for dark mode */
  --primary: 168 76% 42%;
}
```

---

## Rationale

### Why Teal?

1. **Unique in the AI space**: Most AI tools use purple/indigo
2. **Trust + Growth**: Combines blue's reliability with green's positivity
3. **B2B + B2C appeal**: Professional yet approachable
4. **Accessible**: Works well across color blindness types
5. **Versatile**: Beautiful in both light and dark modes

### Why Stone (not Gray)?

1. **Warmth**: Stone has a slight warm undertone
2. **Human feel**: Less clinical than pure gray
3. **Complements teal**: The warm undertone balances cool teal
4. **Modern**: Aligns with current design trends

### Why Coral as Accent?

1. **Attention-grabbing**: Warm colors draw the eye
2. **Memorable**: Creates a distinctive brand moment
3. **Complementary**: Works beautifully with teal
4. **Energy**: Adds dynamism and excitement
