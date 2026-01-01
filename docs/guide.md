# VerifyAI: Complete Product & Methodology Guide

**The Stripe for LLM Verification**

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [How It Works](#2-how-it-works)
3. [Pricing Model (BYOK)](#3-pricing-model-byok)
4. [Research Foundation](#4-research-foundation)
5. [Benchmark Methodology](#5-benchmark-methodology)
6. [What We Need to Build](#6-what-we-need-to-build)
7. [Go-to-Market Phases](#7-go-to-market-phases)

---

## 1. Product Vision

### The Problem: $2.4M per Incident

Every company deploying AI faces the same nightmare: **hallucinations cost millions.**

- **Air Canada (Feb 2024):** Chatbot invented refund policy → $812 settlement + legal precedent
- **Average cost per major hallucination:** $2.4 million (malpractice, SEC violations, attorney sanctions)
- **78% of enterprises now use AI in production** → Moving from experiments to customer-facing systems
- **Court ruling:** Companies are legally liable for what their AI says

**The market reality:** Even GPT-5 has 8% error rate. 0% is mathematically impossible.

**Result: Every company deploying AI needs verification. Not optional.**

### Why Current Solutions Fail

All existing solutions force **one verification method**:

| Solution          | Method                | Funding        | What They Miss                |
| ----------------- | --------------------- | -------------- | ----------------------------- |
| **Guardrails AI** | Rule-based validators | $7.5M seed     | Can't verify factual accuracy |
| **Cleanlab**      | Single trust score    | $25M Series A  | Can't customize per use case  |
| **Harmonic**      | Math proofs only      | $295M @ $1.45B | Only works for mathematics    |

**The gap:** Different use cases need different approaches.

- Blog posts need speed (100ms)
- Medical diagnosis needs accuracy (<1% error rate)
- Legal review needs citations verified

**No platform lets you choose, mix, or customize verification methods.**

### Our Solution: Multi-Method Platform with Custom Weighting

**Like Stripe for payments - one API, multiple methods, user choice:**

```
POST /v1/verify
{
  "content": "Patient should take 500mg aspirin daily",
  "methods": {
    "reasoning": 0.5,    // Logical consistency
    "tool": 0.3,         // Verify against medical databases
    "biprm": 0.2         // Bidirectional reasoning check
  }
}
```

**Users define their own verification strategy:**

- **Medical AI:** 60% BiPRM + 30% Tool + 10% Semantic → Optimized for accuracy + fact-checking
- **Legal AI:** 50% Ensemble + 50% Tool → Maximum accuracy + citation verification
- **Blog Writing:** 100% Semantic → Speed over accuracy
- **Crypto:** 100% Formal → Mathematical certainty

**This flexibility doesn't exist anywhere else.**

### Market Opportunity

- **TAM:** $5.3-7.9 billion by 2030 (Gartner: Guardian Agents 10-15% of $52.6B agentic AI market)
- **Growth:** 46% per year
- **Enterprise AI spending:** $11.5B (2024) → $37B (2025) = 3.2x growth in one year

**Verification shifting from "nice to have" to "legal requirement"**

### Competitive Differentiation

| Feature          | Guardrails | Cleanlab | Harmonic      | **VerifyAI** |
| ---------------- | ---------- | -------- | ------------- | ------------ |
| Multiple methods | ✗          | ✗        | ✗             | **✓ (7+)**   |
| Custom weighting | ✗          | ✗        | ✗             | **✓**        |
| All domains      | ✗          | ✗        | ✗ (math only) | **✓**        |

---

## 2. How It Works

### The 7 Verification Methods

| Method                  | What It Does                 | Best For                | Speed    | FPR     |
| ----------------------- | ---------------------------- | ----------------------- | -------- | ------- |
| **Semantic Similarity** | Compares embeddings          | Quick filtering         | 100ms    | 50-100% |
| **Reasoning-Based**     | LLM analyzes logic           | General verification    | 2-3s     | 7%      |
| **Tool-Augmented**      | Web search + code execution  | Factual claims          | 1-2s     | ~2%     |
| **BiPRM**               | Forward + backward reasoning | Medical, legal          | 3-5s     | ~10%    |
| **Ensemble**            | Multiple models vote         | High-stakes             | 5-10s    | 20-40%  |
| **Semantic Entropy**    | Consistency checking         | Hallucination detection | 200ms    | TBD     |
| **Formal Verification** | Mathematical proofs          | Crypto, code            | Variable | 0%      |

### Basic Code Patterns for Each Method

**Semantic (Embedding Comparison):**

```python
# Compare content embedding to reference
embedding = get_embedding(content)
similarity = cosine_similarity(embedding, reference_embedding)
verdict = "true" if similarity > 0.8 else "false"
```

**Reasoning (LLM Judge):**

```python
# Ask LLM to evaluate with chain-of-thought
prompt = f"Analyze if this is accurate: {content}\nThink step by step."
response = llm.complete(prompt)
# Parse: VERDICT: [TRUE/FALSE], CONFIDENCE: [0-1]
```

**Tool-Augmented (Web Search + Code):**

```python
# Search for facts, compare to claim
facts = search_api.search(extract_query(content))
match_score = compare_claim_to_facts(content, facts)
verdict = "true" if match_score > 0.8 else "false"
```

**BiPRM (Bidirectional Reasoning):**

```python
# Forward: Does each step follow from previous?
forward_score = evaluate_forward_reasoning(steps)
# Backward: Does conclusion support premises?
backward_score = evaluate_backward_reasoning(steps)
confidence = (forward_score + backward_score) / 2
```

**Ensemble (Multi-Model Voting):**

```python
# Get verdicts from multiple models
verdicts = [model.verify(content) for model in [gpt4, claude, deepseek]]
# Majority vote with confidence weighting
final_verdict = weighted_majority(verdicts)
```

### Custom Weighting Examples

| Use Case                   | Configuration                       | Why                                   |
| -------------------------- | ----------------------------------- | ------------------------------------- |
| **Medical AI**             | 60% BiPRM + 30% Tool + 10% Semantic | Catch reasoning errors + verify facts |
| **Legal AI**               | 50% Ensemble + 50% Tool             | Maximum accuracy + search case law    |
| **Customer Support**       | 80% Reasoning + 20% Semantic        | Balanced speed and accuracy           |
| **Crypto/Smart Contracts** | 100% Formal                         | Mathematical certainty required       |
| **Blog Writing**           | 100% Semantic                       | Speed matters more than accuracy      |

### Decision Flow

1. **User sends content + weights**
2. **All selected paradigms run in parallel**
3. **Results combined using FPR-weighted consensus**
4. **Decision returned:**
   - **ACCEPT** (confidence ≥ 95%): Auto-approved
   - **REFINE** (70% ≤ confidence < 95%): Auto-refinement
   - **ESCALATE** (confidence < 70% + high disagreement): Human review
   - **REJECT** (confidence < 70% + low disagreement): Failed verification

### Consensus Scoring Formula

```python
# Weight = 1 - FPR (lower FPR = higher weight)
weights = {
    "formal": 1.0,      # 0% FPR
    "tool": 0.98,       # 2% FPR
    "reasoning": 0.93,  # 7% FPR
    "biprm": 0.90,      # 10% FPR
    "ensemble": 0.70,   # 30% FPR
    "semantic": 0.30    # 70% FPR
}

# Consensus formula
final_confidence = sum(weight * conf * verdict for weight, conf, verdict in results) / sum(weights)
```

### Key Properties

- **Parallel Execution:** All paradigms run concurrently (fast)
- **Fail-Safe:** If one paradigm fails, others continue (robust)
- **Transparent:** Users see which paradigms agreed/disagreed (debuggable)
- **Extensible:** Add new methods without breaking existing API (forward-compatible)

---

## 3. Pricing Model (BYOK)

### Why BYOK (Bring Your Own Key)

Users provide their own LLM API keys (OpenAI, Anthropic, etc.). We charge for the verification platform, not the underlying compute.

**Benefits:**

- **Aligns with "Stripe for Verification" positioning** - charge for orchestration, not token resale
- **Protects margins** - Verification is compute-intensive (2-5 LLM calls per verification)
- **Maintains 70-80% gross margins** - vs 50-60% with token resale model
- **Enterprise customers already have keys** - OpenAI/Anthropic accounts with volume pricing
- **Cost transparency builds trust** - No hidden markups

### Pricing Tiers

| Tier           | Price      | What's Included                                      |
| -------------- | ---------- | ---------------------------------------------------- |
| **Free**       | $0         | 100 verifications/mo, Semantic method only           |
| **Pro**        | $99-299/mo | Unlimited verifications, all methods, custom weights |
| **Enterprise** | $2K-10K/mo | Dedicated support, SLAs, custom methods, white-label |

All tiers require BYOK.

### Future: Optional Managed Tier

Once we have product-market fit, may add managed tier for SMB/indie developers:

- Powered by OpenRouter backend (~5% fee)
- Usage-based: ~$0.05-0.10 per verification
- Positioned as convenience option, not default

### Unit Economics

- **Build in-house:** $500K-1M/year
- **Our platform:** <$50K/year
- **ROI:** Avoid one $2.4M hallucination incident

---

## 4. Research Foundation

### The Semantic Illusion Problem (Critical Finding)

**Paper:** arxiv:2512.15068 (Late 2025)

**Key Finding:** Embedding-based hallucination detection achieves **0% FPR on synthetic hallucinations** but **50-100% FPR on RLHF-trained model outputs.**

This is the critical finding that invalidates semantic similarity-based verification approaches.

**Why this happens:**

- RLHF training creates "semantic illusions"
- Models learn to generate semantically coherent hallucinations
- Hallucinations are fluent, plausible, and contextually appropriate
- Embedding similarity can't distinguish plausible-but-false from true
- The better the RLHF training, the worse semantic detection performs

**Solution requirements:**

- Must use non-semantic verification methods
- Need paradigm diversity (different failure modes)
- Reasoning-based detection resistant to semantic illusions

### FPR Baselines by Method (Research-Backed)

| Method             | False Positive Rate | Source                | Status       |
| ------------------ | ------------------- | --------------------- | ------------ |
| Semantic           | 50-100%             | arxiv:2512.15068      | **MEASURED** |
| Reasoning          | 7% (CI: 3.4-13.7%)  | arxiv:2512.15068      | **MEASURED** |
| Tool               | ~2%                 | FacTool F1 of 98.97%  | _Estimated_  |
| BiPRM              | ~10-15%             | Conservative estimate | _Estimated_  |
| Ensemble           | 20-40%              | arxiv:2411.06535      | **MEASURED** |
| BiPRM improvement  | 31.9%               | arxiv:2508.01682      | **MEASURED** |
| Ensemble precision | 95.6%               | arxiv:2411.06535      | **MEASURED** |

### Key Research Papers

#### 1. Semantic Illusion (arxiv:2512.15068)

- **Finding:** Embeddings fail on RLHF outputs (50-100% FPR)
- **Relevance:** Validates multi-paradigm approach
- **Our semantic paradigm:** Intentionally demonstrates this problem (70% FPR baseline)

#### 2. OpenAI PRM (ICLR 2024) - "Let's Verify Step by Step"

- **Finding:** Process supervision significantly outperforms outcome-only verification
- **Performance:** 78.2% on MATH dataset
- **Relevance:** Foundation for BiPRM paradigm

#### 3. FacTool (arxiv:2307.13528)

- **Finding:** Tool-grounded verification achieves 98.97% F1
- **Method:** Web search + code execution for claim verification
- **Relevance:** Foundation for tool-augmented paradigm

#### 4. BiPRM Research (arxiv:2508.01682)

- **Finding:** Bidirectional verification is 31.9% more accurate than unidirectional
- **Method:** Forward + backward reasoning chain verification
- **Relevance:** Our novel research contribution - first application to non-math domains

#### 5. Ensemble Methods (arxiv:2411.06535)

- **Finding:** 3 diverse models raise precision from 73% to 95.6%
- **Key insight:** Cohen's kappa >0.76 threshold for reliable consensus
- **Relevance:** Foundation for ensemble paradigm

#### 6. ThinkPRM (April 2025)

- **Finding:** Generative verification using CoT achieves SOTA with only 1% of standard PRM labels
- **Data efficiency:** 8K labels vs 800K for PRM800K
- **Relevance:** Validates reasoning-based verification approach

#### 7. CRITIC (ICLR 2024)

- **Finding:** Iterative verify-then-correct improves accuracy significantly
- **Method:** Verification feedback enables targeted correction
- **Relevance:** Foundation for refinement loop

### Future Paradigms (Not Yet Implemented)

**Formal Verification (FPR: 0%):**

- DeepSeek-Prover-V2: 88.9% on miniF2F
- AlphaProof: 4/6 IMO 2024 problems (silver medal)
- Harmonic Aristotle: 5/6 IMO 2025 problems (gold medal)

**Mechanistic Interpretability (FPR: ~5%):**

- Linear Representation Hypothesis: ~95% separability of truthfulness
- Requires white-box model access

**Conformal Prediction (Coverage: 80-90%):**

- Mohri & Hashimoto (ICML 2024): Coverage guarantees
- Critical: Must use reasoning-based nonconformity (not semantic)

### Novel Research Contributions

**Gap 1: BiPRM for Non-Mathematical Domains**

- First BiPRM application to legal/medical reasoning
- 31.9% improvement over unidirectional
- Publication target: ACL 2026 or NAACL 2026

**Gap 2: Paradigm Diversity Theory**

- Theoretical framework for paradigm ensembles (vs model ensembles)
- Characterize failure mode independence
- Publication target: ICML 2026 or ICLR 2026

---

## 5. Benchmark Methodology

### Three-Tier Testing Strategy

**Tier 1: Curated Datasets (60 samples)**

- `synthetic_hallucinations.json`: 20 obvious errors
- `rlhf_hallucinations.json`: 20 plausible but false
- `true_statements.json`: 20 verified facts
- Purpose: Direct validation of research claims
- Target: Expand to 500+ samples for statistical significance

**Tier 2: HaluEval (35K samples)**

- Industry standard for hallucination detection
- 10K QA + 10K Dialogue + 10K Summarization + 5K General
- GPT-4 baseline: 78% accuracy
- Our target: >85% overall

**Tier 3: TruthfulQA (817 questions)**

- Adversarial questions designed to expose false beliefs
- Tests RLHF hallucination vulnerability
- MC1 and MC2 metrics

**Optional: FEVER (185K claims)**

- Wikipedia-based fact verification
- Scale testing

### Success Criteria

```python
# Validate research claims
assert semantic_fpr >= 0.50  # Semantic FPR should be ≥50%
assert reasoning_fpr <= 0.10  # Reasoning FPR should be ≤10%
assert gap >= 0.40            # FPR gap should be ≥40%

# Check paradigm independence
assert max_correlation < 0.30  # Paradigms should have independent failure modes
```

### Metrics Tracked

- **Accuracy:** (TP + TN) / total
- **Precision:** TP / (TP + FP)
- **Recall:** TP / (TP + FN)
- **F1 Score:** Harmonic mean of precision and recall
- **FPR:** FP / (FP + TN) - **key metric**
- **Latency:** P50, P95 in milliseconds
- **Cost:** USD per verification

### Performance Targets

| Approach           | Target Accuracy | Target FPR | Target Latency |
| ------------------ | --------------- | ---------- | -------------- |
| Semantic           | ~50%            | 50-100%    | <100ms         |
| Reasoning          | >90%            | <10%       | <3s            |
| Tool               | >95%            | <5%        | <2s            |
| BiPRM              | >85%            | <15%       | <5s            |
| Ensemble           | >90%            | <30%       | <10s           |
| **Multi-paradigm** | **>95%**        | **<5%**    | **<3s**        |

---

## 6. What We Need to Build

### Platform Components

1. **REST API** - Single endpoint with custom weighting

   - `POST /v1/verify` with content + method weights
   - Returns verdict, confidence, reasoning

2. **Playground** - Interactive UI for testing

   - Adjust weights with sliders
   - See real-time results
   - Share configurations

3. **SDKs** - Python, TypeScript clients

   - Simple 3-line integration
   - Auto-retry, error handling

4. **Integrations** - LangChain, LlamaIndex plugins

   - Drop-in verification for existing apps

5. **Dashboard** - Usage, billing, escalation management
   - Verification history
   - Human review queue
   - Billing/usage metrics

### Supabase Tables

```sql
-- Core verification requests/results
verifications (
  id, user_id, content, context,
  final_verdict, final_confidence, final_decision,
  paradigms_used, latency_ms, cost_usd,
  created_at
)

-- Individual paradigm outputs
paradigm_results (
  id, verification_id, paradigm,
  verdict, confidence, reasoning,
  latency_ms, cost_usd
)

-- Human review queue
escalations (
  id, verification_id, user_id, status,
  priority, deadline,
  human_decision, human_reasoning,
  resolved_at
)

-- Stripe billing state
user_subscriptions (
  id, user_id, stripe_customer_id,
  plan_type, verifications_used, verifications_limit,
  billing_cycle_start, billing_cycle_end
)
```

### Stripe Products

| Tier           | Product Type | Limits    | Price      |
| -------------- | ------------ | --------- | ---------- |
| **Free**       | Metered      | 100/month | $0         |
| **Pro**        | Subscription | Unlimited | $99-299/mo |
| **Enterprise** | Custom       | Custom    | $2K-10K/mo |

### Key API Design

```typescript
// POST /api/verify
interface VerifyRequest {
  content: string;
  context?: string;
  methods: {
    semantic?: number; // 0-1 weight
    reasoning?: number;
    tool?: number;
    biprm?: number;
    ensemble?: number;
  };
}

interface VerifyResponse {
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number; // 0-1
  decision: 'accept' | 'refine' | 'escalate' | 'reject';
  reasoning: string;
  paradigm_results: {
    [paradigm: string]: {
      verdict: string;
      confidence: number;
      reasoning: string;
    };
  };
  latency_ms: number;
  cost_usd: number;
}
```

---

## 7. Go-to-Market Phases

### Phase 1: Design Partners (Months 1-3)

**Target:** High-pain verticals

- Healthcare AI (Hippocratic AI, Glass Health)
- Legal AI (Harvey AI, Casetext)
- Financial AI (Bloomberg GPT users)

**Goal:** 5 design partners, 3 LOIs

**Activities:**

- Direct outreach to AI safety leads
- Focus on liability/compliance pain
- Offer free pilot + custom configuration

### Phase 2: Product Launch (Months 4-6)

**Deliverables:**

- Public API + interactive playground
- Python SDK
- LangChain/LlamaIndex integrations
- Developer self-serve signup

**Goal:** 100 developers using free tier

### Phase 3: Enterprise (Months 6-12)

**Target:**

- Fortune 500 AI teams
- White-label deployments
- Custom method training

**Goal:** 10 paying customers, $50K ARR

---

## Funding & Exit

### The Ask

**Pre-seed round:** $500K-1M

**Use of funds:**

- 50% Engineering (founding engineer hire)
- 30% Customer acquisition (design partners → customers)
- 20% Infrastructure (API hosting, LLM costs)

### Milestones (12-18 months)

- 10 paying customers
- $50K ARR
- Series A ready

### Exit Paths ($50M-1B range)

1. **LLM providers** (OpenAI, Anthropic) - $50-200M
2. **Observability platforms** (Datadog, New Relic) - $100-500M
3. **AI infrastructure** (Scale AI, Weights & Biases) - $200M-1B
4. **Independent growth** to IPO - $500M-1B+

**Precedent:** Harmonic (math only) at $1.45B valuation - we have broader platform

---

## Quick Reference

### Performance by Method (Research-Backed)

| Method              | Best Accuracy       | Latency   | FPR        | Coverage        |
| ------------------- | ------------------- | --------- | ---------- | --------------- |
| Semantic similarity | 88% (AlignScore)    | <100ms    | 50-100%    | All text        |
| Reasoning-based     | 93% (GPT-4 Judge)   | 2-3s      | 7%         | All text        |
| Tool-augmented      | 98.97% F1 (FacTool) | 1-2s      | ~0%        | Verifiable only |
| Ensemble (3 models) | 95.6% precision     | 3x single | 20-40%     | All text        |
| Process supervision | 78.2% (OpenAI PRM)  | Per-step  | 3.4% trace | Math reasoning  |

### Cost by Method

| Method                | Cost per Verification |
| --------------------- | --------------------- |
| Semantic similarity   | $0.001-0.01           |
| Reasoning-based       | $0.10-0.30            |
| Tool-augmented        | $0.05-0.15            |
| Ensemble              | $0.20-0.40            |
| **Our system target** | **<$1.00**            |

### Reading List (Priority Order)

1. **arxiv:2512.15068** - Semantic Illusion Problem (essential)
2. **Naik (2024)** - Ensemble Methods, Cohen's kappa
3. **OpenAI PRM (ICLR 2024)** - Process Supervision
4. **FacTool (2023)** - Tool-Augmented Verification
5. **ThinkPRM (April 2025)** - Generative Verification
6. **CRITIC (ICLR 2024)** - Iterative Refinement

---

_Last Updated: December 27, 2025_
