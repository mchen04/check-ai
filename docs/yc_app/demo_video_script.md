### Demo Flow: What to Do and Say

#### **[0:00–0:15] Hook — The Problem (don't skip this)**

**Say:**
> "AI systems hallucinate on 8-15% of queries. In regulated industries, a single wrong answer costs millions. We built Check — one API with multiple verification methods that catches these errors before they reach users."

**Do:** Nothing on screen yet. Just you talking briefly. Or show a quick headline about the Air Canada incident.

---

#### **[0:15–0:40] The API in Action — Playground**

**Do:**
1. Open the Check dashboard
2. Go to the **Playground**
3. Type the FALSE claim: *"The FDA approved ivermectin for COVID-19 treatment in March 2022"*
   - (Tested: Reasoning returns **false at 100% confidence in ~4s**. Tool-augmented returns **false at 90% confidence in ~2s**. Both work great on this claim.)
4. Select verification methods — toggle on **Reasoning** (weight 0.6) + **Tool-Augmented** (weight 0.4)
5. Hit verify
6. Show the result: **FALSE** verdict with confidence score and reasoning explanation

**Say:**
> "Here's a claim that sounds real but is completely false. I'll run it through our reasoning verifier and tool-augmented web search. A few seconds — verdict: FALSE, 100% confidence. It tells you exactly why — the FDA has never approved ivermectin for COVID, with sources."

**WARNING — avoid the fake court case claim for this section.** In testing, tool-augmented returned "uncertain" on *"Smith v. California (2023)"* because it couldn't find search results for a fabricated case. Save that claim for the multi-paradigm section where reasoning/BiPRM/ensemble catch it.

---

#### **[0:40–1:00] Show a TRUE claim for contrast**

**Do:**
1. Type a TRUE claim, e.g. *"The speed of light is approximately 299,792 kilometers per second"*
2. Run with **Reasoning** only (returns **true** with clear explanation in ~4s)
3. Show the TRUE verdict with confidence score

**Say:**
> "Now a true claim — reasoning verification confirms it in a few seconds. The point is you pick the methods that match your accuracy needs. A blog post doesn't need the same rigor as a medical AI."

**NOTE:** Don't use Semantic for this — in testing, semantic returns "uncertain" at 50% confidence on everything. It's an embedding-similarity method, not a fact-checker. Use Reasoning for clear true/false demos.

---

#### **[1:00–1:30] Custom Weighting — The Differentiator**

