# Check.ai API Reference

Complete API reference for the Check.ai verification platform.

## Base URL

```
https://api.check.ai
```

## Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer vfy_your_api_key
```

API keys can be created in the [Dashboard](https://check.ai/dashboard/keys).

---

## Verification API

### Create Verification

Start a new verification request.

```
POST /v1/verify
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Content to verify (1-50,000 chars) |
| `methods` | object | Yes* | Verification methods with weights (0-1) |
| `context` | object | No | Additional context for verification |
| `options` | object | No | Request options (timeout, thresholds) |
| `idempotencyKey` | string | No | Deduplication key (max 255 chars) |

*Required unless API key has default paradigm configuration.

**Methods Object:**

| Field | Type | Description |
|-------|------|-------------|
| `semantic` | number (0-1) | Embedding similarity checking |
| `reasoning` | number (0-1) | LLM judge evaluation |
| `tool` | number (0-1) | Web search-augmented verification |
| `biprm` | number (0-1) | Bidirectional premise reasoning |
| `ensemble` | number (0-1) | Multi-model voting consensus |
| `entropy` | number (0-1) | Consistency checking |
| `formal` | number (0-1) | Mathematical proof verification |

**Options Object:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout` | number | 60000 | Timeout in milliseconds (1000-300000) |
| `minConfidence` | number | - | Minimum confidence for acceptance |
| `acceptThreshold` | number | 0.95 | Threshold for auto-accept decision |
| `escalateThreshold` | number | 0.5 | Threshold for escalation |
| `maxRetries` | number | 1 | Per-paradigm retry count (0-5) |
| `retryOnLowConfidence` | boolean | false | Retry if confidence < minConfidence |

#### Example Request

```bash
curl -X POST https://api.check.ai/v1/verify \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The speed of light is approximately 299,792 km/s.",
    "methods": {
      "reasoning": 1.0,
      "tool": 0.5
    },
    "context": {
      "source": "user-input"
    }
  }'
```

#### Response

```json
{
  "id": "ver_abc123def456",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get Verification

Retrieve verification status and results.

```
GET /v1/verify/{id}
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Verification ID |

#### Example Response (Completed)

```json
{
  "id": "ver_abc123def456",
  "status": "completed",
  "content": "The speed of light is approximately 299,792 km/s.",
  "verdict": "true",
  "confidence": 0.95,
  "decision": "accept",
  "reasoning": "The claim is accurate. The speed of light in a vacuum is 299,792.458 km/s...",
  "paradigmResults": [
    {
      "paradigm": "reasoning",
      "weight": 1.0,
      "provider": "openai",
      "model": "gpt-4",
      "verdict": "true",
      "confidence": 0.95,
      "reasoning": "The stated speed of light matches scientific consensus.",
      "processingTimeMs": 1523,
      "costCents": 0.12
    },
    {
      "paradigm": "tool",
      "weight": 0.5,
      "provider": "openai",
      "model": "gpt-4",
      "verdict": "true",
      "confidence": 0.98,
      "reasoning": "Web search confirms: speed of light is 299,792,458 m/s.",
      "processingTimeMs": 3215,
      "costCents": 0.18
    }
  ],
  "processingTimeMs": 4738,
  "costCents": 0.30,
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:05Z"
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Request queued |
| `processing` | Verification in progress |
| `completed` | Verification finished successfully |
| `failed` | Verification failed (error) |
| `escalated` | Sent for human review |

#### Verdict Values

| Verdict | Description |
|---------|-------------|
| `true` | Content is accurate |
| `false` | Content contains inaccuracies |
| `uncertain` | Cannot determine with confidence |

#### Decision Values

| Decision | Confidence Range | Description |
|----------|------------------|-------------|
| `accept` | >= 0.95 | High confidence, auto-approve |
| `refine` | 0.70 - 0.95 | Medium confidence |
| `escalate` | < 0.70 + disagreement | Human review needed |
| `reject` | < 0.70 + agreement | Likely inaccurate |

---

## Batch API

### Create Batch

Create a batch verification job.

```
POST /v1/batch
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array | Yes* | Items to verify (max 100) |
| `methods` | object | Yes | Verification methods |
| `name` | string | No | Batch name (max 255 chars) |
| `options` | object | No | Verification options |
| `webhookUrl` | string | No | Webhook URL for completion |

*Mutually exclusive with `fileId` from upload.

**Item Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Content to verify |
| `context` | object | No | Item-specific context |
| `idempotencyKey` | string | No | Item deduplication key |

#### Example Request

```bash
curl -X POST https://api.check.ai/v1/batch \
  -H "Authorization: Bearer vfy_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"content": "The Earth is round."},
      {"content": "Water boils at 100°C."},
      {"content": "The sun is cold."}
    ],
    "methods": {"reasoning": 1.0}
  }'
