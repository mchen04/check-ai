# UX Principles: Check Design Language

## Core Philosophy

Every interaction should feel **effortless, obvious, and satisfying**. Users should never:
- Feel lost or confused
- Have to think about how to do something
- Wait without knowing why
- Encounter unexpected behavior

---

## Cognitive Load Reduction

### 1. Progressive Disclosure

**Principle**: Show only what's needed, when it's needed.

**Implementation**:
- Default views show essential information
- Advanced options hidden behind expandable sections
- Settings organized by frequency of use
- Contextual help appears on hover/focus

**Examples**:
- API response shows verdict first, details expandable
- Settings page: common settings visible, advanced collapsed
- Dashboard: key metrics visible, drill-down on click

### 2. Smart Defaults

**Principle**: Pre-fill sensible values to reduce decisions.

**Implementation**:
- Verification method weights pre-configured for common use cases
- New API keys auto-named with timestamp
- Batch upload assumes sensible defaults
- Theme respects system preference

### 3. Visual Hierarchy

**Principle**: Size, color, and position guide the eye naturally.

**Priority Order**:
1. Primary action (largest, most contrast)
2. Key information (prominent but secondary)
3. Supporting details (smaller, muted)
4. Metadata (smallest, subtle)

**Implementation**:
- Primary button is always the most visually prominent
- Numbers and key metrics are large
- Labels and helper text are smaller and muted
- Actions are consistently positioned

### 4. Consistent Patterns

**Principle**: Same action = same appearance everywhere.

**Rules**:
- Delete is always red, always asks for confirmation
- Primary actions are always teal
- Cancel is always secondary/ghost style
- Success is always green, errors always red
- Links are always underlined or obviously clickable

---

## Navigation & Wayfinding

### 1. Always Know Where You Are

**Implementation**:
- Active nav item is clearly highlighted
- Breadcrumbs for nested pages
- Page titles match nav labels
- URL structure matches navigation

### 2. Always Know Where You Can Go

**Implementation**:
- All clickable elements look clickable
- Disabled states are clearly different
- Hover states provide feedback
- Links have consistent styling

### 3. Never Get Lost

**Implementation**:
- Consistent navigation placement
- Back buttons where needed
- Clear exit routes from modals
- Undo capabilities for destructive actions

---

## Feedback & Response

### 1. Immediate Feedback

**Principle**: Every action gets an immediate response.

**Timing Guidelines**:
- < 100ms: Instant (hover states, button press)
- 100-1000ms: Loading indicator
- > 1000ms: Progress bar or skeleton
- > 5s: Detailed progress with cancel option

**Implementation**:
- Button states change on click immediately
- Loading spinners appear after 200ms
- Skeleton screens for data loading
- Toast notifications for completed actions

### 2. Clear Error Messages

**Principle**: Errors should explain what happened and how to fix it.

**Format**:
```
What happened + Why + What to do
```

**Examples**:
- Bad: "Error 500"
- Good: "Couldn't save changes. The server is temporarily unavailable. Please try again in a few moments."

**Implementation**:
- Error messages are human-readable
- Suggested actions when possible
- Retry buttons for recoverable errors
- Support links for complex issues

### 3. Success Confirmation

**Principle**: Confirm successful actions clearly.

**Implementation**:
- Toast notifications for completed actions
- Visual state changes (checkbox checked, badge updated)
- Redirect to appropriate next screen
- Clear "done" states

---

## Form Design

### 1. Minimize Input

**Principle**: Ask for the minimum required.

**Implementation**:
- Only required fields by default
- Optional fields clearly marked (or hidden)
- Auto-fill where possible
- Smart input types (email, number, etc.)

### 2. Real-time Validation

**Principle**: Validate as the user types.

**Implementation**:
- Inline validation after field loses focus
- Error messages appear below the field
- Success indicators for valid input
- Don't validate while actively typing

### 3. Clear Labels

**Principle**: Labels should be unambiguous.

**Implementation**:
- Labels above inputs (not placeholder-only)
- Helper text for complex fields
- Required indicators consistent
- Error states don't move layout

---

## Empty States

### 1. Guide, Don't Abandon