**Do:**
1. Go back to the playground
2. Type the fake court case: *"The Supreme Court ruled in Smith v. California (2023) that AI-generated content is protected under the First Amendment."*
3. Show toggling on the **strong** methods with weight sliders:
   - 35% Reasoning + 25% Tool + 25% BiPRM + 15% Ensemble
   - (These are the 4 fully production-ready paradigms. Skip semantic/formal — they'll underwhelm.)
4. Hit verify — show the multi-paradigm results
   - Reasoning and BiPRM catch it as false with high confidence. Tool returns uncertain (can't find a fabricated case in search). Ensemble consensus: false. The disagreement between methods is the story.
5. Show the **code generation** tab — click to see the cURL / TypeScript / Python code

**Say:**
> "Now watch the real power — a completely fabricated court case, run through four methods with custom weights. Reasoning and BiPRM both catch it — there's no such case. Tool-augmented can't find it in search results, so it says uncertain instead of guessing. That's the point — different methods fail differently. When you combine them, accuracy compounds. And here's the integration code — it's one API call."

---

#### **[1:30–1:50] Developer Experience — Live API Call**

**Do:**
1. Switch to a **terminal** (split screen or full screen)
2. Run this live cURL command:

```bash
curl -s -X POST http://localhost:3001/api/v1/verify \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The FDA approved ivermectin for COVID-19 treatment in March 2022.",
    "methods": {"reasoning": 0.6, "tool": 0.4}
  }' | python3 -m json.tool
```

3. Show the JSON response streaming back — verdict, confidence, per-paradigm breakdown, cost
4. Then quickly show the **TypeScript SDK** version (paste pre-written snippet or have it in a file):

```typescript
import { Check } from '@check/sdk';

const client = new Check({ apiKey: 'vfy_your_api_key' });
const result = await client.verifyAndWait({
  content: 'The FDA approved ivermectin for COVID-19 treatment in March 2022.',
  methods: { reasoning: 0.6, tool: 0.4 },
});

console.log(result.verdict);     // 'false'
console.log(result.confidence);  // 0.95
console.log(result.decision);    // 'reject'
```

**Say:**
> "Three lines of code. Send us the claim, pick your methods, get back a verdict with confidence and full reasoning. We have TypeScript and Python SDKs, plus LangChain and LlamaIndex integrations. Works with any LLM provider."

---

#### **[1:50–2:15] Per-Key Configuration — "One Key = One Behavior"**

**Do:**
1. Switch back to the dashboard
2. Go to **Settings > API Keys**
3. Show multiple keys configured for different use cases:
   - **"Fast Screening"** — reasoning only, uses Groq/Llama for speed
   - **"Production"** — reasoning + tool, uses Claude + GPT-4o
   - **"High Accuracy"** — reasoning + tool + ensemble, 3 models voting
4. Click into one key — show the per-paradigm model selection, weight sliders, threshold config

**Say:**
> "Here's the Stripe parallel — each API key is a complete configuration. Your chatbot uses the fast key — reasoning only, Groq for sub-second latency. Your medical app uses the high-accuracy key — three methods, three models voting. Same API, different keys, different behavior. You don't change your code — you change your key."

---

#### **[2:15–2:35] Enterprise Features (quick montage)**

**Do:** Click through these quickly — 3-4 seconds each:
1. **BYOK Providers** — show the 16+ provider list (OpenRouter, OpenAI, Anthropic, Google, Groq, etc.)
2. **Batch Processing** — show a batch job with progress tracking
3. **Team/RBAC** — show role management (Owner, Admin, Member, Viewer)
4. **Usage/Analytics** — show the cost breakdown dashboard with per-verification cost tracking

**Say:**
> "Bring your own LLM keys from 16 providers. Batch processing for bulk verification — upload a CSV, we verify thousands. Team management with role-based access. And full usage analytics — you see exactly what each verification costs."

**NOTE:** If they ask about total methods, be honest: "Five production-ready methods today — reasoning, tool-augmented, BiPRM, ensemble, entropy. Semantic is live for basic similarity. Formal verification with real theorem provers is on the roadmap."

---

#### **[2:35–2:50] Bonus — All 7 Methods Test (Optional Speed Run)**

**Do:** If time allows, show a pre-recorded or live run of the test script:

```bash
bash scripts/test-all-methods.sh
```

Show the terminal output scrolling through all 7 methods + multi-paradigm combo, with verdicts, confidence, timing, and cost per method.

**Say:**
> "Here's all seven methods running against the same false claim. Each one approaches verification differently — reasoning uses chain-of-thought, tool-augmented searches the web, ensemble gets three models to vote. Different methods, different strengths. That's why weighting matters."

---

#### **[2:50–3:00] Close**

**Do:** Cut back to your face (or stay on screen with the dashboard visible).

**Say:**
> "Check — multiple verification methods, one API. The Stripe for LLM verification. We're launching beta now."

---

### Demo Tips
- **Stick to the strong 4: Reasoning, Tool, BiPRM, Ensemble.** These are fully real and give clean, confident results. Entropy is fine as a 5th but less visually impressive
- **DO NOT demo Semantic or Formal.** Semantic returns "uncertain" on everything. Formal is a stub (no real theorem provers). If YC partners test them, it'll look bad
- **Speed matters** — most methods take 2-7s. Talk through what's happening while it loads. Consider a quick cut/speed-up for the ensemble call (~6.5s)
- **Pick dramatic claims** — the ivermectin FDA claim and fake court case both tested well. Avoid vague claims that return "uncertain"
- **The fake court case is best for multi-paradigm** — tool-augmented returns "uncertain" (can't find it in search), while reasoning/BiPRM/ensemble catch it as false. This shows why combining methods matters
- **Show real results** — don't fake the output. YC partners will try your product themselves
- **Keep talking while things load** — fill dead air with context
- **Practice the flow 3-4 times** before recording — know where every click goes
- **Clean up your dashboard** — have some sample data so it looks active, not empty
- **Run `bash scripts/test-all-methods.sh` before recording** — confirms methods are working end-to-end

---

## Extended Demo Guide — Full Feature Showcase

> Use this for YC partner calls, live demos, beta customer walkthroughs, and investor meetings. Not time-limited — cover everything.

---

### 1. API Key Usage — All Integration Methods

#### cURL (Simplest)

```bash
# Single verification — use key defaults
curl -X POST https://api.check.ai/v1/verify \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"content": "The Eiffel Tower is 330 meters tall."}'

# With specific methods + weights
curl -X POST https://api.check.ai/v1/verify \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The FDA approved ivermectin for COVID-19 treatment in March 2022.",
    "methods": {"reasoning": 0.6, "tool": 0.4}
  }'

# Override model per request
curl -X POST https://api.check.ai/v1/verify \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Critical claim requiring specific model...",
    "methods": {
      "reasoning": {"weight": 0.7, "model": "openai/gpt-4o"},
      "tool": 0.3
    }
  }'

# Full multi-paradigm with custom thresholds
curl -X POST https://api.check.ai/v1/verify \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The Supreme Court ruled in Smith v. California (2023) that AI-generated content is protected under the First Amendment.",
    "methods": {
      "reasoning": 0.3,
      "tool": 0.3,
      "biprm": 0.2,
      "ensemble": 0.1,
      "entropy": 0.1
    },
    "options": {
      "acceptThreshold": 0.95,
      "timeout": 60000
    }
  }'
```

#### TypeScript SDK

```typescript
import { Check } from '@check/sdk';

// Initialize — one line
const client = new Check({ apiKey: 'vfy_your_api_key' });

// 1. Simple verification (uses key defaults)
const result = await client.verifyAndWait({
  content: 'The speed of light is approximately 299,792 km/s.',
  methods: { reasoning: 1.0 },
});
console.log(result.verdict);     // 'true'
console.log(result.confidence);  // 0.95
console.log(result.decision);    // 'accept'
console.log(result.reasoning);   // 'The stated speed of light matches...'

// 2. High accuracy (multiple methods)
const accurate = await client.verifyAndWait({
  content: 'Water freezes at 0°C at standard pressure.',
  methods: {
    reasoning: 1.0,
    tool: 1.0,
    ensemble: 0.5,
  },
});

// 3. Fire-and-forget (async)
const pending = await client.verify({
  content: 'Your claim here',
  methods: { reasoning: 1.0 },
});
console.log(pending.id);      // 'ver_abc123'
console.log(pending.status);  // 'pending'

// Check later
const later = await client.getVerification(pending.id);

// 4. Handle all decision types
switch (result.decision) {
  case 'accept':    // confidence >= 0.95 — auto-approve
    return result;
  case 'refine':    // 0.70-0.95 — add disclaimer
    return { ...result, disclaimer: 'Medium confidence.' };
  case 'escalate':  // < 0.70 + disagreement — human review
    await sendToReviewQueue(result);
    break;
  case 'reject':    // low confidence + agreement on false
    throw new Error('Verification failed');
}
```

#### Python SDK

```python
from check import Check

# Initialize
client = Check(api_key="vfy_your_api_key")

# Simple verification
result = client.verify_and_wait(
    content="Python was created by Guido van Rossum and first released in 1991.",
    methods={"reasoning": 1.0}
)
print(result.verdict)     # 'true'
print(result.confidence)  # 0.98
print(result.decision)    # 'accept'

# Async client
from check import AsyncCheck

async with AsyncCheck(api_key="vfy_...") as client:
    result = await client.verify_and_wait(
        content="Paris is the capital of France.",
        methods={"reasoning": 1.0, "tool": 0.5}
    )

# Error handling
from check.errors import (
    AuthenticationError, RateLimitError,
    QuotaExceededError, ValidationError,
)

try:
    result = client.verify_and_wait(content="Test", methods={"reasoning": 1.0})
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except QuotaExceededError:
    print("Monthly quota exceeded — upgrade plan")
```

#### LangChain Integration

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { Check } from '@check/sdk';
import { CheckCallbackHandler } from '@check/langchain';

// Automatic verification of all LLM outputs
const checkClient = new Check({ apiKey: 'vfy_...' });
const handler = new CheckCallbackHandler({
  client: checkClient,
  methods: { reasoning: 1.0, tool: 0.5 },
  raiseOnReject: true,  // Throw if content is rejected
});

const llm = new ChatOpenAI({ callbacks: [handler] });
const response = await llm.invoke('What is the capital of France?');
// Verification happens automatically — rejected content throws
```

```python
# Python LangChain
from langchain_openai import ChatOpenAI
from check import Check
from check_langchain import CheckCallbackHandler

check_client = Check(api_key="vfy_...")
handler = CheckCallbackHandler(
    check_client,
    methods={"reasoning": 1.0, "tool": 0.5},
    raise_on_reject=True,
)

llm = ChatOpenAI(callbacks=[handler])
response = llm.invoke("What is 2 + 2?")
# Automatically verified
```

---

### 2. Per-Key Configuration — The Differentiator

> **Core concept: One key = one behavior. Different use cases = different keys.**

Show the dashboard API Keys page with these three keys:

| Key Name | Methods | Models | Use Case |
|----------|---------|--------|----------|
| **Fast Screening** | reasoning (1.0) | groq/llama-3.3-70b | Chatbot, sub-second |
| **Production** | reasoning (0.6), tool (0.4) | claude-3.5-sonnet, gpt-4o-mini | General content |
| **High Accuracy** | reasoning (0.4), tool (0.3), ensemble (0.3) | claude + gpt-4o + gemini voting | Medical/legal/finance |

**Talking points:**
- "Your chatbot key uses Groq Llama for speed — under a second. Your medical AI key uses three models voting with web search. Same API call, different key, different behavior."
- "You don't change your code to increase accuracy — you change your key. Or override per-request when you need to."
- "Each key also has its own thresholds — your chatbot accepts at 0.90 confidence, your medical app requires 0.99."

**Show the Create API Key modal:**
- Name the key
- Select provider credential (BYOK)
- Toggle paradigms on/off with weight sliders
- Select model for each paradigm from dropdown
- Set accept/escalate thresholds

---

### 3. Batch Processing Demo

```bash
# Create a batch with multiple claims
curl -X POST https://api.check.ai/v1/batch \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"content": "The Earth is round."},
      {"content": "Water boils at 100°C."},
      {"content": "The sun is cold."},
      {"content": "Python was first released in 1991."},
      {"content": "React was first released in 2015."}
    ],
    "methods": {"reasoning": 1.0}
  }'
```

```typescript
// TypeScript SDK — batch with progress
const batch = await client.createBatchAndWait(
  {
    items: [
      { content: 'The Earth is round.' },
      { content: 'Water boils at 100°C.' },
      { content: 'The sun is cold.' },
    ],
    methods: { reasoning: 1.0 },
  },
  { onProgress: (b) => console.log(`Progress: ${b.progress}%`) }
);

const results = await client.getBatchResults(batch.id);
for (const item of results.items) {
  console.log(`"${item.content}" → ${item.verdict} (${item.confidence})`);
}
// "The Earth is round."         → true  (0.95)
// "Water boils at 100°C."       → true  (0.92)
// "The sun is cold."            → false (0.88)
```

**Talking points:**
- "Upload a CSV of 10,000 claims and we verify them all. Progress tracking, webhook notifications when done."
- "Content moderation teams can batch-verify a day's worth of AI-generated content in minutes."

---

### 4. Running the Test Suite — All 7 Methods Live

```bash
# Run all methods against the same false claim
bash scripts/test-all-methods.sh
```

**Expected output to walk through:**

```
============================================================
  Check.ai - All Methods Test
  Base URL: http://localhost:3001
  API Key:  vfy_chec_10RXE7Mn...
============================================================

========================================
  SEMANTIC
========================================
Verdict:    uncertain
Confidence: 50.0%
Time:       1200ms
Cost:       0.02c

========================================
  REASONING
========================================
Verdict:    false
Confidence: 100.0%
Time:       4100ms
Cost:       0.12c

========================================
  TOOL-AUGMENTED
========================================
Verdict:    false
Confidence: 90.0%
Time:       2300ms
Cost:       0.18c

========================================
  ENTROPY
========================================
Verdict:    false
Confidence: 85.0%
Time:       3500ms
Cost:       0.08c

========================================
  BiPRM
========================================
Verdict:    false
Confidence: 92.0%
Time:       3800ms
Cost:       0.14c

========================================
  ENSEMBLE
========================================
Verdict:    false
Confidence: 88.0%
Time:       6500ms
Cost:       0.35c

========================================
  FORMAL
========================================
Verdict:    uncertain
Confidence: 50.0%
Time:       1000ms
Cost:       0.05c

========================================
  MULTI-PARADIGM (5 methods weighted)
========================================
Verdict:    false
Confidence: 94.2%
Time:       8200ms
Cost:       0.52c

Per-paradigm breakdown:
  reasoning    -> false      (100.0%) in 4100ms
  tool         -> false      (90.0%) in 2300ms
  biprm        -> false      (92.0%) in 3800ms
  ensemble     -> false      (88.0%) in 6500ms
  entropy      -> false      (85.0%) in 3500ms
```

**Talking points per method:**
- **Semantic**: "Embedding similarity — fast but can't fact-check. Returns uncertain on factual claims. Good for detecting if content matches a reference."
- **Reasoning**: "LLM-as-judge with chain-of-thought. Our most reliable single method. ~2% false positive rate."
- **Tool-Augmented**: "Web search + LLM reasoning. Grounds verification in real-time sources. Great for current events."
- **Entropy**: "Asks the model the same question multiple times — if answers are consistent, higher confidence."
- **BiPRM**: "Bidirectional premise reasoning — checks if the claim logically follows AND if the negation doesn't."
- **Ensemble**: "Three different models vote independently. Diversity reduces blind spots."
- **Formal**: "Direct arithmetic evaluation (2+2=4) with mathematical certainty. Complex math uses LLM reasoning. Theorem provers planned."
- **Multi-paradigm**: "The real product — weighted consensus across methods. FPR-weighted voting means more reliable methods have more influence."

---

### 5. BYOK — Bring Your Own Key

**Show the Provider Credentials page with:**

| Provider | Key | Used By |
|----------|-----|---------|
| OpenRouter | sk-or-v1-**** | 3 API keys |
| OpenAI | sk-**** | 1 API key |
| Anthropic | sk-ant-**** | 1 API key |

**Supported providers (16+):**
OpenRouter, OpenAI, Anthropic, Google, Groq, Together, Mistral, Cohere, DeepSeek, xAI, Fireworks, Cerebras, Perplexity, Azure, AWS Bedrock

**Talking points:**
- "We never see your data in plaintext — API keys are AES-256-GCM encrypted at rest."
- "OpenRouter is the recommended provider — one key gets you access to every model. Or use direct provider keys for compliance requirements."
- "Enterprise customers can use Azure or Bedrock for data residency."

---

### 6. Real-Time SDK Test (test-api-key.ts)

```bash
npx tsx scripts/test-api-key.ts
```

```typescript
// What this script does:
const client = new Check({
  apiKey: 'vfy_chec_...',
  baseUrl: 'http://localhost:3001',
});

const result = await client.verifyAndWait({
  content: 'The Earth orbits the Sun at an average distance of about 93 million miles.',
  methods: { reasoning: 1.0 },
});

// Expected output:
// ✅ Verification successful!
// Result: {
//   "id": "ver_abc123",
//   "status": "completed",
//   "verdict": "true",
//   "confidence": 0.95,
//   "decision": "accept",
//   "reasoning": "The claim is accurate. The average Earth-Sun distance is about 93 million miles (1 AU)...",
//   "paradigmResults": [...]
// }
```

**Talking points:**
- "This is a real E2E test hitting our API. API key auth, verification engine, multi-model routing, consensus — all live."
- "Under 5 seconds for a single-method verification. Multi-paradigm takes 5-10s depending on method count."

---

### 7. RAG Pipeline Integration Pattern

```typescript
// The killer use case — verify LLM outputs before showing users
async function verifiedRAG(query: string, retrievedDocs: string[]) {
  const client = new Check({ apiKey: 'vfy_...' });

  // Step 1: Generate response with your LLM
  const response = await generateResponse(query, retrievedDocs);

  // Step 2: Verify before returning to user
  const verification = await client.verifyAndWait({
    content: response,
    methods: { reasoning: 1.0, tool: 1.0 },
    context: {
      query,
      sources: retrievedDocs.slice(0, 3),
    },
  });

  // Step 3: Route based on confidence
  switch (verification.decision) {
    case 'accept':
      return { response, verified: true };
    case 'refine':
      return { response, verified: true, confidence: 'medium' };
    case 'escalate':
      return { response, needsReview: true };
    case 'reject':
      return { response: null, error: 'Failed verification' };
  }
}
```

**Talking points:**
- "This is the pattern every RAG pipeline needs. Generate, verify, route. Three extra lines of code."
- "Accept means auto-approve. Escalate means send to a human. Reject means the AI was wrong — regenerate or block."

---

### 8. Response Format — What You Get Back

```json
{
  "id": "ver_abc123def456",
  "status": "completed",
  "content": "The FDA approved ivermectin for COVID-19 treatment in March 2022.",
  "verdict": "false",
  "confidence": 0.95,
  "decision": "reject",
  "reasoning": "The FDA has never approved ivermectin for COVID-19. The FDA issued warnings against its use for COVID-19 treatment. Ivermectin is FDA-approved only for certain parasitic conditions.",
  "paradigmResults": [
    {
      "paradigm": "reasoning",
      "weight": 0.6,
      "provider": "openrouter",
      "model": "anthropic/claude-3.5-sonnet",
      "verdict": "false",
      "confidence": 1.0,
      "reasoning": "The FDA has explicitly warned against using ivermectin for COVID-19...",
      "processingTimeMs": 4100,
      "costCents": 0.12
    },
    {
      "paradigm": "tool",
      "weight": 0.4,
      "provider": "openrouter",
      "model": "openai/gpt-4o",
      "verdict": "false",
      "confidence": 0.90,
      "reasoning": "Web search confirms: FDA issued multiple warnings against ivermectin for COVID-19...",
      "processingTimeMs": 2300,
      "costCents": 0.18
    }
  ],
  "processingTimeMs": 4738,
  "costCents": 0.30,
  "createdAt": "2026-02-06T10:30:00Z",
  "completedAt": "2026-02-06T10:30:05Z"
}
```

**Key details to highlight:**
- Per-paradigm breakdown — you see exactly which methods agreed/disagreed
- Cost tracking — per-verification and per-paradigm cost in cents
- Processing time — total and per-paradigm
- Full reasoning chain — not just a boolean, but *why*

---

## Pre-Recording Checklist

- [ ] Run `npx tsx scripts/seed-demo.ts` to populate demo account with sample data
- [ ] Run `bash scripts/test-all-methods.sh` to confirm all methods are working E2E
- [ ] Run `npx tsx scripts/test-api-key.ts` to confirm SDK + API key auth works
- [ ] Verify demo org has:
  - Sample verifications (5 pre-seeded: 2 true, 2 false, 1 uncertain/escalated)
  - API keys with per-key paradigm configs
  - Provider credential (OpenRouter)
  - Usage analytics data
- [ ] Create demo login credentials for YC (they ask for this on the app)
- [ ] Prepare test claims (tested and verified):
  - FALSE: "The FDA approved ivermectin for COVID-19 treatment in March 2022." (Reasoning: false 100%, Tool: false 90%)
  - TRUE: "The speed of light is approximately 299,792 kilometers per second." (use Reasoning, not Semantic)
  - MULTI-PARADIGM: "The Supreme Court ruled in Smith v. California (2023)..." (4-method weighted: Reasoning+Tool+BiPRM+Ensemble)
- [ ] **Double-check: NO semantic or formal in any demo claim configs** — they will underperform on camera
- [ ] Clean up browser (no embarrassing tabs/bookmarks)
- [ ] Good microphone — audio clarity is the #1 technical thing YC cares about
- [ ] Upload founder video to YouTube as **unlisted** (not private) with embedding enabled
- [ ] Have terminal open with cURL commands ready to paste
- [ ] Have `scripts/test-api-key.ts` ready to run for live SDK demo

---

## Quick Reference — Test Claims

| Claim | Expected Verdict | Best Methods | Notes |
|-------|-----------------|--------------|-------|
| "The FDA approved ivermectin for COVID-19 treatment in March 2022." | **false** (100%) | reasoning, tool | Clean false, fast, dramatic |
| "The speed of light is approximately 299,792 km/s." | **true** (95%) | reasoning | Clean true, fast |
| "Python was created by Guido van Rossum and first released in 1991." | **true** (98%) | reasoning, tool | Historical fact |
| "The Earth is approximately 4.54 billion years old." | **true** (97%) | reasoning, ensemble | Science fact |
| "React.js was first released in 2015." | **false** (86%) | reasoning, tool, biprm | Subtle — was 2013 |
| "HTTPS prevents all forms of MITM attacks." | **uncertain** (62%) | reasoning, biprm, ensemble | Escalation example |
| "The Supreme Court ruled in Smith v. California (2023)..." | **false** (94%) | reasoning, biprm, ensemble | Fabricated case — best for multi-paradigm |
| "12 * 12 = 144" | **true** (100%) | formal | Direct arithmetic |

---

## Sources
- [YC Official Video Guidelines](https://www.ycombinator.com/video)
- [YC Application Tips: Include a Demo](https://www.ycombinator.com/library/J8-yc-application-tips-include-a-demo)
- [Startup Grind: How to Film Your YC Application Video](https://www.startupgrind.com/blog/y-combinator-application-video-tutorial/)
- [Pilot: How to Prepare for Your YC Application Video](https://pilot.com/blog/how-prepare-yc-application-video)
