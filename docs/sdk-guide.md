# Check.ai SDK Guide

This guide covers all Check.ai SDKs with comprehensive examples and best practices.

## Table of Contents

1. [TypeScript SDK](#typescript-sdk)
2. [Python SDK](#python-sdk)
3. [LangChain Integration](#langchain-integration)
4. [LlamaIndex Integration](#llamaindex-integration)
5. [Common Patterns](#common-patterns)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## TypeScript SDK

### Installation

```bash
npm install @check/sdk
# or
yarn add @check/sdk
# or
pnpm add @check/sdk
```

### Basic Usage

```typescript
import { Check } from '@check/sdk';

// Initialize the client
const client = new Check({
  apiKey: 'vfy_your_api_key',
});

// Simple verification
const result = await client.verifyAndWait({
  content: 'The speed of light is approximately 299,792 km/s.',
  methods: { reasoning: 1.0 },
});

console.log(result.verdict);     // 'true'
console.log(result.confidence);  // 0.95
console.log(result.decision);    // 'accept'
```

### Verification Methods

Choose methods based on your accuracy/speed requirements:

```typescript
// Fast verification (low latency)
const fast = await client.verifyAndWait({
  content: 'Paris is the capital of France.',
  methods: { reasoning: 1.0 },
});

// High accuracy (multiple methods)
const accurate = await client.verifyAndWait({
  content: 'Water freezes at 0°C at standard pressure.',
  methods: {
    reasoning: 1.0,
    tool: 1.0,       // Web search verification
    ensemble: 0.5,   // Multi-model voting
  },
});

// Mathematical claims (simple arithmetic is verified directly, other claims use LLM reasoning)
const math = await client.verifyAndWait({
  content: '12 * 12 = 144',
  methods: { formal: 1.0 },
});

// Full verification (all methods)
const full = await client.verifyAndWait({
  content: 'Complex claim requiring thorough verification.',
  methods: {
    semantic: 0.3,
    reasoning: 1.0,
    tool: 1.0,
    biprm: 0.8,
    ensemble: 0.5,
    entropy: 0.6,
    formal: 1.0,
  },
});
```

### Async Verification (Fire and Forget)

For non-blocking verification:

```typescript
// Start verification without waiting
const pending = await client.verify({
  content: 'Your claim here',
  methods: { reasoning: 1.0 },
});

console.log(pending.id);      // 'ver_abc123'
console.log(pending.status);  // 'pending'

// Check status later
const result = await client.getVerification(pending.id);

if (result.status === 'completed') {
  console.log(result.verdict);
}
```

### Batch Processing

Verify multiple claims efficiently:

```typescript
// Create a batch and wait for completion
const batch = await client.createBatchAndWait(
  {
    items: [
      { content: 'The Earth is round.' },
      { content: 'Water boils at 100°C.' },
      { content: 'Grass is purple.' },
    ],
    methods: { reasoning: 1.0 },
  },
  {
    onProgress: (b) => console.log(`Progress: ${b.progress}%`),
  }
);

console.log(batch.id);          // 'batch_xyz789'
console.log(batch.status);      // 'completed'

// Get results
const results = await client.getBatchResults(batch.id);
for (const item of results.items) {
  console.log(`Item ${item.itemIndex}: ${item.verdict} (${item.confidence})`);
}
```

### File Upload for Batch

```typescript
// Browser: Upload from file input
const fileInput = document.getElementById('file') as HTMLInputElement;
const file = fileInput.files![0];
const upload = await client.uploadBatchFile(file, file.name);

// Node.js: Upload from Buffer
import { readFileSync } from 'fs';
const buffer = readFileSync('./claims.csv');
const upload = await client.uploadBatchFile(buffer, 'claims.csv');

// Create batch from uploaded file
const batch = await client.createBatch({
  fileId: upload.fileId,
  methods: { reasoning: 1.0, tool: 0.5 },
});
```

### Custom Options

```typescript
const result = await client.verifyAndWait({
  content: 'Your claim',
  methods: { reasoning: 1.0 },
  context: {
    source: 'user-input',
    domain: 'medical',
  },
  options: {
    timeout: 60000,            // 60 seconds
    acceptThreshold: 0.9,      // Lower acceptance bar
    escalateThreshold: 0.3,    // Lower escalation bar
    maxRetries: 2,             // Retry failed paradigms
  },
  idempotencyKey: 'unique-request-id',
});
```

### Retry Configuration

```typescript
const client = new Check({
  apiKey: 'vfy_...',
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
  },
});

// Or disable retries
const noRetryClient = new Check({
  apiKey: 'vfy_...',
  retry: false,
});
```

---

## Python SDK

### Installation

```bash
pip install check
```

### Basic Usage

```python
from check import Check

# Initialize the client
client = Check(api_key="vfy_your_api_key")

# Simple verification
result = client.verify_and_wait(
    content="The speed of light is approximately 299,792 km/s.",
    methods={"reasoning": 1.0}
)

print(result.verdict)     # 'true'
print(result.confidence)  # 0.95
print(result.decision)    # 'accept'
```

### Async Client

```python
import asyncio
from check import AsyncCheck

async def main():
    client = AsyncCheck(api_key="vfy_...")

    result = await client.verify_and_wait(
        content="Paris is the capital of France.",
        methods={"reasoning": 1.0, "tool": 0.5}
    )

    print(result.verdict)
    await client.close()

asyncio.run(main())
```

### Context Manager

```python
# Sync
with Check(api_key="vfy_...") as client:
    result = client.verify_and_wait(
        content="Test claim",
        methods={"reasoning": 1.0}
    )

# Async
async with AsyncCheck(api_key="vfy_...") as client:
    result = await client.verify_and_wait(
        content="Test claim",
        methods={"reasoning": 1.0}
    )
```

### Batch Processing

```python
# Create batch with items
batch = client.create_batch(
    methods={"reasoning": 1.0},
    items=[
        {"content": "The Earth is round."},
        {"content": "Water boils at 100°C."},
        {"content": "The sun is cold."},
    ]
)

# Wait for completion with progress
def on_progress(batch):
    print(f"Progress: {batch.progress}%")

completed = client.create_batch_and_wait(
    methods={"reasoning": 1.0},
    items=items,
    on_progress=on_progress
)

# Get results
results = client.get_batch_results(completed.id)
for item in results.items:
    print(f"Item {item.item_index}: {item.verdict}")
```

### File Upload

```python
# From file path
upload = client.upload_batch_file("claims.csv")

# From bytes
with open("claims.json", "rb") as f:
    upload = client.upload_batch_file(f.read(), filename="claims.json")

# Create batch from file
batch = client.create_batch(
    methods={"reasoning": 1.0},
    file_id=upload.file_id
)
```

### Error Handling

```python
from check.errors import (
    CheckError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    TimeoutError,
    QuotaExceededError,
)

try:
    result = client.verify_and_wait(
        content="Test",
        methods={"reasoning": 1.0}
    )
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except QuotaExceededError:
    print("Monthly quota exceeded")
except ValidationError as e:
    print(f"Invalid request: {e.details}")
except TimeoutError:
    print("Verification timed out")
except CheckError as e:
    print(f"API error: {e.message} [{e.code}]")
```

---

## LangChain Integration

### TypeScript

```bash
npm install @check/langchain
```

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { Check } from '@check/sdk';
import { CheckCallbackHandler } from '@check/langchain';

// Create clients
const checkClient = new Check({ apiKey: 'vfy_...' });
const handler = new CheckCallbackHandler({
  client: checkClient,
  methods: { reasoning: 1.0, tool: 0.5 },
  raiseOnReject: true,  // Throw error on rejected content
});

// Use with LangChain
const llm = new ChatOpenAI({
  callbacks: [handler],
});

const response = await llm.invoke('What is the capital of France?');

// Access verification result
const verification = response.generations[0].generationInfo?.verification;
console.log(verification.verdict);     // 'true'
console.log(verification.confidence);  // 0.92
```

### Python

```bash
pip install check-langchain
```

```python
from langchain_openai import ChatOpenAI
from check import Check
from check_langchain import CheckCallbackHandler

# Create clients
check_client = Check(api_key="vfy_...")
handler = CheckCallbackHandler(
    check_client,
    methods={"reasoning": 1.0, "tool": 0.5},
    raise_on_reject=True,
)

# Use with LangChain
llm = ChatOpenAI(callbacks=[handler])
response = llm.invoke("What is 2 + 2?")

# Verification is automatically attached to generation
```

### Async Python

```python
import asyncio
from langchain_openai import ChatOpenAI
from check import AsyncCheck
from check_langchain import AsyncCheckCallbackHandler

async def main():
    client = AsyncCheck(api_key="vfy_...")
    handler = AsyncCheckCallbackHandler(
        client,
        methods={"reasoning": 1.0},
    )

    llm = ChatOpenAI(callbacks=[handler])
    response = await llm.ainvoke("What is the speed of light?")

    await client.close()

asyncio.run(main())
```

### Custom Verification Callback

```python
from check_langchain import CheckCallbackHandler, VerificationResult

def on_verification(content: str, result: VerificationResult):
    if result.decision == "escalate":
        # Send to human review
        send_for_review(content, result)
    elif result.decision == "reject":
        # Log the rejection
        log_rejection(content, result)

handler = CheckCallbackHandler(
    client,
    methods={"reasoning": 1.0},
    on_verification=on_verification,
)
```

---

## LlamaIndex Integration

```bash
npm install @check/llamaindex
```

```typescript
import { OpenAI } from 'llamaindex';
import { Check } from '@check/sdk';
import { CheckLlamaIndexCallback } from '@check/llamaindex';

const checkClient = new Check({ apiKey: 'vfy_...' });
const callback = new CheckLlamaIndexCallback({
  client: checkClient,
  methods: { reasoning: 1.0 },
});

// Use with LlamaIndex
const llm = new OpenAI({
  callbacks: [callback],
});
```

---

## Common Patterns

### RAG Pipeline Verification

```typescript
import { Check } from '@check/sdk';

async function verifiedRAG(query: string, retrievedDocs: string[]) {
  const client = new Check({ apiKey: 'vfy_...' });

  // Generate response using LLM
  const response = await generateResponse(query, retrievedDocs);

  // Verify the response
  const verification = await client.verifyAndWait({
    content: response,
    methods: { reasoning: 1.0, tool: 1.0 },
    context: {
      query,
      sources: retrievedDocs.slice(0, 3),
    },
  });

  // Handle based on decision
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

### Streaming with Post-Verification

```typescript
async function* streamWithVerification(prompt: string) {
  const fullResponse: string[] = [];

  // Stream the response
  for await (const chunk of llm.stream(prompt)) {
    fullResponse.push(chunk);
    yield { type: 'chunk', content: chunk };
  }

  // Verify after streaming completes
  const verification = await client.verifyAndWait({
    content: fullResponse.join(''),
    methods: { reasoning: 1.0 },
  });

  yield { type: 'verification', result: verification };
}
```

### Batch Verification with Progress

```typescript
async function verifyDataset(claims: string[]) {
  const batchSize = 100;
  const results: Map<string, VerifyResponse> = new Map();

  for (let i = 0; i < claims.length; i += batchSize) {
    const batchItems = claims.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    const completed = await client.createBatchAndWait(
      {
        items: batchItems.map(c => ({ content: c })),
        methods: { reasoning: 1.0 },
      },
      {
        onProgress: (b) => {
          console.log(`Batch ${batchNumber}: ${b.progress}%`);
        },
      }
    );

    const batchResults = await client.getBatchResults(completed.id);
    for (const result of batchResults.results) {
      results.set(batchItems[result.index], result);
    }
  }

  return results;
}
```

---

## Error Handling

### TypeScript

```typescript
import {
  CheckError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  TimeoutError,
  QuotaExceededError,
} from '@check/sdk';

try {
  const result = await client.verifyAndWait({
    content: 'Test',
    methods: { reasoning: 1.0 },
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
    // The SDK handles this automatically with retry config
  } else if (error instanceof QuotaExceededError) {
    console.error('Upgrade your plan');
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.details);
  } else if (error instanceof TimeoutError) {
    console.error('Verification timed out');
  } else if (error instanceof CheckError) {
    console.error(`API error: ${error.message} [${error.code}]`);
  }
}
```

---

## Best Practices

### 1. Choose Appropriate Methods

| Use Case | Recommended Methods | Latency |
|----------|---------------------|---------|
| Chatbots | `reasoning: 1.0` | ~2s |
| Content moderation | `reasoning: 1.0, tool: 0.5` | ~5s |
| Important decisions | `reasoning: 1.0, tool: 1.0, ensemble: 0.5` | ~10s |
| Simple arithmetic | `formal: 1.0` | ~1s |
| Full verification | All methods | ~20s |

### 2. Use Batch for Bulk Operations

```typescript
// GOOD: Use batch for multiple items
const batch = await client.createBatchAndWait({
  items: claims.map(c => ({ content: c })),
  methods: { reasoning: 1.0 },
});

// BAD: Individual requests for bulk data
for (const claim of claims) {
  await client.verifyAndWait({ content: claim, methods });
}
```

### 3. Set Appropriate Timeouts

```typescript
// Fast verification (chatbot)
await client.verifyAndWait({
  content: text,
  methods: { reasoning: 1.0 },
  options: { timeout: 30000 },
});

// Thorough verification (can wait longer)
await client.verifyAndWait({
  content: text,
  methods: { reasoning: 1.0, tool: 1.0, ensemble: 0.5 },
  options: { timeout: 120000 },
});
```

### 4. Use Idempotency Keys

```typescript
// Prevent duplicate verifications
const result = await client.verifyAndWait({
  content: text,
  methods: { reasoning: 1.0 },
  idempotencyKey: `user_${userId}_msg_${messageId}`,
});
```

### 5. Handle All Decision Types

```typescript
switch (result.decision) {
  case 'accept':
    // High confidence - auto-approve
    return result;
  case 'refine':
    // Medium confidence - might want to add disclaimers
    return { ...result, disclaimer: 'This claim has medium confidence.' };
  case 'escalate':
    // Human review needed
    await sendToReviewQueue(result);
    return { ...result, pending: true };
  case 'reject':
    // Low confidence - block or retry
    throw new Error('Verification failed');
}
```

### 6. Clean Up Resources

```typescript
// Use context managers in Python
with Check(api_key="vfy_...") as client:
    result = client.verify_and_wait(...)

// Or explicit cleanup
const client = new Check({ apiKey: 'vfy_...' });
try {
  // ... use client
} finally {
  client.close();
}
```

---

## Support

- **Documentation**: [docs.check.ai](https://docs.check.ai)
- **API Reference**: [docs.check.ai/api](https://docs.check.ai/api)
- **GitHub Issues**: Report bugs or request features
- **Email**: support@check.ai
