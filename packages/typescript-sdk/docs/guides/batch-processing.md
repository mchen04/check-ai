# Batch Processing Guide

This guide covers how to use the Shove SDK for batch verification of multiple content items.

## Overview

Batch processing allows you to verify up to 100 items in a single request. It's ideal for:

- Bulk content moderation
- Historical data verification
- Automated content pipelines
- Dataset validation

## Basic Usage

### Create and Wait

The simplest approach - create a batch and wait for completion:

```typescript
import { Shove } from '@shove/sdk';

const client = new Shove({ apiKey: 'vfy_your_api_key' });

const batch = await client.createBatchAndWait({
  name: 'Daily fact check',
  items: [
    { content: 'The Earth is 4.5 billion years old.' },
    { content: 'Water boils at 100C at sea level.' },
    { content: 'The Great Wall is visible from space.' },
  ],
  methods: { reasoning: 1, tool: 0.5 },
});

console.log(`Status: ${batch.status}`);
console.log(`Success: ${batch.successCount}/${batch.totalItems}`);
```

### Manual Polling

For more control over the process:

```typescript
// Create batch
const { id } = await client.createBatch({
  items: [
    { content: 'Claim 1...' },
    { content: 'Claim 2...' },
  ],
  methods: { reasoning: 1 },
});

// Poll for completion
let batch;
do {
  batch = await client.getBatch(id);
  console.log(`Progress: ${batch.processedItems}/${batch.totalItems}`);

  if (batch.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
} while (batch.status === 'processing' || batch.status === 'pending');

// Get results
const results = await client.getBatchResults(id);
```

## File Upload

For larger datasets, upload a file first:

### CSV Upload

```typescript
import fs from 'fs';

// Read CSV file
const csvContent = fs.readFileSync('claims.csv');

// Upload
const upload = await client.uploadBatchFile(csvContent, 'claims.csv');
console.log(`Uploaded ${upload.itemCount} items`);

// Create batch with file reference
const batch = await client.createBatchAndWait({
  fileId: upload.fileId,
  methods: { reasoning: 1 },
});
```

### CSV Format

```csv
content,context.source,idempotencyKey
"The Earth is round.",wikipedia,claim-001
"Water is H2O.",chemistry-textbook,claim-002
```

### JSON Upload

```typescript
const items = [
  { content: 'Claim 1', context: { source: 'article' } },
  { content: 'Claim 2', context: { source: 'blog' } },
];

const jsonContent = Buffer.from(JSON.stringify(items));
const upload = await client.uploadBatchFile(jsonContent, 'claims.json');
```

## Progress Tracking

### Polling with Progress

```typescript
async function processBatchWithProgress(
  client: Shove,
  request: CreateBatchRequest
) {
  const batch = await client.createBatch(request);

  while (true) {
    const status = await client.getBatch(batch.id);

    const progress = (status.processedItems / status.totalItems) * 100;
    console.log(`Progress: ${progress.toFixed(1)}%`);
    console.log(`  Success: ${status.successCount}`);
    console.log(`  Failed: ${status.failureCount}`);

    if (['completed', 'failed', 'cancelled'].includes(status.status)) {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### Real-time Updates (Supabase)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function subscribeToBatchProgress(batchId: string) {
  const channel = supabase.channel(`batch:${batchId}`);

  channel.on('broadcast', { event: 'progress' }, ({ payload }) => {
    console.log(`Item ${payload.itemIndex}: ${payload.success ? 'success' : 'failed'}`);
    console.log(`Progress: ${payload.processedItems}/${payload.totalItems}`);
  });

  channel.on('broadcast', { event: 'complete' }, ({ payload }) => {
    console.log(`Batch completed: ${payload.successCount}/${payload.totalItems}`);
    channel.unsubscribe();
  });

  channel.subscribe();

  return () => channel.unsubscribe();
}
```

## Processing Results

### Get All Results

