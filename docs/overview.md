# Check.ai Platform Overview

## What is Check.ai?

Check.ai is a production-grade SaaS platform for verifying the truthfulness and accuracy of Large Language Model (LLM) outputs. It's designed as "The Stripe for LLM Verification" - a developer-first infrastructure that helps organizations detect AI hallucinations, false claims, and inaccuracies at scale.

## The Problem We Solve

LLMs are powerful but unreliable narrators. They can:

- **Hallucinate** - Generate plausible-sounding but completely fabricated information
- **Confabulate** - Mix real facts with invented details
- **Outdated Knowledge** - Provide information that was true at training time but is now incorrect
- **Confidently Wrong** - Present false information with high certainty

These issues are especially critical in high-stakes domains like healthcare, finance, legal, and enterprise applications where accuracy is paramount.

## How Check.ai Works

### Multi-Paradigm Verification

Instead of relying on a single verification method, Check.ai employs seven distinct paradigms that work together:

| Paradigm | Description | FPR | Best For |
|----------|-------------|-----|----------|
| **Semantic** | Boltzmann energy embedding analysis | ~20-30% | Quick sanity checks |
| **Reasoning** | Adaptive self-refinement verification | ~4-5% | General verification |
| **Tool** | CLoVE contrastive web verification | ~1% | Factual claims |
| **BIPRM** | Parallel bidirectional step-level scoring | ~5-7% | Logical arguments |
| **Ensemble** | Meta-judge adjudicated consensus | ~15-20% | Diverse perspectives |
| **Entropy** | Dual-path semantic entropy | ~8-10% | Confidence assessment |
| **Formal** | Autoformalized mathematical verification* | 0%* | Mathematical claims |

*\*Note: Formal verification uses mathjs autoformalization to symbolically evaluate arithmetic, algebraic, comparison, statistical, and unit conversion claims with 0% FPR (mathematical certainty). Claims outside these categories use LLM-based reasoning (~5-7% FPR). Full theorem prover integration (Lean, Coq, Z3) is planned.*

### Weighted Consensus

Each paradigm produces:
- A **verdict**: `true`, `false`, or `uncertain`
- A **confidence score**: 0.0 to 1.0
- **Reasoning**: Explanation of the decision

These results are combined using False Positive Rate (FPR) weighted voting, where paradigms with lower FPR (higher reliability) have more influence on the final verdict.

### Decision Framework

Based on the consensus, Check.ai provides an actionable **decision**:

- **Accept** (confidence >= 0.95): High confidence, auto-approve
- **Refine** (confidence >= 0.70): Medium confidence, may need adjustment
- **Escalate** (confidence < 0.70 + disagreement): Human review required
- **Reject** (low confidence + agreement on false): Likely inaccurate

## Architecture

```
                                   ┌─────────────────┐
                                   │   Check.ai API  │
                                   └────────┬────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │   Verify API  │       │   Batch API   │       │ Dashboard API │
            └───────┬───────┘       └───────┬───────┘       └───────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Verification Engine  │
                    │  (7 Paradigms)        │
                    └───────────┬───────────┘
                                │
                ┌─────────────────┴─────────────────┐
                │                                   │
          ┌─────▼─────┐                       ┌─────▼─────┐
          │  LLM Hub  │                       │  Tool Hub │
          │ (16+ LLMs)│                       │  (Search) │
          └───────────┘                       └───────────┘
```

## Key Features

### For Developers

- **SDKs**: TypeScript, Python, LangChain, LlamaIndex integrations
- **REST API**: Simple HTTP endpoints with comprehensive error handling
- **Streaming**: Real-time updates via WebSockets (Supabase Realtime)
- **Webhooks**: Event notifications with automatic retry logic
- **Batch Processing**: CSV/JSON upload for bulk verification

### For Operations

- **Multi-Tenant**: Organization-based isolation with team management
- **RBAC**: Role-based access control (Owner, Admin, Member, Viewer)
- **Audit Logs**: Immutable activity trail for compliance
- **Usage Analytics**: Track verifications, costs, and patterns
- **Data Retention**: Configurable retention policies

### For Cost Control

- **BYOK**: Bring Your Own Key for LLM providers
- **16+ Providers**: Choose based on cost/quality tradeoffs
- **Per-Key Configuration**: Different settings for different use cases
- **Usage Tracking**: Detailed cost breakdown per verification

## Integration Options

### Direct API

```typescript
const response = await fetch('https://api.check.ai/v1/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer vfy_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'The capital of France is Paris.',
    methods: { reasoning: 1.0, tool: 0.5 }
  })
});
```

### TypeScript SDK

```typescript
import { Check } from '@check/sdk';

const client = new Check({ apiKey: 'vfy_...' });
const result = await client.verifyAndWait({
  content: 'Your claim here',
  methods: { reasoning: 1.0 }
});
```

### Python SDK

```python
from check import Check

client = Check(api_key="vfy_...")
result = client.verify_and_wait(
    content="Your claim here",
    methods={"reasoning": 1.0}
)
```

### LangChain Integration

```typescript
import { CheckCallback } from '@check/langchain';

const callback = new CheckCallback({
  apiKey: 'vfy_...',
  methods: { reasoning: 1.0 }
});

// Automatically verifies LLM outputs
const chain = new ConversationalChain({
  callbacks: [callback]
});
```

## Use Cases

### RAG Pipelines

Verify retrieved context before using it in generation to prevent hallucinations from propagating.

### Chatbots & Assistants

Real-time verification of responses before delivering to users, with automatic escalation for uncertain answers.

### Content Generation

Batch verification of marketing copy, documentation, and other generated content.

### Research & Analysis

Verify claims in reports, summaries, and synthesized information.

### Compliance

Audit trail of all verification decisions for regulatory requirements.

## Security & Compliance

- **API Key Encryption**: AES-256-GCM encryption for stored credentials
- **Rate Limiting**: Redis-based rate limiting with plan-specific limits
- **Data Isolation**: Organization-level data segregation
- **Audit Logging**: Immutable logs of all API operations
- **SOC 2 Ready**: Architecture designed for compliance

## Getting Started

1. **Sign up** at [check.ai](https://check.ai)
2. **Create an API key** in the dashboard
3. **Install an SDK** or use the REST API
4. **Start verifying** your LLM outputs

See the [SDK Guide](./sdk-guide.md) for detailed setup instructions.

## Support

- **Documentation**: Full API reference and guides
- **Dashboard**: Interactive verification playground
- **Support**: support@check.ai
