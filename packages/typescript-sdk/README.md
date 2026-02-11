# @check/sdk

Official TypeScript SDK for Check - The Stripe for LLM Verification.

Verify AI-generated content to prevent costly hallucinations with 7 verification methods.

## Installation

```bash
npm install @check/sdk
# or
yarn add @check/sdk
# or
pnpm add @check/sdk
```

## Quick Start

```typescript
import { Check } from '@check/sdk';

// Initialize client
const client = new Check({ apiKey: 'vfy_...' });

// Verify content (3 lines!)
const result = await client.verifyAndWait({
  content: 'The speed of light is approximately 299,792 km/s.',
  methods: { reasoning: 1.0 }
});

console.log(result.verdict);    // 'true'
console.log(result.confidence); // 0.95
console.log(result.decision);   // 'accept'
```

## Verification Methods

| Method | FPR | Use Case |
|--------|-----|----------|
| `formal` | 0% | Mathematical proofs (mathjs autoformalization) |
| `tool` | ~1% | CLoVE contrastive web verification |
| `reasoning` | ~4-5% | Adaptive self-refinement verification |
| `biprm` | ~5-7% | Parallel bidirectional step-level scoring |
| `entropy` | ~8-10% | Dual-path semantic entropy |
| `ensemble` | ~15-20% | Meta-judge adjudicated consensus |
| `semantic` | ~20-30% | Boltzmann energy embedding analysis |

**FPR** = False Positive Rate (lower is more accurate)

## Usage Examples

### Basic Verification

```typescript
const result = await client.verifyAndWait({
  content: 'Paris is the capital of France.',
  methods: { reasoning: 1.0, tool: 0.5 }
});
```

### With Context

Provide additional context to improve accuracy:

```typescript
const result = await client.verifyAndWait({
  content: 'The patient has a fever.',
  context: { domain: 'medical', source: 'patient_notes' },
  methods: { reasoning: 1.0 }
});
```

### Multiple Methods

Combine methods for higher accuracy:

```typescript
const result = await client.verifyAndWait({
  content: 'Climate change is caused by human activity.',
  methods: {
    reasoning: 1.0,  // LLM analysis
    tool: 1.0,       // Web search verification
    ensemble: 0.5    // Multi-model consensus
  }
});
```

### Mathematical Claims

Use formal verification for mathematical statements:

```typescript
const result = await client.verifyAndWait({
  content: '2 + 2 = 4',
  methods: { formal: 1.0 }  // 0% FPR for math
});
```

### With Metadata

Attach custom metadata for tracking:

```typescript
const result = await client.verifyAndWait({
  content: 'Some claim to verify...',
  methods: { reasoning: 1.0 },
  metadata: {
    userId: 'user-123',
    articleId: 'article-456',
    source: 'chatbot'
  }
});

// Metadata returned in response
console.log(result.metadata.articleId); // 'article-456'
```

### Async Verification with Webhooks

For long-running verifications, use webhooks:

```typescript
// Start verification (returns immediately)
const response = await client.verify({
  content: 'Complex claim requiring multiple methods...',
  methods: { reasoning: 1.0, tool: 1.0, ensemble: 1.0 },
  webhookUrl: 'https://your-app.com/webhooks/check'
});

console.log(response.id); // 'ver_abc123'
console.log(response.status); // 'pending'

// Results delivered via webhook when complete
```

### Manual Polling

Poll for results without webhooks:

```typescript
// Start verification
const response = await client.verify({
  content: 'Some claim to verify...',
  methods: { reasoning: 1.0 }
});

console.log(response.id); // 'ver_abc123'

// Poll for results
let result = await client.getVerification(response.id);
while (result.status === 'pending' || result.status === 'processing') {
  await new Promise(r => setTimeout(r, 1000));
  result = await client.getVerification(response.id);
}

console.log(result.verdict);
```

### Batch Processing

Verify multiple claims efficiently:

```typescript
// Create and wait for batch
const batch = await client.createBatchAndWait({
  name: 'Article fact-check',
  items: [
    { content: 'The Earth is flat.' },
    { content: 'Water boils at 100°C at sea level.' },
    { content: 'Humans have 206 bones.' }
  ],
  methods: { reasoning: 1.0, tool: 0.5 }
});

console.log(`Completed: ${batch.successCount}/${batch.totalItems}`);

// Get results
const results = await client.getBatchResults(batch.id);
for (const result of results) {
  console.log(`${result.content}: ${result.verdict} (${result.confidence})`);
}
```

### Batch from File

Upload CSV or JSON files:

```typescript
import fs from 'fs';

// Upload file
const file = await client.uploadBatchFile(
  fs.createReadStream('claims.csv'),
  'claims.csv'
);

// Create batch from uploaded file
const batch = await client.createBatch({
  name: 'CSV verification',
  fileId: file.id,
  methods: { reasoning: 1.0 }
});

// Poll or use webhooks for results
```

