/**
 * Check LangChain Integration
 * Auto-verify LLM outputs with Check callbacks
 *
 * @example
 * ```typescript
 * import { ChatOpenAI } from "@langchain/openai";
 * import { Check } from "@check/sdk";
 * import { CheckCallbackHandler } from "@check/langchain";
 *
 * const client = new Check({ apiKey: "vfy_..." });
 * const handler = new CheckCallbackHandler(client);
 *
 * const llm = new ChatOpenAI({
 *   callbacks: [handler],
 * });
 *
 * const response = await llm.invoke("What is 2+2?"); // Auto-verified!
 * ```
 */

export { CheckCallbackHandler } from './callback';
export type { CheckCallbackHandlerOptions, VerificationResult } from './callback';
export { VerificationError, VerificationRejectedError } from './errors';
