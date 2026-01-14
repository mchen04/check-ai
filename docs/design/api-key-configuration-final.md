# Check.ai API Key Configuration - Final Design

## Overview

Each API key is a **complete, self-contained configuration** for verification behavior. The key defines:
- Which provider credentials to use
- Which paradigms are enabled by default
- What model to use for each paradigm
- Default weights and thresholds

**Core Principle:** One key = one behavior. Different use cases = different keys.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Organization                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Provider Credentials (Vault)                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ "openrouter-prod"  → sk-or-v1-***  (OpenRouter)            │ │
│  │ "openai-direct"    → sk-***        (OpenAI)                │ │
│  │ "anthropic-work"   → sk-ant-***    (Anthropic)             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  API Keys (Each with full configuration)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ vfy_prod_abc123 "Production"                               │ │
│  │   └── Uses: openrouter-prod                                │ │
│  │   └── Paradigms:                                           │ │
│  │         reasoning (0.6) → claude-3.5-sonnet                │ │
│  │         tool (0.4)      → gpt-4o-mini                      │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ vfy_fast_def456 "Fast Screening"                           │ │
│  │   └── Uses: openrouter-prod                                │ │
│  │   └── Paradigms:                                           │ │
│  │         reasoning (1.0) → groq/llama-3.3-70b               │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ vfy_accurate_ghi789 "High Accuracy"                        │ │
│  │   └── Uses: openrouter-prod                                │ │
│  │   └── Paradigms:                                           │ │
│  │         reasoning (0.4) → claude-3.5-sonnet                │ │
│  │         tool (0.3)      → gpt-4o                           │ │
│  │         ensemble (0.3)  → [gpt-4o, claude, gemini]         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Provider Credential (in vault)

```typescript
interface ProviderCredential {
  id: string;
  orgId: string;
  name: string;                    // User-defined: "openrouter-prod"
  provider: Provider;              // "openrouter", "openai", "anthropic", etc.
  encryptedCredentials: string;    // AES-256-GCM encrypted

  // Provider-specific config (for Azure, Bedrock, etc.)
  config?: {
    endpoint?: string;             // Azure endpoint
    region?: string;               // AWS region
    deploymentId?: string;         // Azure deployment
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type Provider =
  | 'openrouter'    // Recommended: access to all models
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'together'
  | 'mistral'
  | 'cohere'
  | 'deepseek'
  | 'xai'
  | 'fireworks'
  | 'cerebras'
  | 'perplexity'
  | 'azure'         // Requires endpoint config
  | 'bedrock';      // Requires AWS credentials
```

### API Key Configuration

```typescript
interface ApiKey {
  id: string;
  orgId: string;

  // Identity
  name: string;                    // "Production Key"
  keyHash: string;                 // SHA-256 hash for lookup
  keyPrefix: string;               // "vfy_prod_" for display

  // Provider link
  providerCredentialId: string;    // References credential in vault

  // Per-paradigm configuration
  paradigms: ParadigmConfigs;

  // Default thresholds (optional)
  defaults?: {
    acceptThreshold?: number;      // Default: 0.95
    escalateThreshold?: number;    // Default: 0.5
    timeout?: number;              // Default: 30000ms
  };

  // Metadata
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ParadigmConfigs {
  reasoning?: ParadigmConfig;
  tool?: ParadigmConfig;
  semantic?: SemanticConfig;
  ensemble?: EnsembleConfig;
  biprm?: ParadigmConfig;
  entropy?: ParadigmConfig;
  formal?: ParadigmConfig;
}

interface ParadigmConfig {
  enabled: boolean;                // Is this paradigm active by default?
  weight: number;                  // Default weight (0-1)
  model: string;                   // Model to use: "anthropic/claude-3.5-sonnet"
}

interface SemanticConfig {
  enabled: boolean;
  weight: number;
  model: string;                   // Must be embedding model
}

interface EnsembleConfig {
  enabled: boolean;
  weight: number;
  models: string[];                // Multiple models for voting
}
```

---

## API Behavior

### Request Schema

