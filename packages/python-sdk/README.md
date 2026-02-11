# check

Official Python SDK for Check - The Stripe for LLM Verification.

Verify AI-generated content to prevent costly hallucinations with 7 verification methods.

## Installation

```bash
pip install check
```

## Quick Start

```python
from check import Check

# Initialize client
client = Check(api_key="vfy_...")

# Verify content (3 lines!)
result = client.verify_and_wait(
    content="The speed of light is approximately 299,792 km/s.",
    methods={"reasoning": 1.0}
)

print(result.verdict)     # 'true'
print(result.confidence)  # 0.95
print(result.decision)    # 'accept'
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

```python
result = client.verify_and_wait(
    content="Paris is the capital of France.",
    methods={"reasoning": 1.0, "tool": 0.5}
)
```

### With Context

Provide additional context to improve accuracy:

```python
result = client.verify_and_wait(
    content="The patient has a fever.",
    methods={"reasoning": 1.0},
    context={"domain": "medical", "source": "patient_notes"}
)
```

### Multiple Methods

Combine methods for higher accuracy:

```python
result = client.verify_and_wait(
    content="Climate change is caused by human activity.",
    methods={
        "reasoning": 1.0,  # LLM analysis
        "tool": 1.0,       # Web search verification
        "ensemble": 0.5    # Multi-model consensus
    }
)
```

### Mathematical Claims

Use formal verification for mathematical statements:

```python
result = client.verify_and_wait(
    content="2 + 2 = 4",
    methods={"formal": 1.0}  # 0% FPR for math
)
```

### With Metadata

Attach custom metadata for tracking:

```python
result = client.verify_and_wait(
    content="Some claim to verify...",
    methods={"reasoning": 1.0},
    metadata={
        "user_id": "user-123",
        "article_id": "article-456",
        "source": "chatbot"
    }
)

# Metadata returned in response
print(result.metadata["article_id"])  # 'article-456'
```

### Async Client

For async/await support:

```python
import asyncio
from check import AsyncCheck

async def main():
    client = AsyncCheck(api_key="vfy_...")

    result = await client.verify_and_wait(
        content="The Earth orbits the Sun.",
        methods={"reasoning": 1.0}
    )

    print(result.verdict)
    await client.close()

asyncio.run(main())
```

### Context Manager

Automatic resource cleanup:

```python
# Sync
with Check(api_key="vfy_...") as client:
    result = client.verify_and_wait(
        content="Some claim...",
        methods={"reasoning": 1.0}
    )

# Async
async with AsyncCheck(api_key="vfy_...") as client:
    result = await client.verify_and_wait(
        content="Some claim...",
        methods={"reasoning": 1.0}
    )
```

### Manual Polling

Poll for results without waiting:

```python
# Start verification (returns immediately)
response = client.verify(
    content="Some claim to verify...",
    methods={"reasoning": 1.0}
)

print(response.id)  # 'ver_abc123'
print(response.status)  # 'pending'

# Poll for results
import time

result = client.get_verification(response.id)
while result.status in ["pending", "processing"]:
    time.sleep(1)
    result = client.get_verification(response.id)

print(result.verdict)
```

### With Webhook

For async processing without polling:

```python
response = client.verify(
    content="Complex claim requiring multiple methods...",
    methods={"reasoning": 1.0, "tool": 1.0},
    webhook_url="https://your-app.com/webhooks/check"
)

print(response.id)  # Results delivered via webhook
```

### Batch Processing

Verify multiple claims efficiently:

```python
# Create and wait for batch
batch = client.create_batch_and_wait(
    name="Article fact-check",
    items=[
        {"content": "The Earth is flat."},
        {"content": "Water boils at 100°C at sea level."},
        {"content": "Humans have 206 bones."}
    ],
    methods={"reasoning": 1.0, "tool": 0.5}
)

print(f"Completed: {batch.success_count}/{batch.total_items}")

# Get results
results = client.get_batch_results(batch.id)
for result in results:
    print(f"{result.content}: {result.verdict} ({result.confidence})")
```

### Batch from File

Upload CSV or JSON files:

```python
# Upload file
with open("claims.csv", "rb") as f:
    file = client.upload_batch_file(f, "claims.csv")

# Create batch from uploaded file
batch = client.create_batch(
    name="CSV verification",
    file_id=file.id,
    methods={"reasoning": 1.0}
)

# Wait for completion
batch = client.wait_for_batch(batch.id)
```

## Response Format

```python
@dataclass
class VerifyResponse:
    id: str                           # Verification ID (ver_...)
    status: str                       # 'pending', 'processing', 'completed', 'escalated'
    verdict: Optional[str]            # 'true', 'false', 'uncertain'
    confidence: Optional[float]       # 0-1 confidence score
    decision: Optional[str]           # 'accept', 'refine', 'escalate', 'reject'
    reasoning: Optional[str]          # Explanation
    paradigm_results: List[ParadigmResult]  # Per-method results
    processing_time_ms: Optional[int]
    cached: Optional[bool]
    metadata: Optional[Dict[str, Any]]
    created_at: str
    completed_at: Optional[str]

@dataclass
class ParadigmResult:
    paradigm: str
    verdict: str
    confidence: float
    reasoning: str
    processing_time_ms: int
    sources: Optional[List[str]]  # For tool method
