"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  VerificationError: () => VerificationError,
  VerificationRejectedError: () => VerificationRejectedError,
  VerifyAICallbackHandler: () => VerifyAICallbackHandler
});
module.exports = __toCommonJS(index_exports);

// src/callback.ts
var import_base = require("@langchain/core/callbacks/base");

// src/errors.ts
var VerificationError = class extends Error {
  verificationId;
  verdict;
  confidence;
  decision;
  constructor(message, options) {
    super(message);
    this.name = "VerificationError";
    this.verificationId = options?.verificationId;
    this.verdict = options?.verdict;
    this.confidence = options?.confidence;
    this.decision = options?.decision;
  }
};
var VerificationRejectedError = class extends VerificationError {
  content;
  reasoning;
  constructor(message, options) {
    super(message, {
      verificationId: options?.verificationId,
      verdict: options?.verdict,
      confidence: options?.confidence,
      decision: "reject"
    });
    this.name = "VerificationRejectedError";
    this.content = options?.content;
    this.reasoning = options?.reasoning;
  }
};

// src/callback.ts
var VerifyAICallbackHandler = class extends import_base.BaseCallbackHandler {
  name = "VerifyAICallbackHandler";
  client;
  methods;
  minConfidence;
  raiseOnReject;
  onVerification;
  skipEmpty;
  pollInterval;
  timeout;
  constructor(client, options) {
    super();
    this.client = client;
    this.methods = options?.methods ?? { reasoning: 1 };
    this.minConfidence = options?.minConfidence ?? 0.7;
    this.raiseOnReject = options?.raiseOnReject ?? false;
    this.onVerification = options?.onVerification;
    this.skipEmpty = options?.skipEmpty ?? true;
    this.pollInterval = options?.pollInterval ?? 1e3;
    this.timeout = options?.timeout ?? 6e4;
  }
  /**
   * Handle LLM completion - verify the output
   */
  async handleLLMEnd(output, runId, parentRunId, tags, extraParams) {
    for (const generations of output.generations) {
      for (const generation of generations) {
        const text = generation.text;
        if (!text || this.skipEmpty && !text.trim()) {
          continue;
        }
        try {
          const verifyResponse = await this.client.verifyAndWait(
            {
              content: text,
              methods: this.methods
            },
            {
              pollInterval: this.pollInterval,
              timeout: this.timeout
            }
          );
          const result = this.createResult(verifyResponse);
          if (!generation.generationInfo) {
            generation.generationInfo = {};
          }
          generation.generationInfo["verification"] = {
            id: result.verificationId,
            verdict: result.verdict,
            confidence: result.confidence,
            decision: result.decision,
            reasoning: result.reasoning,
            cached: result.cached
          };
          if (this.onVerification) {
            this.onVerification(text, result);
          }
          if (this.raiseOnReject && result.decision === "reject") {
            throw new VerificationRejectedError(
              `LLM output failed verification: ${result.reasoning}`,
              {
                verificationId: result.verificationId,
                verdict: result.verdict,
                confidence: result.confidence,
                content: text,
                reasoning: result.reasoning
              }
            );
          }
        } catch (error) {
          if (error instanceof VerificationRejectedError) {
            throw error;
          }
          if (!generation.generationInfo) {
            generation.generationInfo = {};
          }
          generation.generationInfo["verification"] = {
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
    }
  }
  /**
   * Create VerificationResult from API response
   */
  createResult(response) {
    return {
      verificationId: response.id,
      verdict: response.verdict,
      confidence: response.confidence,
      decision: response.decision,
      reasoning: response.reasoning,
      cached: response.cached ?? false
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VerificationError,
  VerificationRejectedError,
  VerifyAICallbackHandler
});
//# sourceMappingURL=index.js.map