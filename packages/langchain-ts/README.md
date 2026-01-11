# @check/langchain

LangChain integration for Check - Auto-verify LLM outputs with callbacks.

## Installation

```bash
npm install @check/langchain @check/sdk
```

## Quick Start

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { Check } from "@check/sdk";
import { CheckCallbackHandler } from "@check/langchain";

// Initialize clients
const client = new Check({ apiKey: "vfy_..." });
const handler = new CheckCallbackHandler(client);

// Use with any LangChain LLM
const llm = new ChatOpenAI({
  callbacks: [handler],
});

const response = await llm.invoke("What is the capital of France?");
// Verification happens automatically!
```

## Features

- **Auto-verification**: Automatically verify LLM outputs
- **Callback-based**: Uses LangChain's callback system
- **Flexible methods**: Configure which verification methods to use
- **Error handling**: Optionally raise on verification rejection
- **TypeScript**: Full TypeScript support

## Usage

### Basic Usage

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { Check } from "@check/sdk";
import { CheckCallbackHandler } from "@check/langchain";

const client = new Check({ apiKey: "vfy_..." });
const handler = new CheckCallbackHandler(client);

const llm = new ChatOpenAI({ callbacks: [handler] });
const response = await llm.invoke("What is 2+2?");
```

### Configure Methods

```typescript
const handler = new CheckCallbackHandler(client, {
  methods: { reasoning: 1.0, tool: 0.5 },
  minConfidence: 0.7,
});
```

### Raise on Rejection

```typescript
import { CheckCallbackHandler, VerificationRejectedError } from "@check/langchain";

const handler = new CheckCallbackHandler(client, {
  raiseOnReject: true,
});

try {
  const response = await llm.invoke("What is the population of Mars?");
} catch (error) {
  if (error instanceof VerificationRejectedError) {
    console.error(`Verification failed: ${error.reasoning}`);
  }
}
```

### Custom Callback

```typescript
const handler = new CheckCallbackHandler(client, {
  onVerification: (content, result) => {
    console.log(`Verified: ${result.verdict} (${(result.confidence * 100).toFixed(0)}%)`);
  },
});
```

## Configuration Options

```typescript
interface CheckCallbackHandlerOptions {
  methods?: MethodsConfig;           // Verification methods (default: { reasoning: 1.0 })
  minConfidence?: number;            // Min confidence threshold (default: 0.7)
  raiseOnReject?: boolean;           // Raise on rejection (default: false)
  onVerification?: (content: string, result: VerificationResult) => void;
  skipEmpty?: boolean;               // Skip empty responses (default: true)
  pollInterval?: number;             // Polling interval in ms (default: 1000)
  timeout?: number;                  // Max wait time in ms (default: 60000)
}
```

## With Chains

```typescript
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";

const prompt = PromptTemplate.fromTemplate("Answer: {question}");
const chain = new LLMChain({ llm, prompt });

// Verification happens automatically on LLM calls
const result = await chain.invoke({ question: "What is the speed of light?" });
```

## Requirements

- Node.js 18+
- @langchain/core >= 0.1.0
- @check/sdk

## License

MIT
