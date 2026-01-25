# Typography System: Check Design Language

## Philosophy

Typography is the voice of the interface. Our system prioritizes:

1. **Legibility**: Crystal clear at all sizes
2. **Hierarchy**: Obvious visual weight progression
3. **Character**: Not generic, but not distracting
4. **Consistency**: Same voice everywhere
5. **Performance**: Fast loading, system fallbacks

---

## Font Selection

### Primary: Inter

**Why Inter?**
- Designed specifically for screens and UI
- Large x-height for excellent legibility
- Extensive weight range (100-900)
- Superior number styling for data-heavy UIs
- Variable font support for performance
- Open source, widely available

**Variable Font Features Used**:
- `font-feature-settings: 'cv01' 1, 'cv02' 1` (distinctive character shapes)
- Tabular numbers for data: `font-variant-numeric: tabular-nums`

### Monospace: JetBrains Mono / Geist Mono

**For code blocks and technical content**:
- Clear distinction between similar characters (0/O, 1/l/I)
- Ligatures for better code readability (optional)
- Matches Inter's x-height reasonably well

---

## Type Scale

Based on a **1.25 ratio** (major third) for harmonious progression:

```
Display:   56px / 3.5rem   - Hero headlines
H1:        40px / 2.5rem   - Page titles
H2:        32px / 2rem     - Section headings
H3:        24px / 1.5rem   - Subsection headings
H4:        20px / 1.25rem  - Card titles
H5:        18px / 1.125rem - Emphasized body
Body:      16px / 1rem     - Default text
Small:     14px / 0.875rem - Secondary text
Tiny:      12px / 0.75rem  - Captions, labels
```

---

## Font Weights

### Semantic Weight System

```
Light (300):      Large display text only
Regular (400):    Body text, descriptions
Medium (500):     Emphasis, navigation items
Semibold (600):   Headings, button labels
Bold (700):       Strong emphasis (use sparingly)
```

### Usage Guidelines

| Context | Weight |
|---------|--------|
| Hero headlines | 600 (Semibold) |
| Section headings | 600 (Semibold) |
| Card titles | 500-600 |
| Navigation | 500 (Medium) |
| Body text | 400 (Regular) |
| Button labels | 500 (Medium) |
| Labels/Captions | 500 (Medium) |
| Muted text | 400 (Regular) |

---

## Line Heights

```
Tight:    1.1  - Display text, large headings
Snug:     1.25 - Headings
Normal:   1.5  - Default body text
Relaxed:  1.625 - Long-form content
Loose:    2.0  - Very small text (for legibility)
```

### Usage Guidelines

| Size | Line Height |
|------|-------------|
| Display (56px) | 1.1 (tight) |
| H1 (40px) | 1.15 (tight) |
| H2 (32px) | 1.25 (snug) |
| H3 (24px) | 1.3 (snug) |
| H4 (20px) | 1.4 |
| Body (16px) | 1.5-1.625 |
| Small (14px) | 1.5 |
| Tiny (12px) | 1.5-1.75 |

---

## Letter Spacing (Tracking)

```
Tighter:  -0.03em  - Large display text
Tight:    -0.02em  - Headings
Normal:   -0.01em  - Body text
Wide:     0.025em  - All-caps labels, badges
Wider:    0.05em   - Small uppercase text
```

### Guidelines

- **Larger text = tighter tracking**: Display text looks better with negative tracking
- **Smaller text = looser tracking**: Small text needs room to breathe
- **All-caps = wide tracking**: Always add tracking to uppercase text

---

## Heading Styles

### Display

```css
.text-display {
  font-size: 3.5rem;      /* 56px */
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.03em;
}
```

### H1

```css
h1, .text-h1 {
  font-size: 2.5rem;      /* 40px */
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.025em;
}
```

### H2

```css
h2, .text-h2 {
  font-size: 2rem;        /* 32px */
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
}
```

### H3

```css
h3, .text-h3 {
  font-size: 1.5rem;      /* 24px */
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.015em;
}
```

### H4

```css
h4, .text-h4 {
  font-size: 1.25rem;     /* 20px */
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
}
```

---

## Body Text Styles