```

## Error Handling

The SDK provides typed exception classes:

```python
from check import (
    Check,
    CheckError,
    AuthenticationError,
    ValidationError,
    RateLimitError,
    QuotaExceededError,
    NotFoundError,
    ProviderError,
    TimeoutError,
)

try:
    result = client.verify_and_wait(...)
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
    # SDK automatically retries by default
except QuotaExceededError as e:
    print(f"Monthly quota exceeded: {e.used}/{e.limit}")
except ValidationError as e:
    print(f"Validation failed: {e.details}")
except ProviderError as e:
    print(f"LLM provider error ({e.provider}): {e.message}")
except TimeoutError:
    print("Verification timed out")
except CheckError as e:
    print(f"API error: {e.message}")
    print(f"Request ID: {e.request_id}")
```

## Configuration

```python
client = Check(
    api_key="vfy_...",                    # Required
    base_url="https://api.check.ai",      # Optional (default)
    timeout=30.0,                          # Request timeout in seconds (default: 30)
    max_retries=3,                         # Auto-retry on rate limits (default: 3)
    retry_delay=1.0,                       # Base retry delay in seconds (default: 1)
)
```

### Environment Variables

The SDK reads from environment variables if not provided:

```bash
export CHECK_API_KEY=vfy_...
export CHECK_BASE_URL=https://api.check.ai  # Optional
```

```python
# Reads from CHECK_API_KEY automatically
client = Check()
```

## Framework Integration

### FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from check import Check, CheckError

app = FastAPI()
client = Check()

class VerifyRequest(BaseModel):
    content: str

@app.post("/verify")
async def verify(request: VerifyRequest):
    try:
        # Use async client for FastAPI
        async with AsyncCheck() as client:
            result = await client.verify_and_wait(
                content=request.content,
                methods={"reasoning": 1.0}
            )
            return {
                "verdict": result.verdict,
                "confidence": result.confidence,
                "reasoning": result.reasoning
            }
    except CheckError as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Flask

```python
from flask import Flask, request, jsonify
from check import Check

app = Flask(__name__)
client = Check()

@app.route("/verify", methods=["POST"])
def verify():
    data = request.get_json()
    result = client.verify_and_wait(
        content=data["content"],
        methods={"reasoning": 1.0}
    )
    return jsonify({
        "verdict": result.verdict,
        "confidence": result.confidence,
        "reasoning": result.reasoning
    })
```

### Django

```python
# views.py
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from check import Check
import json

client = Check()

@require_POST
def verify(request):
    data = json.loads(request.body)
    result = client.verify_and_wait(
        content=data["content"],
        methods={"reasoning": 1.0}
    )
    return JsonResponse({
        "verdict": result.verdict,
        "confidence": result.confidence,
        "reasoning": result.reasoning
    })
```

### LangChain Integration

```python
from check.langchain import CheckVerificationCallback
from langchain_openai import ChatOpenAI

# Auto-verify all LLM outputs
callback = CheckVerificationCallback(
    api_key="vfy_...",
    methods={"reasoning": 1.0}
)

llm = ChatOpenAI(callbacks=[callback])

response = llm.invoke("What is the capital of France?")
# Response is automatically verified
```

## Best Practices

### 1. Choose Methods Based on Use Case

```python
# Real-time chatbot (speed)
fast = {"reasoning": 1.0}

# Important content (accuracy)
accurate = {"reasoning": 1.0, "tool": 1.0, "ensemble": 0.5}

# Mathematical claims (precision)
math = {"formal": 1.0}
```

### 2. Use Async for High Throughput

```python
import asyncio
from check import AsyncCheck

async def verify_many(contents: list[str]):
    async with AsyncCheck() as client:
        tasks = [
            client.verify_and_wait(
                content=content,
                methods={"reasoning": 1.0}
            )
            for content in contents
        ]
        return await asyncio.gather(*tasks)
```

### 3. Handle Rate Limits

```python
# SDK auto-retries, but you can customize
client = Check(
    api_key="vfy_...",
    max_retries=5,
    retry_delay=2.0
)
```

### 4. Cache Results

```python
import hashlib
from functools import lru_cache

@lru_cache(maxsize=1000)
def verify_cached(content: str) -> dict:
    result = client.verify_and_wait(
        content=content,
        methods={"reasoning": 1.0}
    )
    return {
        "verdict": result.verdict,
        "confidence": result.confidence,
        "reasoning": result.reasoning
    }
```

### 5. Use Context Managers

```python
# Ensures proper cleanup
with Check() as client:
    result = client.verify_and_wait(...)
```

## Type Hints

Full type hint support:

```python
from check import (
    Check,
    MethodsConfig,
    VerifyRequest,
    VerifyResponse,
    ParadigmResult,
    BatchRequest,
    BatchResponse,
)

# Type-safe method configuration
methods: MethodsConfig = {
    "reasoning": 1.0,
    "tool": 0.5,
}

# Type-safe request
def verify_content(content: str) -> VerifyResponse:
    return client.verify_and_wait(
        content=content,
        methods=methods
    )
```

## Requirements

- Python 3.9+
- httpx
- pydantic

## License

MIT
