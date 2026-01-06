/**
 * VerifyAI LangChain Integration
 * Auto-verify LLM outputs with VerifyAI callbacks
 *
 * @example
 * ```typescript
 * import { ChatOpenAI } from "@langchain/openai";
 * import { VerifyAI } from "@verifyai/sdk";
 * import { VerifyAICallbackHandler } from "@verifyai/langchain";
 *
 * const client = new VerifyAI({ apiKey: "vfy_..." });
 * const handler = new VerifyAICallbackHandler(client);
 *
 * const llm = new ChatOpenAI({
 *   callbacks: [handler],
 * });
 *
 * const response = await llm.invoke("What is 2+2?"); // Auto-verified!
 * ```
 */

export { VerifyAICallbackHandler } from './callback';
export type { VerifyAICallbackHandlerOptions, VerificationResult } from './callback';
export { VerificationError, VerificationRejectedError } from './errors';