```typescript
interface VerifyRequest {
  content: string;                 // Required: content to verify

  // Optional: override key defaults
  methods?: {
    [paradigm: string]: number | ParadigmOverride;
  };

  // Optional: override thresholds
  options?: {
    acceptThreshold?: number;
    escalateThreshold?: number;
    timeout?: number;
    maxRetries?: number;
  };

  // Optional: idempotency
  idempotencyKey?: string;
}

interface ParadigmOverride {
  weight: number;
  model?: string;                  // Override model for this request
}
```

### Request Examples

**1. Simplest (use key defaults)**
```bash
curl -X POST https://api.check.ai/v1/verify \
  -H "Authorization: Bearer vfy_prod_abc123" \
  -d '{"content": "The Eiffel Tower is 330 meters tall."}'
```
→ Uses key's default paradigms, weights, and models

**2. Override weights only**
```json
{
  "content": "The Eiffel Tower is 330 meters tall.",
  "methods": {
    "reasoning": 0.8,
    "tool": 0.2
  }
}
```
→ Same models as key config, different weights

**3. Override model for one paradigm**
```json
{
  "content": "Important claim...",
  "methods": {
    "reasoning": {
      "weight": 0.7,
      "model": "openai/gpt-4o"
    },
    "tool": 0.3
  }
}
```
→ Uses gpt-4o for reasoning instead of key's default

**4. Enable additional paradigm**
```json
{
  "content": "Critical content requiring high accuracy...",
  "methods": {
    "reasoning": 0.4,
    "tool": 0.3,
    "ensemble": 0.3
  }
}
```
→ Adds ensemble (uses models configured on the key)

**5. Full override**
```json
{
  "content": "Mathematical claim: 2^10 = 1024",
  "methods": {
    "formal": {
      "weight": 1.0,
      "model": "openai/gpt-4o"
    }
  },
  "options": {
    "acceptThreshold": 0.99
  }
}
```

---

## Resolution Logic

