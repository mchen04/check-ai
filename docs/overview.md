# Shove - Platform Overview

Shove is a production-grade SaaS platform for verifying the truthfulness and accuracy of Large Language Model (LLM) outputs. Think of it as "the Stripe for LLM Verification" — a developer-first solution that helps organizations detect hallucinations, false claims, and AI-generated inaccuracies through multiple verification paradigms.

---

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
| Async Jobs | QStash (webhook delivery, batch processing) |
| Email | Resend |
| LLM Providers | OpenAI, Anthropic, Google, DeepSeek, Groq, Together, Mistral, Cohere, Azure, AWS Bedrock |

---

## Core Features

### 1. Multi-Paradigm Verification System

Seven distinct verification methods work together to determine truth:

| Paradigm | Description | Trust Weight |
|----------|-------------|--------------|
| **Semantic** | Embedding similarity checking | 0.3 |
| **Reasoning** | LLM judge evaluating statements | 0.6 |
| **Tool** | Web search-augmented verification | 0.7 |
| **BIPRM** | Bidirectional reasoning from multiple angles | 0.8 |
| **Ensemble** | Multi-model voting consensus | 0.85 |
| **Entropy** | Consistency checking across variations | 0.75 |
| **Formal** | Mathematical/logical proof verification | 1.0 |

Each paradigm produces:
- **Verdict**: `true`, `false`, or `uncertain`
- **Confidence**: Score from 0.0 to 1.0
- **Reasoning**: Explanation of the decision
- **Metrics**: Processing time and cost

### 2. Intelligent Consensus

Results are aggregated using False Positive Rate (FPR) weighted voting:

| Confidence Range | Action |
|-----------------|--------|
| 0.95+ | Auto-approve |
| 0.7 – 0.95 | Needs refinement |
| 0.5 – 0.7 | Escalate for human review |
| < 0.3 | Reject |

### 3. API-First Design

```
POST /api/v1/verify     # Real-time verification with streaming
POST /api/v1/batch      # Bulk verification via CSV/JSON upload
GET  /api/v1/verify/:id # Retrieve verification details
GET  /api/v1/batch/:id  # Check batch status and results
```

Features include:
- Streaming result updates via WebSockets
- Idempotency support
- Automatic retry logic with QStash

### 4. Batch Processing

- Upload CSV or JSON files for bulk verification
- Real-time progress tracking
- Asynchronous processing with automatic retries
- Auto-cleanup of old batch results

### 5. Multi-Tenant Organizations

- Organizations own all resources (verifications, API keys, webhooks)
- Role-Based Access Control (RBAC):
  - **Owner**: Full admin access
  - **Admin**: Team management, settings, webhooks
  - **Member**: Run verifications
  - **Viewer**: Read-only access
- Team invitations via email
- Audit logs for compliance

### 6. API Key Management

- **Bring Your Own Key (BYOK)**: Use your own LLM provider keys
  - AES-256-GCM encryption at rest
  - Support for all major providers
- **Platform Keys**: Use organization-configured provider keys
- Full lifecycle management (create, rotate, delete)

### 7. Webhook System

Events:
- `verification.completed`
- `verification.failed`
- `verification.escalated`
- Batch completion events

Guarantees:
- HMAC-SHA256 signed payloads
- Up to 6 automatic retries via QStash
- Dead Letter Queue for failed deliveries
- Detailed delivery logs

### 8. Escalation & Human Review

- Automatic escalation for low-confidence or conflicting results
- Priority levels (low, medium, high)
- Optional SLA deadlines
- Human verdict recording
- Email notifications

### 9. Analytics & Reporting

**Basic Metrics:**
- Verification trends (daily counts)
- Verdict distribution
- Per-paradigm performance
- Cost breakdown by provider
- Processing time (p50, p95)

**Advanced Analytics:**
- False Positive Rate per paradigm
- Cost efficiency tracking
- Confidence calibration
- Provider cost optimization

**Reports:**
- Weekly email summaries
- Usage statistics
- Daily snapshot aggregation

### 10. Subscription & Billing

