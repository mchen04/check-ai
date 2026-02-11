# Check

**The Stripe for LLM Verification**

Check is an AI-powered verification API that detects hallucinations, verifies claims, and ensures accuracy of LLM-generated content at scale. A developer-first platform with SDKs, webhooks, batch processing, and a multi-paradigm verification engine.

## Features

- **7 Verification Paradigms** — from fast semantic checks to formal mathematical proofs
- **7 LLM Providers** — OpenAI, Anthropic, Google, Mistral, Azure, Bedrock, OpenRouter
- **Bring Your Own Key (BYOK)** — use your own API keys for cost control and compliance
- **Batch Processing** — CSV/JSON upload for bulk verification with progress tracking
- **SDKs** — TypeScript (`@check/sdk`) and Python (`check`) with LangChain/LlamaIndex integrations
- **Webhooks** — real-time notifications for verification completion and escalation events
- **RBAC** — team management with Owner, Admin, Member, and Viewer roles

## Verification Methods

Each method has a different False Positive Rate (FPR) — the probability of incorrectly verifying a false claim as true. Lower is better.

| Method | FPR | Weight | Description |
|--------|-----|--------|-------------|
| **Formal** | 0% | 1.00 | mathjs autoformalization for arithmetic, algebraic, comparison, statistical, and unit conversion claims |
| **Tool** | ~1% | 0.99 | CLoVE contrastive web verification with per-source independence |
| **Reasoning** | ~4-5% | 0.95 | Adaptive self-refinement with conditional self-critique (TTT) |
| **BiPRM** | ~5-7% | 0.93 | Parallel bidirectional (L2R/R2L) step-level scoring |
| **Entropy** | ~8-10% | 0.90 | Dual-path: logprobs fast path + behavioral semantic clustering |
| **Ensemble** | ~15-20% | 0.80 | Meta-judge adjudicated multi-model consensus |
| **Semantic** | ~20-30% | 0.70 | Boltzmann energy embedding analysis with batch cached references |

Results are aggregated using FPR-weighted voting to produce a final verdict and confidence score.

## Decision Framework

| Confidence | Decision | Condition |
|---|---|---|
| >= 0.95 | **Accept** | High confidence |
| 0.70 - 0.95 | **Refine** | Moderate confidence |
| < 0.70 | **Escalate** | Low confidence + paradigm disagreement |
| < 0.70 | **Reject** | Low confidence + paradigm agreement |

## Quick Start

### TypeScript

```bash
npm install @check/sdk
```

```typescript
import { Check } from '@check/sdk';

const client = new Check({ apiKey: 'vfy_your_api_key' });

const result = await client.verifyAndWait({
  content: 'The Eiffel Tower was built in 1889.',
  methods: { reasoning: 1.0, tool: 0.5 }
});

console.log(result.verdict);    // 'true'
console.log(result.confidence); // 0.95
console.log(result.decision);   // 'accept'
```

### Python

```bash
pip install check
```

```python
from check import Check

client = Check(api_key="vfy_your_api_key")

result = client.verify_and_wait(
    content="The Eiffel Tower was built in 1889.",
    methods={"reasoning": 1.0, "tool": 0.5}
)

print(result.verdict)     # 'true'
print(result.confidence)  # 0.95
print(result.decision)    # 'accept'
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Auth**: Supabase Auth with RBAC
- **Queue**: Inngest for async verification jobs
- **LLM Providers**: OpenAI, Anthropic, Google, Mistral, Azure, Bedrock, OpenRouter
- **Verification**: 7-paradigm engine with FPR-weighted consensus

## Documentation

- [Introduction](content/docs/introduction.mdx)
- [Quickstart](content/docs/quickstart.mdx)
- [Verification Methods](content/docs/paradigms.mdx)
- [API Reference](content/docs/api-reference/verify.mdx)
- [Platform Overview](docs/overview.md)

## SDKs

| Package | Description |
|---------|-------------|
| [`@check/sdk`](packages/typescript-sdk) | TypeScript/Node.js SDK |
| [`check`](packages/python-sdk) | Python SDK |
| `@check/langchain` | LangChain TypeScript integration |
| `check-langchain` | LangChain Python integration |
| `@check/llamaindex` | LlamaIndex integration |

## Development

```bash
npm install
npm run dev     # Start development server
npm test        # Run tests
```

## License

MIT
