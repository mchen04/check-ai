# Express.js Integration Guide

This guide shows how to integrate the Shove SDK with Express.js applications.

## Installation

```bash
npm install @shove/sdk express
npm install -D @types/express typescript
```

## Basic Setup

```typescript
// src/index.ts
import express from 'express';
import { Shove } from '@shove/sdk';

const app = express();
app.use(express.json());

const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
});

// Verify endpoint
app.post('/verify', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await client.verifyAndWait({
      content,
      methods: { reasoning: 1, tool: 0.5 },
    });

    res.json(result);
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Middleware Pattern

Create reusable verification middleware:

```typescript
// src/middleware/verify.ts
import { Request, Response, NextFunction } from 'express';
import { Shove, VerifyResponse } from '@shove/sdk';

const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      verification?: VerifyResponse;
    }
  }
}

export function verifyContent(options?: {
  field?: string;
  rejectOnFalse?: boolean;
  minConfidence?: number;
}) {
  const {
    field = 'content',
    rejectOnFalse = false,
    minConfidence = 0.7,
  } = options || {};

  return async (req: Request, res: Response, next: NextFunction) => {
    const content = req.body[field];

    if (!content) {
      return next(); // Skip if no content
    }

    try {
      const result = await client.verifyAndWait({
        content,
        methods: { reasoning: 1 },
      });

      req.verification = result;

      // Optionally reject false claims with high confidence
      if (rejectOnFalse && result.verdict === 'false' && result.confidence >= minConfidence) {
        return res.status(400).json({
          error: 'Content verification failed',
          verification: {
            verdict: result.verdict,
            confidence: result.confidence,
            reasoning: result.reasoning,
          },
        });
      }

      next();
    } catch (error) {
      console.error('Verification error:', error);
      next(error);
    }
  };
}
```

### Using the Middleware

```typescript
import express from 'express';
import { verifyContent } from './middleware/verify';

const app = express();
app.use(express.json());

// Apply to specific routes
app.post('/articles', verifyContent({ rejectOnFalse: true }), (req, res) => {
  // req.verification contains the result
  console.log('Verification:', req.verification);

  // Process the article
  res.json({
    message: 'Article created',
    verification: req.verification
  });
});

// Apply to all POST requests on a router
const contentRouter = express.Router();
contentRouter.use(verifyContent());
contentRouter.post('/posts', (req, res) => { /* ... */ });
contentRouter.post('/comments', (req, res) => { /* ... */ });

app.use('/content', contentRouter);
```

## Async Verification (Non-blocking)

For non-blocking verification:

```typescript
app.post('/submit', async (req, res) => {
  const { content } = req.body;

  // Start verification without waiting
  const { id } = await client.verify({
    content,
    methods: { reasoning: 1 },
  });

  // Return immediately with verification ID
  res.json({
    message: 'Submission received',
    verificationId: id,
    status: 'pending',
  });

  // Optionally process results via webhook or polling
});

// Endpoint to check verification status
app.get('/verify/:id', async (req, res) => {
  const result = await client.getVerification(req.params.id);
  res.json(result);
});
```

## Batch Processing

Handle bulk verification:

```typescript
app.post('/verify/batch', async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  if (items.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per batch' });
  }

  try {
    const batch = await client.createBatchAndWait({
      items: items.map((item: any) => ({
        content: item.content,
        idempotencyKey: item.id,
      })),
      methods: { reasoning: 1 },
    });

    const results = await client.getBatchResults(batch.id);

    res.json({
      batchId: batch.id,
      status: batch.status,
      results: results.items,
    });
  } catch (error) {
    console.error('Batch verification failed:', error);
    res.status(500).json({ error: 'Batch verification failed' });
  }
});
```

## Error Handling

```typescript
import {
  Shove,
  RateLimitError,
  AuthenticationError,
  ValidationError,
  QuotaExceededError
} from '@shove/sdk';

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof RateLimitError) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: err.retryAfter,
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      error: 'Invalid API key',
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof QuotaExceededError) {
    return res.status(402).json({
      error: 'Quota exceeded',
      message: err.message,
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Retry Configuration

Configure custom retry behavior:

```typescript
const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
  retry: {
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
});
```

## Request Timeout

Set custom timeout:

```typescript
const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
  timeout: 60000, // 60 seconds
});
```

## Best Practices

1. **Use environment variables** - Never hardcode API keys
2. **Implement rate limiting** - Protect your endpoints from abuse
3. **Add request validation** - Validate input before sending to API
4. **Handle errors gracefully** - Return appropriate error responses
5. **Use async/await** - Avoid callback hell with promises
6. **Log verification results** - Track verification outcomes for monitoring