```typescript
async function getAllResults(client: Shove, batchId: string) {
  const allItems = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const results = await client.getBatchResults(batchId, { limit, offset });
    allItems.push(...results.items);

    if (!results.pagination.hasMore) break;
    offset += limit;
  }

  return allItems;
}
```

### Filter by Verdict

```typescript
const results = await client.getBatchResults(batchId);

const trueItems = results.items.filter(i => i.verdict === 'true');
const falseItems = results.items.filter(i => i.verdict === 'false');
const uncertainItems = results.items.filter(i => i.verdict === 'uncertain');
const failedItems = results.items.filter(i => i.status === 'failed');

console.log(`True: ${trueItems.length}`);
console.log(`False: ${falseItems.length}`);
console.log(`Uncertain: ${uncertainItems.length}`);
console.log(`Failed: ${failedItems.length}`);
```

### Export Results

```typescript
function exportToCSV(results: BatchItemResult[]): string {
  const headers = ['content', 'verdict', 'confidence', 'decision', 'error'];
  const rows = results.map(item => [
    `"${item.content.replace(/"/g, '""')}"`,
    item.verdict || '',
    item.confidence?.toString() || '',
    item.decision || '',
    item.errorMessage || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
```

## Error Handling

### Batch-Level Errors

```typescript
try {
  const batch = await client.createBatchAndWait({
    items: [...],
    methods: { reasoning: 1 },
  });

  if (batch.status === 'failed') {
    console.error('Batch failed:', batch.errorMessage);
    if (batch.validationErrors) {
      batch.validationErrors.forEach(err => {
        console.error(`  Row ${err.row}: ${err.error}`);
      });
    }
  }
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Batch processing not available on free plan');
  }
  throw error;
}
```

### Item-Level Errors

```typescript
const results = await client.getBatchResults(batchId);

for (const item of results.items) {
  if (item.status === 'failed') {
    console.error(`Item ${item.itemIndex} failed: ${item.errorMessage}`);
    console.error(`  Retry count: ${item.retryCount}`);
  }
}
```

## Cancellation

### Cancel a Batch

```typescript
// Start batch
const batch = await client.createBatch({ items: [...] });

// Cancel after timeout
setTimeout(async () => {
  await client.cancelBatch(batch.id);
  console.log('Batch cancelled');
}, 60000);
```

### Cancel on High Failure Rate

```typescript
async function monitorBatch(client: Shove, batchId: string) {
  while (true) {
    const batch = await client.getBatch(batchId);

    // Cancel if failure rate > 20%
    if (batch.processedItems > 10) {
      const failureRate = batch.failureCount / batch.processedItems;
      if (failureRate > 0.2) {
        console.log('High failure rate, cancelling...');
        await client.cancelBatch(batchId);
        return;
      }
    }

    if (batch.status !== 'processing') return;
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

## Idempotency

Use idempotency keys to prevent duplicate processing:

```typescript
const batch = await client.createBatch({
  items: [
    { content: 'Claim 1', idempotencyKey: 'article-123-claim-1' },
    { content: 'Claim 2', idempotencyKey: 'article-123-claim-2' },
  ],
  methods: { reasoning: 1 },
});
```

If you retry with the same idempotency keys, items that were already processed will return cached results.

## Best Practices

1. **Use idempotency keys** - Prevent duplicate processing on retries
2. **Set meaningful batch names** - Easier to identify in dashboard
3. **Include context** - Improves verification accuracy
4. **Monitor failure rates** - Cancel early if too many items fail
5. **Process results incrementally** - Don't wait for full completion to start processing
6. **Handle partial failures** - Some items may fail while others succeed
7. **Use file upload for large datasets** - More efficient than inline items

## Limits

| Limit | Value |
|-------|-------|
| Items per batch | 100 |
| Content per item | 50,000 chars |
| File upload size | 10 MB |
| Results retention | 30 days |
| File reference expiry | 1 hour |
