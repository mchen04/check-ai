# shove

Official Python SDK for Shove - The Stripe for LLM Verification.

Verify AI-generated content to prevent costly hallucinations with 7 verification methods.

## Installation

```bash
pip install shove
```

## Quick Start

```python
from shove import Shove

# Initialize client
client = Shove(api_key="vfy_...")

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
| `semantic` | 50-100% | Basic embedding similarity |
| `reasoning` | ~7% | LLM-based reasoning judge |
| `tool` | ~2% | Fact-checking with web search |
| `biprm` | ~10% | Bidirectional reasoning |
| `ensemble` | ~30% | Multi-model voting |
| `entropy` | ~15% | Consistency checking |
| `formal` | 0% | Mathematical proofs |

## Usage

### Basic Verification

```python
result = client.verify_and_wait(
    content="Paris is the capital of France.",
    methods={"reasoning": 1.0, "tool": 0.5}
)
```

### With Context

```python
result = client.verify_and_wait(
    content="The patient has a fever.",
    methods={"reasoning": 1.0},
    context={"domain": "medical", "source": "patient_notes"}
)
```

### Multiple Methods

```python
result = client.verify_and_wait(
    content="2 + 2 = 4",
    methods={
        "reasoning": 1.0,
        "formal": 1.0,    # Mathematical verification
        "tool": 0.5       # Also check online
    }
)
```

### Async Client

```python
import asyncio
from shove import AsyncShove

async def main():
    client = AsyncShove(api_key="vfy_...")

    result = await client.verify_and_wait(
        content="The Earth orbits the Sun.",
        methods={"reasoning": 1.0}
    )

    print(result.verdict)
    await client.close()

asyncio.run(main())
```

### Context Manager

```python
with Shove(api_key="vfy_...") as client:
    result = client.verify_and_wait(
        content="Some claim...",
        methods={"reasoning": 1.0}
    )

# Async
async with AsyncShove(api_key="vfy_...") as client:
    result = await client.verify_and_wait(...)
```

### Manual Polling

```python
# Start verification (returns immediately)
response = client.verify(
    content="Some claim to verify...",
    methods={"reasoning": 1.0}
)

print(response.id)  # 'ver_abc123'

# Poll for results
result = client.get_verification(response.id)
```

## Response Format

```python
@dataclass
class VerifyResponse:
    id: str                           # Verification ID
    status: str                       # 'completed', 'pending', etc.
    verdict: Optional[str]            # 'true', 'false', 'uncertain'
    confidence: Optional[float]       # 0-1 confidence score
    decision: Optional[str]           # 'accept', 'refine', 'escalate', 'reject'
    reasoning: Optional[str]          # Explanation
    paradigm_results: List[ParadigmResult]  # Per-method results
    processing_time_ms: Optional[int]
    cached: Optional[bool]
```

## Error Handling

```python
from shove import (
    Shove,
    AuthenticationError,
    RateLimitError,
    QuotaExceededError,
    TimeoutError,
)

try:
    result = client.verify_and_wait(...)
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except QuotaExceededError:
    print("Monthly quota exceeded")
except TimeoutError:
    print("Verification timed out")
```

## Configuration

```python
client = Shove(
    api_key="vfy_...",
    base_url="https://api.shove.ai",  # Optional
    timeout=30.0,                          # Request timeout in seconds
)
```

## Type Hints

Full type hint support:

```python
from shove import (
    MethodsConfig,
    VerifyRequest,
    VerifyResponse,
    ParadigmResult,
)
```

## Requirements

- Python 3.9+
- httpx
- pydantic

## License

MIT
