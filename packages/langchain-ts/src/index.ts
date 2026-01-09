/**
 * Shove LangChain Integration
 * Auto-verify LLM outputs with Shove callbacks
 *
 * @example
 * ```typescript
 * import { ChatOpenAI } from "@langchain/openai";
 * import { Shove } from "@shove/sdk";
 * import { ShoveCallbackHandler } from "@shove/langchain";
 *
 * const client = new Shove({ apiKey: "vfy_..." });
 * const handler = new ShoveCallbackHandler(client);
 *
 * const llm = new ChatOpenAI({
 *   callbacks: [handler],
 * });
 *
 * const response = await llm.invoke("What is 2+2?"); // Auto-verified!
 * ```
 */

export { ShoveCallbackHandler } from './callback';
export type { ShoveCallbackHandlerOptions, VerificationResult } from './callback';
export { VerificationError, VerificationRejectedError } from './errors';