```
Request arrives with API key
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Authenticate key                                              │
│    - Hash key, lookup in database                                │
│    - Verify active, not expired                                  │
│    - Get full key configuration                                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Resolve paradigms                                             │
│    - If request.methods specified → use those                    │
│    - Else → use key's enabled paradigms with default weights     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Resolve models per paradigm                                   │
│    - If request specifies model → use it                         │
│    - Else → use key's configured model for that paradigm         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Resolve options                                               │
│    - Merge: key.defaults < request.options                       │
│    - Apply system defaults for anything unspecified              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Get provider credentials                                      │
│    - Fetch key's linked provider credential                      │
│    - Decrypt API key                                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Execute verification                                          │
│    - Run each paradigm with resolved config                      │
│    - Calculate consensus                                         │
│    - Return result                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dashboard UX

### Provider Credentials Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings > Provider Credentials                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Your provider API keys are stored securely and used by your      │
│ Check.ai API keys to access LLM models.                          │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟢 openrouter-prod                          OpenRouter      │ │
│ │    sk-or-v1-****                                            │ │
│ │    Used by: 3 API keys                                      │ │
│ │                                              [Edit] [Delete]│ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟢 openai-direct                            OpenAI          │ │
│ │    sk-****                                                  │ │
│ │    Used by: 1 API key                                       │ │
│ │                                              [Edit] [Delete]│ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [+ Add Provider Credential]                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Keys Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings > API Keys                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Each API key has its own verification configuration.             │
│ Create different keys for different use cases.                   │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔑 Production                               vfy_prod_***    │ │
│ │    Provider: openrouter-prod                                │ │
│ │    Paradigms: reasoning (0.6), tool (0.4)                   │ │
│ │    Models: claude-3.5-sonnet, gpt-4o-mini                   │ │
│ │    Last used: 2 minutes ago                                 │ │
│ │                                      [Configure] [Revoke]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔑 Fast Screening                           vfy_fast_***    │ │
│ │    Provider: openrouter-prod                                │ │
│ │    Paradigms: reasoning (1.0)                               │ │
│ │    Models: groq/llama-3.3-70b                               │ │
│ │    Last used: 1 hour ago                                    │ │
│ │                                      [Configure] [Revoke]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔑 High Accuracy                            vfy_acc_***     │ │
│ │    Provider: openrouter-prod                                │ │
│ │    Paradigms: reasoning (0.4), tool (0.3), ensemble (0.3)   │ │
│ │    Models: claude-3.5-sonnet, gpt-4o, [3 ensemble models]   │ │
│ │    Last used: 3 days ago                                    │ │
│ │                                      [Configure] [Revoke]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [+ Create API Key]                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Create/Edit API Key Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Create API Key                                              [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Name                                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Production                                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Provider Credential                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ openrouter-prod (OpenRouter)                             ▼  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ═══════════════════ Paradigm Configuration ═══════════════════  │
│                                                                  │
│ ☑ reasoning                                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Weight: [======●===] 0.6                                │   │
│   │ Model:  [anthropic/claude-3.5-sonnet              ▼]    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ☑ tool                                                           │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Weight: [====●=====] 0.4                                │   │
│   │ Model:  [openai/gpt-4o-mini                       ▼]    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ☐ ensemble                                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Models for voting:                                      │   │
│   │ ☑ openai/gpt-4o                                         │   │
│   │ ☑ anthropic/claude-3.5-sonnet                           │   │
│   │ ☑ google/gemini-2.0-flash                               │   │
│   │ ☐ meta-llama/llama-3.3-70b                              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ☐ semantic                                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Model:  [openai/text-embedding-3-small            ▼]    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ☐ biprm                                                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Model:  [anthropic/claude-3.5-sonnet              ▼]    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ☐ entropy                                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Model:  [openai/gpt-4o-mini                       ▼]    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ☐ formal                                                         │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Model:  [openai/gpt-4o                            ▼]    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ═══════════════════ Default Thresholds ═══════════════════════  │
│                                                                  │
│ Accept Threshold:   [=======●==] 0.95  (auto-approve above)     │
│ Escalate Threshold: [====●=====] 0.50  (human review below)     │
│                                                                  │
│                                                                  │
│                                         [Cancel] [Create Key]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Response Format

```typescript
interface VerifyResponse {
  id: string;
  status: 'completed' | 'escalated';
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;
  decision: 'accept' | 'refine' | 'escalate' | 'reject';
  reasoning: string;

  // Shows exactly what was used
  paradigmResults: Array<{
    paradigm: string;
    weight: number;
    model: string;           // Actual model used
    verdict: string;
    confidence: number;
    reasoning?: string;
    processingTimeMs: number;
    costCents: number;
  }>;

  processingTimeMs: number;
  costCents: number;
  cached: boolean;
}
```

---

## Migration Plan

### Phase 1: Database Schema
1. Create `provider_credentials` table
2. Add `paradigm_config` JSONB column to `api_keys` table
3. Add `provider_credential_id` foreign key to `api_keys`

### Phase 2: Migrate Existing Data
1. Create default provider credential from env vars (for existing orgs)
2. Migrate existing API keys to new schema with default paradigm config

### Phase 3: Update API
1. Update key creation endpoint
2. Update verification endpoint to use new config resolution
3. Update SDK types

### Phase 4: Update Dashboard
1. New provider credentials management page
2. New API key configuration UI
3. Per-paradigm model selection

### Phase 5: Deprecate Old System
1. Remove platform default keys from env
2. Require provider credentials for new orgs
3. Migration guide for existing users

---

## Summary

| Concept | Description |
|---------|-------------|
| **Provider Credential** | LLM provider API key stored in vault |
| **API Key** | Check.ai key with full verification config |
| **Paradigm Config** | Per-paradigm model and weight settings |
| **Request Override** | Optional per-request adjustments |

**User Mental Model:**
- "I have provider credentials (OpenRouter, OpenAI, etc.)"
- "I create API keys for different use cases (prod, fast, accurate)"
- "Each API key knows which provider to use and how to verify"
- "I just send content, the key handles the rest"
- "If needed, I can override settings per request"