### Body Large

```css
.text-body-lg {
  font-size: 1.125rem;    /* 18px */
  font-weight: 400;
  line-height: 1.625;
  letter-spacing: -0.01em;
}
```

### Body (Default)

```css
.text-body {
  font-size: 1rem;        /* 16px */
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: -0.01em;
}
```

### Body Small

```css
.text-body-sm {
  font-size: 0.875rem;    /* 14px */
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;
}
```

### Caption

```css
.text-caption {
  font-size: 0.75rem;     /* 12px */
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.01em;
}
```

---

## Special Styles

### Overline (Labels)

```css
.text-overline {
  font-size: 0.75rem;     /* 12px */
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

### Code (Inline)

```css
.text-code {
  font-family: 'JetBrains Mono', 'Geist Mono', monospace;
  font-size: 0.875em;     /* Relative to parent */
  font-weight: 400;
  background: var(--muted);
  padding: 0.125em 0.375em;
  border-radius: 0.25rem;
}
```

### Tabular Numbers

```css
.text-tabular {
  font-variant-numeric: tabular-nums;
}
```

### Statistical/Metrics

```css
.text-stat {
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

---

## Responsive Typography

### Mobile Adjustments

On screens < 768px:

```
Display: 40px (was 56px)
H1: 32px (was 40px)
H2: 24px (was 32px)
H3: 20px (was 24px)
```

### Implementation

```css
/* Base (mobile) */
.text-display {
  font-size: 2.5rem;
}

/* Desktop */
@media (min-width: 1024px) {
  .text-display {
    font-size: 3.5rem;
  }
}
```

---

## Line Length

Maximum line lengths for optimal readability:

```
Prose/Long-form: 65-75 characters (max-width: 65ch)
UI Text: 45-65 characters
Compact UI: 30-45 characters
```

### CSS Implementation

```css
.prose {
  max-width: 65ch;
}

.text-constrained {
  max-width: 45ch;
}
```

---

## Anti-Patterns

### Don't

- Use more than 2 font families
- Mix too many weights in one section
- Use light weights (300) for body text
- Center-align long paragraphs
- Use justified text
- Skip heading levels (H1 -> H3)
- Use all-caps for long text
- Set body text smaller than 14px

### Do

- Maintain consistent hierarchy
- Use proper semantic heading order
- Keep line lengths reasonable
- Left-align body text
- Use tabular numbers for data
- Add tracking to small/uppercase text
- Test with real content, not lorem ipsum

---

## CSS Variables

```css
:root {
  /* Font Families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Geist Mono', 'SF Mono', monospace;

  /* Font Sizes */
  --text-display: 3.5rem;
  --text-h1: 2.5rem;
  --text-h2: 2rem;
  --text-h3: 1.5rem;
  --text-h4: 1.25rem;
  --text-h5: 1.125rem;
  --text-body: 1rem;
  --text-sm: 0.875rem;
  --text-xs: 0.75rem;

  /* Font Weights */
  --font-light: 300;
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.15;
  --leading-snug: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;

  /* Letter Spacing */
  --tracking-tighter: -0.03em;
  --tracking-tight: -0.02em;
  --tracking-normal: -0.01em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
}
```

---

## Component Examples

### Page Title

```html
<h1 class="text-4xl font-semibold tracking-tight text-foreground">
  Dashboard
</h1>
```

### Section Heading

```html
<h2 class="text-2xl font-semibold tracking-tight text-foreground mb-4">
  Recent Verifications
</h2>
```

### Card Title

```html
<h3 class="text-lg font-medium text-foreground">
  Verification Details
</h3>
```

### Body Text

```html
<p class="text-base text-muted-foreground leading-relaxed">
  Configure your verification methods to match your use case.
</p>
```

### Label

```html
<label class="text-sm font-medium text-foreground">
  API Key
</label>
```

### Helper Text

```html
<p class="text-sm text-muted-foreground">
  Keep this key secure. Do not share it publicly.
</p>
```

### Stat Display

```html
<div class="text-3xl font-semibold tabular-nums text-foreground">
  2,847
</div>
<p class="text-sm text-muted-foreground">Verifications</p>
```
