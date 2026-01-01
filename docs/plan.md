VerifyAI Full Implementation Plan

     Overview

     Complete implementation of VerifyAI - a multi-method LLM verification platform with 7 verification paradigms, BYOK (Bring Your Own Key) support via LiteLLM, Supabase
     real-time status updates, and tiered subscription billing.

     ---
     Tech Stack Summary

     | Layer       | Technology                    | Purpose                                   |
     |-------------|-------------------------------|-------------------------------------------|
     | Framework   | Next.js 14 (App Router)       | Full-stack framework                      |
     | Database    | PostgreSQL + Drizzle ORM      | Type-safe database access                 |
     | Auth        | Supabase Auth                 | User authentication + OAuth               |
     | Payments    | Stripe (tiered subscriptions) | Billing & subscription management         |
     | LLM Gateway | LiteLLM                       | Unified API for 100+ LLM providers (BYOK) |
     | Real-time   | Supabase Realtime             | Live verification status updates          |
     | Caching     | Upstash Redis                 | Rate limiting + verification caching      |
     | Validation  | Zod                           | Request/response validation               |

     ---
     Phase 1: Database Schema Extension

     Files to Modify

     - /utils/db/schema.ts - Add new tables

     New Tables

     // 1. Organizations (multi-tenant support)
     organizationsTable: id, name, slug, plan_type, created_at, updated_at

     // 2. Organization Members (RLS support)
     orgMembersTable: org_id, user_id, role, created_at

     // 3. API Keys (BYOK + platform keys)
     apiKeysTable: id, org_id, key_hash, key_prefix, provider, encrypted_key, is_active, last_used_at, expires_at

     // 4. Verifications (core verification requests)
     verificationsTable: id, org_id, idempotency_key, content, context, methods_config, status, final_verdict, confidence_score, processing_time_ms, cost_cents, cached_result,
      created_at, completed_at

     // 5. Paradigm Results (individual method results)
     paradigmResultsTable: id, verification_id, paradigm_type, provider, model, verdict, confidence, reasoning, raw_response, token_usage, processing_time_ms, error_message,
     created_at

     // 6. Escalations (human review queue)
     escalationsTable: id, verification_id, reason, details, priority, resolved_at, resolved_by, resolution, created_at

     // 7. Usage Tracking (billing)
     usageTable: id, org_id, verification_id, provider, model, input_tokens, output_tokens, cost_cents, created_at

     Migration Commands

     npm run db:generate
     npm run db:migrate

     ---
     Phase 2: LiteLLM Integration (BYOK Multi-Provider)

     New Files

     - /lib/llm/litellm-client.ts - LiteLLM wrapper
     - /lib/llm/providers.ts - Provider configuration
     - /lib/llm/key-manager.ts - BYOK key management

     Dependencies to Add

     npm install litellm openai @anthropic-ai/sdk zod

     Supported Providers (via LiteLLM)

     - OpenAI (gpt-4o, gpt-4-turbo, o1, o3-mini)
     - Anthropic (claude-3-opus, claude-3.5-sonnet, claude-3-haiku)
     - Google (gemini-2.0-flash, gemini-pro)
     - DeepSeek (deepseek-chat, deepseek-coder)
     - Groq (llama-3, mixtral)
     - Together AI, Replicate, Cohere, etc.

     Key Manager Pattern

     // Store encrypted user API keys
     // Decrypt at runtime for LiteLLM calls
     // Fall back to platform keys if BYOK not provided

     ---
     Phase 3: 7 Verification Methods

     New Directory Structure

     /lib/verification/
     ├── orchestrator.ts       # Main verification coordinator
     ├── methods/
     │   ├── semantic.ts       # Embedding similarity (fast, high FPR)
     │   ├── reasoning.ts      # LLM chain-of-thought judge
     │   ├── tool.ts           # Web search + code execution
     │   ├── biprm.ts          # Bidirectional reasoning
     │   ├── ensemble.ts       # Multi-model voting
     │   ├── entropy.ts        # Semantic entropy
     │   └── formal.ts         # Formal verification (stub)
     ├── consensus.ts          # FPR-weighted consensus scoring
     └── prompts/              # Verification prompts per method

     Method Specifications

     | Method           | Latency  | FPR     | Implementation               |
     |------------------|----------|---------|------------------------------|
     | Semantic         | <100ms   | 50-100% | Embedding cosine similarity  |
     | Reasoning        | 2-3s     | 7%      | LLM judge with CoT           |
     | Tool             | 1-2s     | ~2%     | Web search verification      |
     | BiPRM            | 3-5s     | ~10%    | Forward + backward reasoning |
     | Ensemble         | 5-10s    | 20-40%  | 3-model voting               |
     | Semantic Entropy | 200ms    | TBD     | Consistency checking         |
     | Formal           | Variable | 0%      | Mathematical proofs (future) |

     Consensus Formula

     // Weight = 1 - FPR (lower FPR = higher trust)
     finalConfidence = Σ(weight * confidence * verdict) / Σ(weights)

     ---
     Phase 4: API Routes

     New Route Structure

     /app/api/v1/
     ├── verify/
     │   ├── route.ts              # POST /api/v1/verify
     │   └── [id]/
     │       ├── route.ts          # GET /api/v1/verify/[id]
     │       └── status/
     │           └── route.ts      # GET (SSE real-time status)
     ├── keys/
     │   ├── route.ts              # GET, POST API keys
     │   └── [id]/route.ts         # DELETE API key
     ├── methods/
     │   └── route.ts              # GET available methods
     └── usage/
         └── route.ts              # GET usage stats

     API Authentication Middleware

     - /lib/api/middleware.ts - API key auth wrapper
     - /lib/api/rate-limit.ts - Rate limiting per plan tier
     - /lib/api/errors.ts - Standardized error handling

     Request/Response Types

     // POST /api/v1/verify
     interface VerifyRequest {
       content: string;
       context?: Record<string, unknown>;
       methods: {
         semantic?: number;    // 0-1 weight
         reasoning?: number;
         tool?: number;
         biprm?: number;
         ensemble?: number;
         entropy?: number;
         formal?: number;
       };
       idempotencyKey?: string;
     }

     interface VerifyResponse {
       id: string;
       status: 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';
       verdict?: 'true' | 'false' | 'uncertain';
       confidence?: number;
       decision?: 'accept' | 'refine' | 'escalate' | 'reject';
       paradigmResults?: ParadigmResult[];
       processingTimeMs?: number;
       costCents?: number;
     }

     ---
     Phase 5: Supabase Real-time Integration

     Files to Modify

     - /utils/supabase/realtime.ts - New file for real-time subscriptions

     Implementation

     - Use Supabase Realtime Broadcast for private channels
     - Channel per verification: verification:{id}
     - Events: status_update, paradigm_complete, final_result

     Client Hook

     // /hooks/useVerificationStatus.ts
     export function useVerificationStatus(verificationId: string) {
       // Subscribe to Supabase channel
       // Return live status updates
     }

     ---
     Phase 6: Stripe Billing (Tiered)

     Files to Modify

     - /utils/stripe/api.ts - Add verification limits
     - /app/webhook/stripe/route.ts - Handle plan changes

     Pricing Tiers

     | Tier       | Price   | Verifications/mo | Methods        |
     |------------|---------|------------------|----------------|
     | Free       | $0      | 100              | Semantic only  |
     | Pro        | $99/mo  | 5,000            | All 7 methods  |
     | Enterprise | $299/mo | Unlimited        | All + priority |

     Plan Enforcement

     // Check verification count before processing
     // Return 402 if limit exceeded
     // Track usage in usageTable

     ---
     Phase 7: Dashboard & Playground

     New Pages

     - /app/dashboard/verify/page.tsx - Verification history
     - /app/dashboard/verify/[id]/page.tsx - Verification detail
     - /app/dashboard/keys/page.tsx - API key management
     - /app/dashboard/usage/page.tsx - Usage & billing
     - /app/playground/page.tsx - Interactive testing UI

     Playground Features

     - Method weight sliders
     - Real-time result streaming
     - Code snippet generator
     - Share configurations

     ---
     Phase 8: Caching & Performance

     New Files

     - /lib/cache/redis.ts - Upstash Redis client
     - /lib/cache/verification-cache.ts - Result caching

     Dependencies

     npm install @upstash/redis

     Caching Strategy

     - Cache by content hash + methods config
     - TTL based on confidence (high = longer)
     - Skip cache for low confidence results

     ---
     Implementation Order

     Sprint 1: Foundation

     1. Database schema extension (Phase 1)
     2. LiteLLM integration (Phase 2)
     3. Core API middleware (Phase 4 partial)

     Sprint 2: Verification Engine

     4. Implement 7 verification methods (Phase 3)
     5. Consensus scoring
     6. Main /verify endpoint

     Sprint 3: Real-time & Billing

     7. Supabase real-time (Phase 5)
     8. Stripe tier enforcement (Phase 6)
     9. Usage tracking

     Sprint 4: UI & Polish

     10. Dashboard pages (Phase 7)
     11. Playground (Phase 7)
     12. Caching (Phase 8)

     ---
     Critical Files to Modify

     | File                         | Changes                          |
     |------------------------------|----------------------------------|
     | /utils/db/schema.ts          | Add 7 new tables                 |
     | /utils/stripe/api.ts         | Add plan limit checking          |
     | /app/webhook/stripe/route.ts | Handle plan updates              |
     | /middleware.ts               | Add /api/v1/* API key auth       |
     | /package.json                | Add litellm, @upstash/redis, zod |

     New Files to Create

     | File                              | Purpose                       |
     |-----------------------------------|-------------------------------|
     | /lib/llm/litellm-client.ts        | LiteLLM wrapper               |
     | /lib/llm/key-manager.ts           | BYOK key management           |
     | /lib/verification/orchestrator.ts | Main verification coordinator |
     | /lib/verification/methods/*.ts    | 7 verification methods        |
     | /lib/api/middleware.ts            | API auth + rate limiting      |
     | /app/api/v1/verify/route.ts       | Main verify endpoint          |
     | /utils/supabase/realtime.ts       | Real-time subscriptions       |
     | /hooks/useVerificationStatus.ts   | Client real-time hook         |

     ---
     Environment Variables to Add

     # LiteLLM (optional platform fallbacks)
     OPENAI_API_KEY=
     ANTHROPIC_API_KEY=
     GOOGLE_API_KEY=

     # Upstash Redis
     UPSTASH_REDIS_REST_URL=
     UPSTASH_REDIS_REST_TOKEN=

     # Encryption (for BYOK key storage)
     ENCRYPTION_KEY=

     # Web Search (for tool method)
     SERPER_API_KEY=

     ---
     Testing Strategy

     1. Unit tests: Each verification method
     2. Integration tests: Full verification flow
     3. Benchmark tests: Against HaluEval dataset
     4. Load tests: Rate limiting + concurrency

     ---
     Success Metrics

     - All 7 verification methods operational
     - <3s average verification latency
     95% combined accuracy on test set
     - Real-time status updates working
     - BYOK supporting 10+ providers via LiteLLM
     - Tiered billing enforcing limits
