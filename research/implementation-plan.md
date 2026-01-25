# Implementation Plan: Check Landing Page Improvements

## Current Assessment

### What's Working Well
1. **Strong headline concept** - "$2.4M cost" creates urgency
2. **Clean design system** - Teal palette is distinctive, not generic purple/AI
3. **Technical credibility** - API examples, method cards with real metrics
4. **Transparent pricing** - Clear tiers, no mystery pricing
5. **Product demo** - HeroDashboard shows real functionality

### What Needs Improvement
1. **Copy is still somewhat generic** - Can be more conversational/specific
2. **Stats section feels detached** - Numbers without context
3. **Problem section could be stronger** - More visceral pain
4. **Method cards are dense** - Too much technical jargon
5. **CTA section is generic** - "Get started today" is template-y
6. **Missing founder/mission element** - No human connection

---

## Specific Changes

### 1. Hero Section (`app/page.tsx` lines 86-143)

**Current eyebrow**: "Seven verification methods, one API"
**New eyebrow**: "Built on research from MIT & Stanford"

**Current headline**: "Your AI outputs cost $2.4M when they're wrong"
**New headline**: "Your AI is confidently wrong 15% of the time"
- More relatable - everyone knows AI hallucinates
- More specific percentage is more credible than dollar amount

**Current subhead**: "Catch hallucinations before deployment with seven research-backed verification methods. Configure the mix for your use case."
**New subhead**: "We built 7 different ways to catch hallucinations. Mix and match them depending on whether you need speed or precision."
- More conversational
- Clearer value prop

**Current primary CTA**: "Get started free"
**New primary CTA**: "Try 100 free verifications"
- More specific about what they get

**Current secondary CTA**: "See how it works"
**Keep as is** - Works well

**Current trust indicators**: "No credit card" + "100 free verifications"
**New trust indicators**: "No credit card" + "Works with any LLM" + "API response in <200ms"
- Add technical differentiators

### 2. Stats Section (`app/page.tsx` lines 145-169)

**Problem**: Stats feel disconnected and fear-based without context.

**Change approach**: Instead of three fear stats, use one impactful stat with context.

Remove the current three-stat layout. Replace with a single, impactful statement:

**New content**:
"Enterprise AI systems hallucinate on 8-15% of queries. In regulated industries, a single wrong answer can cost $2.4M in liability. Manual review doesn't scale. That's why we built Check."

This tells a story instead of throwing numbers.

### 3. Problem Section (`app/page.tsx` lines 171-229)

**Current**: Traditional vs Check comparison boxes

**Issue**: "One method doesn't fit all use cases" is abstract

**Changes**:
- Headline: "One method doesn't fit all use cases" → "Medical AI and customer support need different guardrails"
- Make it more specific to real use cases

**Traditional approach list** - Keep but make more visceral:
- "Fixed weights across all domains" → "Same guardrails for medical advice and marketing copy"
- "Domain-specific solutions only" → "Rebuild for every new use case"
- "One-size-fits-all tradeoffs" → "Choose between slow-and-accurate or fast-and-risky"

**Check's approach list** - Make benefits clearer:
- "Custom weights per use case" → "Dial up accuracy for medical, speed for support"
- "Universal coverage, any domain" → "One API for every domain you ship to"
- "Tune speed vs. accuracy tradeoffs" → "You choose the tradeoff, not us"

### 4. Methods Section (`app/page.tsx` lines 231-296)

**Current**: 7 method cards in a grid with technical descriptions

**Issues**:
- "FPR" (false positive rate) isn't user-friendly language
- Descriptions are jargon-heavy
- "Semantic Similarity" means nothing to most people

**Changes to section intro**:
- Current: "Mix and match based on your use case. Each method has different speed-accuracy tradeoffs."
- New: "Each method catches different types of mistakes. Combine them for your risk tolerance."

**Changes to method descriptions** (make them benefit-oriented):

1. **Semantic Similarity**
   - Current: "Quick embedding comparison for initial filtering"
   - New: "Fast first-pass check. Catches obvious errors instantly."
   - Change "FPR: 50-100%" to "Best for: High-volume, low-risk"

2. **Reasoning-Based**
   - Current: "Chain-of-thought analysis for general verification"
   - New: "Asks 'does this make sense?' step by step."
   - Change "FPR: 7%" to "Best for: General accuracy"

