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
| `semantic` | 50-100% | Basic embedding similarity |
| `reasoning` | ~7% | LLM-based reasoning judge |
| `tool` | ~2% | Fact-checking with web search |
| `biprm` | ~10% | Bidirectional reasoning |
| `ensemble` | ~30% | Multi-model voting |
| `entropy` | ~15% | Consistency checking |
| `formal` | 0% | Mathematical proofs |

## Usage

### Basic Verification

```typescript
const result = await client.verifyAndWait({
  content: 'Paris is the capital of France.',
  methods: { reasoning: 1.0, tool: 0.5 }
});
```

### With Context

```typescript
const result = await client.verifyAndWait({
  content: 'The patient has a fever.',
  context: { domain: 'medical', source: 'patient_notes' },
  methods: { reasoning: 1.0 }
});
```

### Multiple Methods

```typescript
const result = await client.verifyAndWait({
  content: '2 + 2 = 4',
  methods: {
    reasoning: 1.0,
    formal: 1.0,    // Mathematical verification
    tool: 0.5       // Also check online
  }
});
```

### Manual Polling

```typescript
// Start verification (returns immediately)
const response = await client.verify({
  content: 'Some claim to verify...',
  methods: { reasoning: 1.0 }
});

console.log(response.id); // 'ver_abc123'

// Poll for results
const result = await client.getVerification(response.id);
```

## Response Format

```typescript
interface VerifyResponse {
  id: string;                    // Verification ID
  status: 'completed' | ...;     // Current status
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;            // 0-1 confidence score
  decision: 'accept' | 'refine' | 'escalate' | 'reject';
  reasoning: string;             // Explanation
  paradigmResults: ParadigmResult[];  // Per-method results
  processingTimeMs: number;
  cached: boolean;
}
```

## Error Handling

```typescript
import {
  Check,
  AuthenticationError,
  RateLimitError,
  QuotaExceededError
} from '@check/sdk';

try {
  const result = await client.verifyAndWait({ ... });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof QuotaExceededError) {
    console.error('Monthly quota exceeded');
  }
}
```

## Configuration

```typescript
const client = new Check({
  apiKey: 'vfy_...',
  baseUrl: 'https://api.check.ai',  // Optional
  timeout: 30000,                        // Request timeout in ms
});
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
} from '@check/sdk';
```

## Requirements

- Node.js 18+ (for native fetch)
- Or provide a fetch polyfill

## License

MIT