**Principle**: Empty states are opportunities to guide users.

**Implementation**:
- Explain why it's empty
- Suggest what to do next
- Provide clear CTA
- Use appropriate illustration (not generic)

**Examples**:
- No verifications: "Run your first verification" + Start button
- No API keys: "Create an API key to get started" + Create button
- No results: "No verifications match your filters" + Clear filters button

### 2. Empty vs Error vs Loading

**Distinguish clearly**:
- Empty: No data exists yet (guide to create)
- Error: Couldn't load data (explain + retry)
- Loading: Data is loading (skeleton + spinner)
- No results: Data exists but filtered out (clear filters)

---

## Data Display

### 1. Scannability

**Principle**: Key information visible within seconds.

**Implementation**:
- Tables have clear column headers
- Important data in leftmost columns
- Visual indicators (badges, icons) for status
- Row-level actions consistently placed

### 2. Information Density

**Principle**: Balance completeness with clarity.

**Implementation**:
- Compact mode for power users (optional)
- Adequate whitespace by default
- Expandable rows for details
- Pagination for long lists

### 3. Real-time Updates

**Principle**: Data should feel current.

**Implementation**:
- Relative timestamps ("2 minutes ago")
- Auto-refresh indicators
- Manual refresh option
- Highlight recently changed items

---

## Accessibility

### 1. Keyboard Navigation

**Requirements**:
- All interactive elements focusable
- Focus order matches visual order
- Focus indicators clearly visible
- Escape closes modals

### 2. Screen Readers

**Requirements**:
- Semantic HTML (heading order, landmarks)
- ARIA labels where needed
- Alt text for meaningful images
- Status announcements for dynamic content

### 3. Visual Accessibility

**Requirements**:
- 4.5:1 contrast ratio for text
- 3:1 contrast for large text and UI
- Don't rely on color alone
- Reduced motion option respected

---

## Mobile Considerations

### 1. Touch Targets

**Minimum**: 44x44px touch targets
**Spacing**: Adequate space between tap targets
**Position**: Primary actions within thumb reach

### 2. Responsive Patterns

- Sidebar collapses to hamburger menu
- Tables become cards on mobile
- Modals become full-screen sheets
- Long forms break into steps

### 3. Performance

- Fast load times (< 3 seconds)
- Offline-capable where possible
- Skeleton screens prevent layout shift
- Optimized images

---

## Decision Framework

When making UX decisions, ask:

1. **Is this the simplest solution?**
   Complexity should be justified.

2. **Does this match user expectations?**
   Leverage existing mental models.

3. **What happens if this fails?**
   Design for error cases.

4. **Can users undo this?**
   Provide safety nets.

5. **Will this scale?**
   Consider 0, 1, many scenarios.

---

## Anti-Patterns to Avoid

### Never Do

- **Surprise deletions**: Always confirm destructive actions
- **Mystery meat navigation**: All clickable elements should look clickable
- **Modal overload**: Don't stack modals or require modals for simple actions
- **Pagination as only option**: Provide sorting/filtering first
- **Generic errors**: Always explain what went wrong
- **Hidden requirements**: Show all requirements upfront
- **Disabled buttons without explanation**: Explain why something is disabled
- **Auto-playing anything**: Let users control media
- **Breaking the back button**: Navigation should be predictable
- **Inconsistent capitalization**: Pick a style and stick to it

---

## Success Metrics

### Quantitative

- Task completion rate > 95%
- Error recovery rate > 90%
- Time to first action < 30 seconds
- Rage clicks = 0
- Form abandonment < 10%

### Qualitative

- Users can explain what the product does in one sentence
- Users can complete primary tasks without help
- Users trust the interface with important actions
- Users return to use the product repeatedly

---

## Implementation Checklist

For every new feature or page:

- [ ] Clear primary action identified
- [ ] Visual hierarchy established
- [ ] Empty state designed
- [ ] Error states designed
- [ ] Loading states designed
- [ ] Mobile layout considered
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Contrast ratios pass
- [ ] Consistent with existing patterns
- [ ] Undo capability where appropriate
- [ ] Help text where needed