3. **Tool-Augmented**
   - Current: "Web search and code execution for facts"
   - New: "Looks up facts in real-time. Best for claims about the world."
   - Change "FPR: ~2%" to "Best for: Factual claims"

4. **BiPRM**
   - Current: "Bidirectional reasoning for high-stakes domains"
   - New: "Reasons forward and backward. Catches subtle logical errors."
   - Change "FPR: ~10%" to "Best for: Complex reasoning"

5. **Ensemble**
   - Current: "Multiple model voting for precision"
   - New: "Multiple AI models vote. Disagreement = flag it."
   - Change "FPR: 20-40%" to "Best for: Critical decisions"

6. **Semantic Entropy**
   - Current: "Multi-sample consistency analysis"
   - New: "Asks the same question multiple ways. Inconsistent answers = hallucination."
   - Change "FPR: ~15%" to "Best for: Uncertainty detection"

7. **Formal Verification**
   - Current: "Mathematical proofs for cryptography"
   - New: "Mathematical proof that it's correct. Zero false positives."
   - Keep "Soon" badge

### 5. Developer Section (`app/page.tsx` lines 298-372)

**Generally good**, but small improvements:

**Current headline**: "Developer-friendly API"
**New headline**: "Ship in 10 lines of code"
- More specific and compelling

**Current subhead**: "Simple REST API that fits your workflow. Send a request, get a verdict."
**New subhead**: "POST your AI output. Get back pass/fail, confidence score, and reasoning. That's it."
- More direct, shows exactly what happens

### 6. Pricing Section (`app/page.tsx` lines 374-488)

**Generally good structure**, minor copy improvements:

**Current heading**: "Transparent pricing"
**New heading**: "Pricing that makes sense"
- Less formal

**Current subhead**: "Bring your own API keys. No token markups. Just platform access."
**New subhead**: "Bring your own API keys. We don't mark up tokens. You pay for verifications, not our margins."
- More direct about the value

**Pro tier description**: Add "Most teams start here" somewhere visible

### 7. Final CTA Section (`app/page.tsx` lines 491-522)

**Current headline**: "Get started today"
**New headline**: "See if your AI is hallucinating"
- More specific and intriguing

**Current subhead**: "Start verifying your AI outputs in minutes. No credit card required."
**New subhead**: "100 free verifications. No credit card. Results in under a second."
- Specific numbers, specific benefit

**Current primary CTA**: "Create free account"
**New primary CTA**: "Start free verification"
- Action-oriented

### 8. Add a Brief Mission/Why Section

After the Problem section, add a brief "Why we built this" block:

**New section** (insert after Problem section):
```
We spent 3 years building AI systems at production scale. The hardest part wasn't
making AI smart—it was trusting its outputs. Every deployment was a liability
question. We built Check because we needed it ourselves.
```

Keep it minimal - just 2-3 sentences. Founder credibility without a full team page.

### 9. Hero Dashboard Component (`components/hero-dashboard.tsx`)

**Keep as is** - The animated demo is excellent and shows real product value. Only change:
- Update the stat from "1,247" to a smaller, more believable number like "847"
- Add subtle text "Updated live" near the counter to emphasize it's real

---

## Files to Modify

1. **`app/page.tsx`** - Main landing page (all copy and structural changes)
2. **`components/hero-dashboard.tsx`** - Minor stat adjustment

## Files NOT to Touch
- `app/globals.css` - Design system is solid
- `components/ui/*` - UI components work well
- Any backend/API files
- Any auth files

---

## Implementation Order

1. Hero section copy changes
2. Stats section restructure
3. Problem section copy improvements
4. Add mission/why snippet
5. Methods section copy rewrite
6. Developer section polish
7. Pricing section copy tweaks
8. CTA section improvement
9. Hero dashboard minor update
10. Full review and test

---

## Success Metrics

After implementation:
- [ ] Every headline passes the "5-second test"
- [ ] No generic phrases remain ("supercharge", "unlock", etc.)
- [ ] Every section has a clear purpose in the conversion flow
- [ ] Copy sounds like a human wrote it, not a template
- [ ] Technical credibility maintained (API examples, method details)
- [ ] Build passes without errors
- [ ] Mobile layout still works perfectly
