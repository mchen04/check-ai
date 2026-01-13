# Check - The Stripe for LLM Verification

<p align="center">
  <strong>Detect hallucinations, verify claims, and ensure accuracy of AI-generated content at scale.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#verification-methods">Verification Methods</a> •
  <a href="#sdks">SDKs</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Overview

Check is a production-grade SaaS platform for verifying the truthfulness and accuracy of Large Language Model (LLM) outputs. It's a developer-first solution that helps organizations detect hallucinations, false claims, and AI-generated inaccuracies through multiple verification paradigms.

## Features

### Multi-Paradigm Verification

Seven distinct verification methods work together to determine truth:

| Method | FPR | Description |
|--------|-----|-------------|
| **Semantic** | 50-100% | Embedding similarity checking |
| **Reasoning** | ~7% | LLM judge evaluating statements |
| **Tool** | ~2% | Web search-augmented verification |
| **BIPRM** | ~10% | Bidirectional reasoning from multiple angles |
| **Ensemble** | ~30% | Multi-model voting consensus |
| **Entropy** | ~15% | Consistency checking across variations |
| **Formal** | 0% | Mathematical/logical proof verification |

### Enterprise-Grade

- **RBAC** - Role-based access control (Owner, Admin, Member, Viewer)
- **Audit Logs** - Immutable activity trail for compliance
- **Webhooks** - Real-time event notifications with retry logic
- **Team Management** - Invite members, assign roles, manage permissions

### Developer-Friendly

- **SDKs** - TypeScript, Python, LangChain, LlamaIndex
- **Streaming APIs** - Real-time verification results
- **Batch Processing** - CSV/JSON upload for bulk verification
- **Comprehensive Docs** - API reference, guides, and examples

### Flexible & Cost-Effective

- **BYOK** - Bring Your Own Key for LLM providers
- **16+ Providers** - OpenAI, Anthropic, Google, DeepSeek, Groq, and more
- **Usage Tracking** - Detailed cost breakdown per verification

## Quick Start

### Installation

```bash
# TypeScript/Node.js
npm install @check/sdk

# Python
pip install check
```

### Basic Usage

```typescript
import { Check } from '@check/sdk';

const client = new Check({ apiKey: 'vfy_...' });

const result = await client.verifyAndWait({
  content: 'The speed of light is approximately 299,792 km/s.',
  methods: { reasoning: 1.0, tool: 0.5 }
});

console.log(result.verdict);     // 'true'
console.log(result.confidence);  // 0.95
console.log(result.decision);    // 'accept'
```

```python
from check import Check

client = Check(api_key="vfy_...")

result = client.verify_and_wait(
    content="The speed of light is approximately 299,792 km/s.",
    methods={"reasoning": 1.0, "tool": 0.5}
)

print(result.verdict)     # 'true'
print(result.confidence)  # 0.95
print(result.decision)    # 'accept'
```

### REST API

```bash
curl -X POST https://api.check.ai/v1/verify \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The speed of light is approximately 299,792 km/s.",
    "methods": { "reasoning": 1.0, "tool": 0.5 }
  }'
```

## Verification Methods

Choose methods based on your accuracy/speed requirements:

### Fast Verification (Chatbots, Real-time)

```typescript
const result = await client.verifyAndWait({
  content: 'Your claim here',
  methods: { reasoning: 1.0 }
});
```

### High-Accuracy Verification (Important Content)

```typescript
const result = await client.verifyAndWait({
  content: 'Your claim here',
  methods: {
    reasoning: 1.0,
    tool: 1.0,
    ensemble: 0.5
  }
});
```

### Mathematical Claims

```typescript
const result = await client.verifyAndWait({
  content: '2 + 2 = 4',
  methods: { formal: 1.0 }
});
```

## SDKs

| Package | Description | Install |
|---------|-------------|---------|
| `@check/sdk` | TypeScript/Node.js SDK | `npm install @check/sdk` |
| `check` | Python SDK | `pip install check` |
| `@check/langchain` | LangChain TypeScript integration | `npm install @check/langchain` |
| `check-langchain` | LangChain Python integration | `pip install check-langchain` |
| `@check/llamaindex` | LlamaIndex integration | `npm install @check/llamaindex` |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Drizzle ORM |
| Database | PostgreSQL |
| Auth | Supabase Auth (OAuth + Email/Password) |
| Real-time | Supabase Realtime (WebSockets) |
| Payments | Stripe (subscriptions, webhooks, customer portal) |
| Caching/Rate Limiting | Upstash Redis |
| Async Jobs | Trigger.dev |
| Email | Resend |
| LLM Providers | OpenAI, Anthropic, Google, DeepSeek, Groq, Together, Mistral, Cohere, Azure, AWS Bedrock |

## Project Structure

```
/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── v1/               # Public API (verify, batch)
│   │   ├── dashboard/        # Dashboard APIs
│   │   ├── webhooks/         # Webhook endpoints
│   │   └── cron/             # Scheduled jobs
│   ├── dashboard/            # Dashboard pages
│   ├── auth/                 # Authentication pages
│   └── (marketing)/          # Landing, pricing, legal
├── lib/                      # Core business logic
│   ├── verification/         # 7 verification paradigms
│   ├── llm/                  # Multi-provider LLM client
│   ├── consensus/            # FPR-weighted voting
│   └── ...
├── packages/                 # SDK packages
│   ├── typescript-sdk/
│   ├── python-sdk/
│   ├── langchain-ts/
│   ├── langchain-python/
│   └── llamaindex/
└── docs/                     # Documentation
```

## Getting Started (Development)

### Prerequisites

- Node.js 18+
- PostgreSQL
- Supabase account
- Stripe account (for billing)

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/check.git
cd check
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Resend (Email)
RESEND_API_KEY=

# LLM Providers (optional - for platform keys)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

4. **Run database migrations**

```bash
npm run db:migrate
```

5. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Setting Up Stripe

See [docs/stripe-setup.md](docs/stripe-setup.md) for detailed Stripe configuration instructions.

## API Reference

### Verify Content

```
POST /api/v1/verify
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Content to verify (max 50,000 chars) |
| `methods` | object | Yes | Verification methods with weights (0-1) |
| `context` | object | No | Additional context for verification |
| `webhookUrl` | string | No | URL for result notification |
| `metadata` | object | No | Custom metadata (max 1KB) |

### Batch Processing

```
POST /api/v1/batch
GET  /api/v1/batch/:id
GET  /api/v1/batch/:id/results
POST /api/v1/batch/:id/cancel
POST /api/v1/batch/upload
```

## Pricing

| Plan | Verifications/mo | Rate Limit | Methods |
|------|-----------------|------------|---------|
| Free | 100 | 10 req/min | Semantic only |
| Starter | 1,000 | 60 req/min | All methods |
| Pro | 10,000 | 300 req/min | All methods |
| Enterprise | Custom | Custom | All methods |

## Documentation

- [Platform Overview](docs/overview.md)
- [Product Guide](docs/guide.md)
- [Implementation Plan](docs/plan.md)
- [Stripe Setup](docs/stripe-setup.md)

## License

MIT

## Support

- **Documentation**: [/docs](/docs)
- **API Playground**: [/dashboard/playground](/dashboard/playground)
- **Email**: support@check.ai