```

#### Response

```json
{
  "id": "batch_xyz789",
  "status": "pending",
  "totalItems": 3,
  "message": "Batch created successfully"
}
```

### Get Batch

Get batch job status and details.

```
GET /v1/batch/{id}
```

#### Response

```json
{
  "id": "batch_xyz789",
  "status": "processing",
  "totalItems": 100,
  "completedItems": 45,
  "failedItems": 2,
  "progress": 45,
  "methods": {"reasoning": 1.0},
  "createdAt": "2024-01-15T10:30:00Z",
  "startedAt": "2024-01-15T10:30:01Z"
}
```

### List Batches

List batch jobs for the organization.

```
GET /v1/batch
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |
| `status` | string | - | Filter by status |

### Get Batch Results

Retrieve verification results for a batch.

```
GET /v1/batch/{id}/results
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Results per page |
| `offset` | number | 0 | Pagination offset |

#### Response

```json
{
  "batchId": "batch_xyz789",
  "status": "completed",
  "results": [
    {
      "index": 0,
      "verificationId": "ver_123",
      "status": "completed",
      "verdict": "true",
      "confidence": 0.95,
      "decision": "accept"
    },
    {
      "index": 1,
      "verificationId": "ver_124",
      "status": "completed",
      "verdict": "true",
      "confidence": 0.92,
      "decision": "accept"
    },
    {
      "index": 2,
      "verificationId": "ver_125",
      "status": "completed",
      "verdict": "false",
      "confidence": 0.88,
      "decision": "accept"
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

### Cancel Batch

Cancel a pending or processing batch.

```
POST /v1/batch/{id}/cancel
```

#### Response

Returns updated batch object with status `cancelled`.

### Upload Batch File

Upload a CSV or JSON file for batch processing.

```
POST /v1/batch/upload
Content-Type: multipart/form-data
```

#### Request

| Field | Type | Description |
|-------|------|-------------|
| `file` | file | CSV or JSON file |

**CSV Format:**

```csv
content,context
"The Earth is round.","{""source"": ""science""}"
"Water boils at 100°C.",
```

**JSON Format:**

```json
[
  {"content": "The Earth is round.", "context": {"source": "science"}},
  {"content": "Water boils at 100°C."}
]
```

#### Response

```json
{
  "fileId": "file_abc123",
  "originalFileName": "claims.csv",
  "format": "csv",
  "itemCount": 50,
  "expiresAt": "2024-01-15T11:30:00Z",
  "message": "File uploaded successfully"
}
```

---

## Webhooks

### Webhook Events

| Event | Description |
|-------|-------------|
| `verification.completed` | Verification finished |
| `verification.failed` | Verification failed |
| `verification.escalated` | Sent for human review |
| `batch.completed` | Batch job finished |
| `batch.failed` | Batch job failed |
| `escalation.resolved` | Escalation resolved |

### Webhook Payload

```json
{
  "event": "verification.completed",
  "timestamp": "2024-01-15T10:30:05Z",
  "data": {
    "id": "ver_abc123",
    "status": "completed",
    "verdict": "true",
    "confidence": 0.95,
    "decision": "accept"
  }
}
```

### Signature Verification

Webhooks include an `X-Check-Signature` header with HMAC-SHA256 signature:

```
X-Check-Signature: sha256=abc123...
```

Verify by computing HMAC-SHA256 of the raw request body using your webhook secret.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "requestId": "req_123abc",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing API key |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `QUOTA_EXCEEDED` | 402 | Monthly quota exceeded |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Rate Limits

Rate limits vary by plan:

| Plan | Requests/Minute |
|------|-----------------|
| Free | 10 |
| Pro | 100 |
| Enterprise | 1000 |

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315800
Retry-After: 30
```

---

## SDKs

Official SDKs handle authentication, retries, and error handling:

| Language | Package | Install |
|----------|---------|---------|
| TypeScript | `@check/sdk` | `npm install @check/sdk` |
| Python | `check` | `pip install check` |
| LangChain TS | `@check/langchain` | `npm install @check/langchain` |
| LangChain Py | `check-langchain` | `pip install check-langchain` |
| LlamaIndex | `@check/llamaindex` | `npm install @check/llamaindex` |

See the [SDK Guide](./sdk-guide.md) for detailed usage examples.