| Plan | Verifications/mo | Methods | Rate Limit |
|------|-----------------|---------|------------|
| Free | 100 | Semantic only | 10 req/min |
| Pro | 5,000 | All methods | 100 req/min |
| Enterprise | Unlimited | All methods | 1,000 req/min |

Stripe integration handles:
- Checkout flow
- Customer portal
- Webhook events
- Usage quota enforcement

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant root entity with subscription info |
| `organization_members` | RBAC user-org-role mapping |
| `organization_invites` | Email-based team invitations |
| `api_keys` | Secure API key storage (hash + encryption) |
| `verifications` | Core verification requests with results |
| `paradigm_results` | Individual paradigm outputs per verification |
| `escalations` | Human review queue with priority/deadline |
| `usage` | Token and cost tracking per LLM provider |
| `webhooks` | Organization webhook configurations |
| `webhook_deliveries` | Delivery logs with retry tracking |
| `audit_logs` | Immutable activity trail |
| `batch_jobs` | Bulk verification job metadata |
| `batch_items` | Individual items within a batch |
| `analytics_daily_snapshots` | Pre-aggregated metrics |

---

## SDKs & Integrations

The monorepo includes SDK packages:

| Package | Description |
|---------|-------------|
| `@shove/sdk` | TypeScript SDK for Node.js/browser |
| `shove-python` | Python SDK |
| `@shove/langchain` | LangChain TypeScript integration |
| `shove-langchain-python` | LangChain Python integration |
| `@shove/llamaindex` | LlamaIndex integration |

---

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── v1/            # Public API (verify, batch)
│   │   │   ├── dashboard/     # Dashboard APIs
│   │   │   ├── webhooks/      # Webhook delivery
│   │   │   └── cron/          # Scheduled jobs
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── auth/              # Authentication pages
│   │   └── (marketing)/       # Landing, pricing, legal
│   ├── components/            # React components
│   ├── lib/                   # Core business logic
│   │   ├── verification/      # Paradigm implementations
│   │   ├── llm/               # Multi-provider LLM client
│   │   ├── consensus/         # FPR-weighted voting
│   │   └── ...
│   └── db/                    # Drizzle schema & migrations
├── packages/                  # SDK packages
│   ├── sdk-typescript/
│   ├── sdk-python/
│   └── ...
└── docs/                      # Documentation
```

---

## Key API Endpoints

### Verification
- `POST /api/v1/verify` — Single verification with streaming
- `GET /api/v1/verify/:id` — Get verification details

### Batch Processing
- `POST /api/v1/batch` — Create batch job
- `POST /api/v1/batch/upload` — Upload CSV/JSON
- `GET /api/v1/batch/:id` — Get batch status
- `GET /api/v1/batch/:id/results` — Fetch results
- `POST /api/v1/batch/:id/cancel` — Cancel batch

### Dashboard
- Team management, API keys, webhooks
- Organization settings
- Analytics & advanced queries
- Data export, audit logs

### System
- Webhook delivery with QStash callbacks
- Cron jobs (cleanup, reports, analytics)

---

## Value Propositions

1. **Multi-Paradigm Approach** — Seven verification methods for comprehensive coverage
2. **Enterprise-Grade** — RBAC, audit logs, webhooks, team management
3. **Developer-Friendly** — SDKs, streaming APIs, comprehensive docs
4. **Flexible** — BYOK for cost control, multiple LLM providers
5. **Scalable** — Batch processing for bulk operations
6. **Transparent** — Detailed cost tracking, paradigm breakdowns, confidence scores
7. **Reliable** — Webhook retry logic, DLQ, idempotent operations
8. **Compliance-Ready** — Audit logs, role-based access, data export

---

## Environment Variables

The platform requires configuration for:
- Supabase (auth, database, realtime)
- Stripe (billing)
- Upstash (Redis, QStash)
- Resend (email)
- LLM provider API keys

See `.env.example` for the full list of required variables.

---

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations: `npm run db:migrate`
5. Start development server: `npm run dev`

For detailed setup instructions, see [guide.md](./guide.md).
