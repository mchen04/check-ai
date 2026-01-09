import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShoveCallbackHandler } from '../src/callback';
import { VerificationError, VerificationRejectedError } from '../src/errors';
import type { LLMResult } from '@langchain/core/outputs';

// Mock Shove client type
interface MockShove {
  verifyAndWait: ReturnType<typeof vi.fn>;
}

describe('ShoveCallbackHandler', () => {
  let mockClient: MockShove;

  beforeEach(() => {
    mockClient = {
      verifyAndWait: vi.fn(),
    };
  });

  // ===========================================================================
  // CONSTRUCTOR TESTS
  // ===========================================================================

  describe('constructor', () => {
    it('should create handler with default options', () => {
      const handler = new ShoveCallbackHandler(mockClient as any);
      expect(handler).toBeDefined();
      expect(handler.name).toBe('ShoveCallbackHandler');
    });

    it('should accept custom options', () => {
      const onVerification = vi.fn();
      const handler = new ShoveCallbackHandler(mockClient as any, {
        methods: { reasoning: 1.0, tool: 0.5 },
        minConfidence: 0.9,
        raiseOnReject: true,
        onVerification,
        skipEmpty: false,
        pollInterval: 2000,
        timeout: 120000,
      });
      expect(handler).toBeDefined();
    });
  });

  // ===========================================================================
  // HANDLELLMEND TESTS
  // ===========================================================================

  describe('handleLLMEnd', () => {
    it('should verify LLM output', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        reasoning: 'Content verified as accurate',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        methods: { reasoning: 1.0 },
      });

      const output: LLMResult = {
        generations: [[{ text: 'Paris is the capital of France.', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(mockClient.verifyAndWait).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Paris is the capital of France.',
          methods: { reasoning: 1.0 },
        }),
        expect.objectContaining({
          pollInterval: 1000,
          timeout: 60000,
        })
      );

      expect(output.generations[0][0].generationInfo?.verification).toEqual({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        reasoning: 'Content verified as accurate',
        cached: false,
      });
    });

    it('should use custom methods', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        methods: { reasoning: 1.0, tool: 0.5, biprm: 0.3 },
      });

      const output: LLMResult = {
        generations: [[{ text: 'Test content', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(mockClient.verifyAndWait).toHaveBeenCalledWith(
        expect.objectContaining({
          methods: { reasoning: 1.0, tool: 0.5, biprm: 0.3 },
        }),
        expect.any(Object)
      );
    });

    it('should skip empty responses by default', async () => {
      const handler = new ShoveCallbackHandler(mockClient as any);

      const output: LLMResult = {
        generations: [[{ text: '', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(mockClient.verifyAndWait).not.toHaveBeenCalled();
    });

    it('should skip whitespace-only responses by default', async () => {
      const handler = new ShoveCallbackHandler(mockClient as any);

      const output: LLMResult = {
        generations: [[{ text: '   \n\t  ', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(mockClient.verifyAndWait).not.toHaveBeenCalled();
    });

    it('should verify empty responses when skipEmpty is false', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'uncertain',
        confidence: 0.5,
        decision: 'escalate',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        skipEmpty: false,
      });

      const output: LLMResult = {
        generations: [[{ text: '   ', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(mockClient.verifyAndWait).toHaveBeenCalled();
    });

    it('should handle multiple generations', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any);

      const output: LLMResult = {
        generations: [
          [
            { text: 'First response', generationInfo: {} },
            { text: 'Second response', generationInfo: {} },
          ],
        ],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(mockClient.verifyAndWait).toHaveBeenCalledTimes(2);
    });

    it('should handle null generationInfo', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any);

      const generation = { text: 'Test content' };
      const output: LLMResult = {
        generations: [[generation as any]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect((generation as any).generationInfo.verification).toBeDefined();
    });
  });

  // ===========================================================================
  // ONVERIFICATION CALLBACK TESTS
  // ===========================================================================

  describe('onVerification callback', () => {
    it('should call onVerification with content and result', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        reasoning: 'Content is accurate',
        cached: true,
      });

      const onVerification = vi.fn();
      const handler = new ShoveCallbackHandler(mockClient as any, {
        onVerification,
      });

      const output: LLMResult = {
        generations: [[{ text: 'Test content', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(onVerification).toHaveBeenCalledWith('Test content', {
        verificationId: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        reasoning: 'Content is accurate',
        cached: true,
      });
    });

    it('should call onVerification for each generation', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        cached: false,
      });

      const onVerification = vi.fn();
      const handler = new ShoveCallbackHandler(mockClient as any, {
        onVerification,
      });

      const output: LLMResult = {
        generations: [
          [
            { text: 'First', generationInfo: {} },
            { text: 'Second', generationInfo: {} },
          ],
        ],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(onVerification).toHaveBeenCalledTimes(2);
      expect(onVerification).toHaveBeenNthCalledWith(1, 'First', expect.any(Object));
      expect(onVerification).toHaveBeenNthCalledWith(2, 'Second', expect.any(Object));
    });
  });

  // ===========================================================================
  // RAISE ON REJECT TESTS
  // ===========================================================================

  describe('raiseOnReject', () => {
    it('should not throw when raiseOnReject is false', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'false',
        confidence: 0.1,
        decision: 'reject',
        reasoning: 'Content is false',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        raiseOnReject: false,
      });

      const output: LLMResult = {
        generations: [[{ text: 'False claim', generationInfo: {} }]],
        llmOutput: {},
      };

      await expect(handler.handleLLMEnd(output, 'run_123')).resolves.not.toThrow();
    });

    it('should throw VerificationRejectedError when raiseOnReject is true', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'false',
        confidence: 0.1,
        decision: 'reject',
        reasoning: 'Content is demonstrably false',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        raiseOnReject: true,
      });

      const output: LLMResult = {
        generations: [[{ text: 'False claim about science', generationInfo: {} }]],
        llmOutput: {},
      };

      await expect(handler.handleLLMEnd(output, 'run_123')).rejects.toThrow(
        VerificationRejectedError
      );
    });

    it('should include details in VerificationRejectedError', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_456',
        verdict: 'false',
        confidence: 0.05,
        decision: 'reject',
        reasoning: 'This is factually incorrect',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        raiseOnReject: true,
      });

      const output: LLMResult = {
        generations: [[{ text: 'The Earth is flat.', generationInfo: {} }]],
        llmOutput: {},
      };

      try {
        await handler.handleLLMEnd(output, 'run_123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VerificationRejectedError);
        const rejectedError = error as VerificationRejectedError;
        expect(rejectedError.verificationId).toBe('ver_456');
        expect(rejectedError.verdict).toBe('false');
        expect(rejectedError.confidence).toBe(0.05);
        expect(rejectedError.content).toBe('The Earth is flat.');
        expect(rejectedError.reasoning).toBe('This is factually incorrect');
      }
    });

    it('should not throw for non-reject decisions', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'uncertain',
        confidence: 0.5,
        decision: 'escalate',
        reasoning: 'Needs human review',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        raiseOnReject: true,
      });

      const output: LLMResult = {
        generations: [[{ text: 'Uncertain claim', generationInfo: {} }]],
        llmOutput: {},
      };

      await expect(handler.handleLLMEnd(output, 'run_123')).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('error handling', () => {
    it('should catch verification errors and attach to generationInfo', async () => {
      mockClient.verifyAndWait.mockRejectedValue(new Error('API Error'));

      const handler = new ShoveCallbackHandler(mockClient as any);

      const output: LLMResult = {
        generations: [[{ text: 'Test content', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(output.generations[0][0].generationInfo?.verification).toEqual({
        error: 'API Error',
      });
    });

    it('should re-throw VerificationRejectedError', async () => {
      const rejectedError = new VerificationRejectedError('Rejected', {
        verificationId: 'ver_123',
        verdict: 'false',
        confidence: 0.1,
      });
      mockClient.verifyAndWait.mockRejectedValue(rejectedError);

      const handler = new ShoveCallbackHandler(mockClient as any, {
        raiseOnReject: true,
      });

      const output: LLMResult = {
        generations: [[{ text: 'Test', generationInfo: {} }]],
        llmOutput: {},
      };

      await expect(handler.handleLLMEnd(output, 'run_123')).rejects.toThrow(
        VerificationRejectedError
      );
    });

    it('should handle unknown error types', async () => {
      mockClient.verifyAndWait.mockRejectedValue('string error');

      const handler = new ShoveCallbackHandler(mockClient as any);

      const output: LLMResult = {
        generations: [[{ text: 'Test content', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(output.generations[0][0].generationInfo?.verification).toEqual({
        error: 'Unknown error',
      });
    });
  });

  // ===========================================================================
  // CUSTOM POLLING OPTIONS TESTS
  // ===========================================================================

  describe('custom polling options', () => {
    it('should use custom pollInterval and timeout', async () => {
      mockClient.verifyAndWait.mockResolvedValue({
        id: 'ver_123',
        verdict: 'true',
        confidence: 0.95,
        decision: 'accept',
        cached: false,
      });

      const handler = new ShoveCallbackHandler(mockClient as any, {
        pollInterval: 5000,
        timeout: 300000,
      });

      const output: LLMResult = {
        generations: [[{ text: 'Test content', generationInfo: {} }]],
        llmOutput: {},
      };

      await handler.handleLLMEnd(output, 'run_123');

      expect(mockClient.verifyAndWait).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pollInterval: 5000,
          timeout: 300000,
        })
      );
    });
  });
});

// ===========================================================================
// ERROR CLASS TESTS
// ===========================================================================

describe('VerificationError', () => {
  it('should create error with message', () => {
    const error = new VerificationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('VerificationError');
  });

  it('should include verification details', () => {
    const error = new VerificationError('Test error', {
      verificationId: 'ver_123',
      verdict: 'false',
      confidence: 0.1,
      decision: 'reject',
    });
    expect(error.verificationId).toBe('ver_123');
    expect(error.verdict).toBe('false');
    expect(error.confidence).toBe(0.1);
    expect(error.decision).toBe('reject');
  });
});

describe('VerificationRejectedError', () => {
  it('should extend VerificationError', () => {
    const error = new VerificationRejectedError('Rejected');
    expect(error).toBeInstanceOf(VerificationError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should have decision set to reject', () => {
    const error = new VerificationRejectedError('Rejected');
    expect(error.decision).toBe('reject');
    expect(error.name).toBe('VerificationRejectedError');
  });

  it('should include content and reasoning', () => {
    const error = new VerificationRejectedError('Rejected', {
      verificationId: 'ver_123',
      content: 'False content',
      reasoning: 'Content is inaccurate',
    });
    expect(error.content).toBe('False content');
    expect(error.reasoning).toBe('Content is inaccurate');
  });
});