## Response Format

```typescript
interface VerifyResponse {
  id: string;                    // Verification ID (ver_...)
  status: 'pending' | 'processing' | 'completed' | 'escalated';
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;            // 0-1 confidence score
  decision: 'accept' | 'refine' | 'escalate' | 'reject';
  reasoning: string;             // Explanation
  paradigmResults: ParadigmResult[];  // Per-method results
  processingTimeMs: number;
  cached: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

interface ParadigmResult {
  paradigm: string;
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;
  reasoning: string;
  processingTimeMs: number;
  sources?: string[];  // For tool method
}
```

## Error Handling

The SDK provides typed error classes:

```typescript
import {
  Check,
  CheckError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
  NotFoundError,
  ProviderError,
} from '@check/sdk';

try {
  const result = await client.verifyAndWait({ ... });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
    // SDK automatically retries by default
  } else if (error instanceof QuotaExceededError) {
    console.error(`Monthly quota exceeded: ${error.used}/${error.limit}`);
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.details);
  } else if (error instanceof ProviderError) {
    console.error(`LLM provider error: ${error.provider}`);
  } else if (error instanceof CheckError) {
    console.error('API error:', error.message);
    console.error('Request ID:', error.requestId);
  }
}
```

## Configuration

```typescript
const client = new Check({
  apiKey: 'vfy_...',              // Required
  baseUrl: 'https://api.check.ai', // Optional (default)
  timeout: 30000,                  // Request timeout in ms (default: 30s)
  maxRetries: 3,                   // Auto-retry on rate limits (default: 3)
  retryDelay: 1000,                // Base retry delay in ms (default: 1s)
});
```

### Environment Variables

The SDK reads from environment variables if not provided:

```bash
CHECK_API_KEY=vfy_...
CHECK_BASE_URL=https://api.check.ai  # Optional
```

```typescript
// Reads from CHECK_API_KEY automatically
const client = new Check();
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  VerifyRequest,
  VerifyResponse,
  MethodsConfig,
  ParadigmResult,
  Verdict,
  Decision,
  BatchRequest,
  BatchResponse,
  BatchItem,
} from '@check/sdk';

// Type-safe method configuration
const methods: MethodsConfig = {
  reasoning: 1.0,
  tool: 0.5,
};

// Type-safe request
const request: VerifyRequest = {
  content: 'Your content here',
  methods,
  context: { domain: 'legal' },
};
```

## Framework Integration

### Next.js (App Router)

```typescript
// app/api/verify/route.ts
import { Check } from '@check/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Check({ apiKey: process.env.CHECK_API_KEY });

export async function POST(request: NextRequest) {
  const { content } = await request.json();

  const result = await client.verifyAndWait({
    content,
    methods: { reasoning: 1.0 }
  });

  return NextResponse.json(result);
}
```

### Express

```typescript
import express from 'express';
import { Check } from '@check/sdk';

const app = express();
const client = new Check({ apiKey: process.env.CHECK_API_KEY });

app.post('/verify', async (req, res) => {
  try {
    const result = await client.verifyAndWait({
      content: req.body.content,
      methods: { reasoning: 1.0 }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Server Actions (Next.js)

```typescript
// app/actions.ts
'use server';

import { Check } from '@check/sdk';

const client = new Check();

export async function verifyContent(content: string) {
  const result = await client.verifyAndWait({
    content,
    methods: { reasoning: 1.0, tool: 0.5 }
  });

  return {
    verdict: result.verdict,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}
```

## Best Practices

### 1. Choose Methods Based on Use Case

```typescript
// Real-time chatbot (speed)
const fast = { reasoning: 1.0 };

// Important content (accuracy)
const accurate = { reasoning: 1.0, tool: 1.0, ensemble: 0.5 };

// Mathematical claims (precision)
const math = { formal: 1.0 };
```

### 2. Use Webhooks for Long Operations

```typescript
// Don't block on slow verifications
const response = await client.verify({
  content: longContent,
  methods: { reasoning: 1.0, tool: 1.0 },
  webhookUrl: process.env.WEBHOOK_URL
});
```

### 3. Handle Rate Limits Gracefully

```typescript
// SDK auto-retries, but you can customize
const client = new Check({
  apiKey: 'vfy_...',
  maxRetries: 5,
  retryDelay: 2000
});
```

### 4. Cache Results

```typescript
import { createHash } from 'crypto';

const cache = new Map();

async function verifyWithCache(content: string) {
  const hash = createHash('sha256').update(content).digest('hex');

  if (cache.has(hash)) {
    return cache.get(hash);
  }

  const result = await client.verifyAndWait({
    content,
    methods: { reasoning: 1.0 }
  });

  cache.set(hash, result);
  return result;
}
```

## Requirements

- Node.js 18+ (for native fetch)
- Or provide a fetch polyfill for older versions

## License

MIT
