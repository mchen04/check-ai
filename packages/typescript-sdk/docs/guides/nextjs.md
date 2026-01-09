# Next.js Integration Guide

This guide shows how to integrate the Shove SDK with Next.js applications.

## Installation

```bash
npm install @shove/sdk
```

## Environment Setup

Add your API key to `.env.local`:

```env
SHOVE_API_KEY=vfy_your_api_key
```

## Server-Side Usage (App Router)

### Route Handler

```typescript
// app/api/verify/route.ts
import { NextResponse } from 'next/server';
import { Shove } from '@shove/sdk';

const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
});

export async function POST(request: Request) {
  const { content } = await request.json();

  const result = await client.verifyAndWait({
    content,
    methods: { reasoning: 1, tool: 0.5 },
  });

  return NextResponse.json(result);
}
```

### Server Actions

```typescript
// app/actions/verify.ts
'use server';

import { Shove } from '@shove/sdk';

const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
});

export async function verifyContent(content: string) {
  const result = await client.verifyAndWait({
    content,
    methods: { reasoning: 1 },
  });

  return {
    verdict: result.verdict,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}
```

### Server Component

```typescript
// app/verify/page.tsx
import { Shove } from '@shove/sdk';

const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
});

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { content?: string };
}) {
  if (!searchParams.content) {
    return <div>No content to verify</div>;
  }

  const result = await client.verifyAndWait({
    content: searchParams.content,
    methods: { reasoning: 1 },
  });

  return (
    <div>
      <h1>Verification Result</h1>
      <p>Verdict: {result.verdict}</p>
      <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
      <p>Reasoning: {result.reasoning}</p>
    </div>
  );
}
```

## Client-Side Usage

For client-side verification, create an API route and call it from your component:

```typescript
// components/VerifyForm.tsx
'use client';

import { useState } from 'react';

export function VerifyForm() {
  const [content, setContent] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter content to verify..."
      />
      <button onClick={handleVerify} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify'}
      </button>
      {result && (
        <div>
          <p>Verdict: {result.verdict}</p>
          <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}
```

## Edge Runtime

The SDK works in Vercel Edge Runtime:

```typescript
// app/api/verify/route.ts
import { Shove } from '@shove/sdk';

export const runtime = 'edge';

const client = new Shove({
  apiKey: process.env.SHOVE_API_KEY!,
});

export async function POST(request: Request) {
  const { content } = await request.json();

  // Use verify() instead of verifyAndWait() for edge
  // to avoid long-running requests
  const { id } = await client.verify({
    content,
    methods: { reasoning: 1 },
  });

  return Response.json({ verificationId: id });
}
```

## Middleware Example

Verify content before processing:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  if (request.method === 'POST' && request.nextUrl.pathname.startsWith('/api/content')) {
    const body = await request.json();

    // Call verification API
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: body.content }),
    });

    const result = await verifyResponse.json();

    if (result.verdict === 'false' && result.confidence > 0.8) {
      return NextResponse.json(
        { error: 'Content failed verification' },
        { status: 400 }
      );
    }
  }

  return NextResponse.next();
}
```

## Error Handling

```typescript
import { Shove, RateLimitError, AuthenticationError } from '@shove/sdk';

const client = new Shove({ apiKey: process.env.SHOVE_API_KEY! });

try {
  const result = await client.verifyAndWait({ content: '...' });
} catch (error) {
  if (error instanceof RateLimitError) {
    // Retry after delay
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof AuthenticationError) {
    // Invalid API key
    console.error('Invalid API key');
  } else {
    throw error;
  }
}
```

## Best Practices

1. **Keep API key server-side** - Never expose your API key in client-side code
2. **Use Server Actions** - For simple forms, use Server Actions instead of API routes
3. **Handle loading states** - Show loading indicators during verification
4. **Cache results** - Consider caching verification results for identical content
5. **Use webhooks for async** - For long-running verifications, use webhooks instead of polling
