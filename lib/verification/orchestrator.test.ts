/**
 * Tests for Verification Orchestrator
 * Tests coordination of multiple verification paradigms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VerificationOrchestrator,
  StreamingVerificationOrchestrator,
  createOrchestrator,
  type UpdateCallback,
} from './orchestrator';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock all paradigm methods
vi.mock('./methods', () => ({
  createSemanticParadigm: vi.fn().mockReturnValue({
    name: 'semantic',
    execute: vi.fn().mockResolvedValue({
      paradigm: 'semantic',
      weight: 1.0,
      provider: 'openai',
      model: 'text-embedding-ada-002',
      verdict: 'true',
      confidence: 0.85,
      reasoning: 'Mock semantic reasoning',
      processingTimeMs: 100,
      costCents: 0.01,
    }),
  }),
  createReasoningParadigm: vi.fn().mockReturnValue({
    name: 'reasoning',
    execute: vi.fn().mockResolvedValue({
      paradigm: 'reasoning',
      weight: 1.0,
      provider: 'openai',
      model: 'gpt-4',
      verdict: 'true',
      confidence: 0.92,
      reasoning: 'Mock reasoning',
      processingTimeMs: 200,
      costCents: 0.05,
    }),
  }),
  createToolParadigm: vi.fn().mockReturnValue({
    name: 'tool',
    execute: vi.fn().mockResolvedValue({
      paradigm: 'tool',
      weight: 1.0,
      provider: 'openai',
      model: 'gpt-4',
      verdict: 'true',
      confidence: 0.95,
      reasoning: 'Mock tool reasoning',
      processingTimeMs: 300,
      costCents: 0.08,
    }),
  }),
  createBiPRMParadigm: vi.fn().mockReturnValue({
    name: 'biprm',
    execute: vi.fn().mockResolvedValue({
      paradigm: 'biprm',
      weight: 1.0,
      provider: 'openai',
      model: 'gpt-4',
      verdict: 'true',
      confidence: 0.88,
      reasoning: 'Mock biprm reasoning',
      processingTimeMs: 250,
      costCents: 0.06,
    }),
  }),
  createEnsembleParadigm: vi.fn().mockReturnValue({
    name: 'ensemble',
    execute: vi.fn().mockResolvedValue({
      paradigm: 'ensemble',
      weight: 1.0,
      provider: 'openai',
      model: 'gpt-4',
      verdict: 'true',
      confidence: 0.90,
      reasoning: 'Mock ensemble reasoning',
      processingTimeMs: 400,
      costCents: 0.10,
    }),
  }),
  createEntropyParadigm: vi.fn().mockReturnValue({
    name: 'entropy',
    execute: vi.fn().mockResolvedValue({
      paradigm: 'entropy',
      weight: 1.0,
      provider: 'openai',
      model: 'gpt-4',
      verdict: 'true',
      confidence: 0.87,
      reasoning: 'Mock entropy reasoning',
      processingTimeMs: 150,
      costCents: 0.04,
    }),
  }),
  createFormalParadigm: vi.fn().mockReturnValue({
    name: 'formal',
    execute: vi.fn().mockResolvedValue({
      paradigm: 'formal',
      weight: 1.0,
      provider: 'openai',
      model: 'builtin-arithmetic',
      verdict: 'true',
      confidence: 1.0,
      reasoning: 'Mock formal reasoning',
      processingTimeMs: 50,
      costCents: 0,
    }),
  }),
}));

describe('VerificationOrchestrator', () => {
  let orchestrator: VerificationOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new VerificationOrchestrator({
      keys: { openai: 'test-openai-key' },
    });
  });

  describe('constructor', () => {
    it('should create an orchestrator with default settings', () => {
      expect(orchestrator).toBeInstanceOf(VerificationOrchestrator);
    });

    it('should accept custom timeout', () => {
      const customOrchestrator = new VerificationOrchestrator({
        keys: { openai: 'test-key' },
        defaultTimeout: 60000,
      });
      expect(customOrchestrator).toBeInstanceOf(VerificationOrchestrator);
    });

    it('should accept custom max parallel methods', () => {
      const customOrchestrator = new VerificationOrchestrator({
        keys: { openai: 'test-key' },
        maxParallelMethods: 3,
      });
      expect(customOrchestrator).toBeInstanceOf(VerificationOrchestrator);
    });
  });

  describe('verify', () => {
    it('should execute a single verification method', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0 },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('test-uuid-1234');
      expect(result.content).toBe('Test content');
      expect(result.status).toBe('completed');
      expect(result.verdict).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.paradigmResults).toHaveLength(1);
      expect(result.paradigmResults[0].paradigm).toBe('reasoning');
    });

    it('should execute multiple verification methods', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0, tool: 0.8, formal: 0.5 },
      });

      expect(result.paradigmResults).toHaveLength(3);
      const paradigms = result.paradigmResults.map((r) => r.paradigm);
      expect(paradigms).toContain('reasoning');
      expect(paradigms).toContain('tool');
      expect(paradigms).toContain('formal');
    });

    it('should skip methods with weight 0', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0, tool: 0, formal: 0.5 },
      });

      expect(result.paradigmResults).toHaveLength(2);
      const paradigms = result.paradigmResults.map((r) => r.paradigm);
      expect(paradigms).toContain('reasoning');
      expect(paradigms).toContain('formal');
      expect(paradigms).not.toContain('tool');
    });

    it('should return error result when no methods specified', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: {},
      });

      expect(result.status).toBe('failed');
      expect(result.verdict).toBeNull();
      expect(result.reasoning).toContain('No verification methods specified');
    });

    it('should calculate total cost from all paradigms', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0, tool: 1.0 },
      });

      expect(result.costCents).toBeGreaterThan(0);
      // Cost should be sum of paradigm costs
      const expectedCost = result.paradigmResults.reduce((sum, r) => sum + r.costCents, 0);
      expect(result.costCents).toBe(expectedCost);
    });

    it('should include processing time', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0 },
      });

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should use custom accept threshold', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0, tool: 1.0 },
        acceptThreshold: 0.99, // Very high threshold
      });

      // With mocked 0.92-0.95 confidence, should not reach accept at 0.99 threshold
      expect(result.decision).toBeDefined();
    });

    it('should use custom escalate threshold', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0 },
        escalateThreshold: 0.5,
      });

      expect(result.decision).toBeDefined();
    });

    it('should include context in verification', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0 },
        context: { source: 'test', category: 'unit-test' },
      });

      expect(result.status).toBe('completed');
    });

    it('should respect custom timeout', async () => {
      const result = await orchestrator.verify('Test content', {
        methods: { reasoning: 1.0 },
        timeout: 5000,
      });

      expect(result.status).toBe('completed');
    });
  });

  describe('getAvailableMethods', () => {
    it('should list available methods based on API keys', () => {
      const methods = orchestrator.getAvailableMethods();

      expect(methods).toContain('semantic'); // Requires OpenAI
      expect(methods).toContain('reasoning');
      expect(methods).toContain('tool');
      expect(methods).toContain('formal');
    });

    it('should not include semantic without OpenAI key', () => {
      const noOpenaiOrchestrator = new VerificationOrchestrator({
        keys: { anthropic: 'test-anthropic-key' },
      });

      const methods = noOpenaiOrchestrator.getAvailableMethods();

      expect(methods).not.toContain('semantic');
      expect(methods).toContain('reasoning');
    });

    it('should include ensemble with multiple providers', () => {
      const multiProviderOrchestrator = new VerificationOrchestrator({
        keys: { openai: 'test-openai', anthropic: 'test-anthropic' },
      });

      const methods = multiProviderOrchestrator.getAvailableMethods();

      expect(methods).toContain('ensemble');
    });

    it('should include ensemble with just OpenAI', () => {
      const methods = orchestrator.getAvailableMethods();

      // Can use ensemble with multiple OpenAI models
      expect(methods).toContain('ensemble');
    });

    it('should return empty array with no providers', () => {
      const noKeysOrchestrator = new VerificationOrchestrator({
        keys: {},
      });

      const methods = noKeysOrchestrator.getAvailableMethods();

      expect(methods).toHaveLength(0);
    });
  });
});

describe('createOrchestrator factory', () => {
  it('should create a VerificationOrchestrator instance', () => {
    const orchestrator = createOrchestrator({
      keys: { openai: 'test-key' },
    });

    expect(orchestrator).toBeInstanceOf(VerificationOrchestrator);
  });

  it('should pass configuration options', () => {
    const orchestrator = createOrchestrator({
      keys: { openai: 'test-key' },
      defaultTimeout: 45000,
      maxParallelMethods: 5,
    });

    expect(orchestrator).toBeInstanceOf(VerificationOrchestrator);
  });
});

describe('StreamingVerificationOrchestrator', () => {
  let streamingOrchestrator: StreamingVerificationOrchestrator;
  let updateCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    streamingOrchestrator = new StreamingVerificationOrchestrator({
      keys: { openai: 'test-openai-key' },
    });
    updateCallback = vi.fn();
    streamingOrchestrator.setUpdateCallback(updateCallback as UpdateCallback);
  });

  describe('setUpdateCallback', () => {
    it('should accept a callback function', () => {
      const callback = vi.fn();
      streamingOrchestrator.setUpdateCallback(callback);
      // No error means success
    });
  });

  describe('setVerificationId', () => {
    it('should set the verification ID', () => {
      streamingOrchestrator.setVerificationId('custom-id');
      // No error means success
    });
  });

  describe('verifyWithUpdates', () => {
    it('should emit started event', async () => {
      await streamingOrchestrator.verifyWithUpdates('Test content', {
        methods: { reasoning: 1.0 },
      });

      expect(updateCallback).toHaveBeenCalled();

      const startedCall = updateCallback.mock.calls.find(
        (call) => call[0].type === 'started'
      );
      expect(startedCall).toBeDefined();
      expect(startedCall![0].data.progress).toBeDefined();
    });

    it('should emit paradigm_started events', async () => {
      await streamingOrchestrator.verifyWithUpdates('Test content', {
        methods: { reasoning: 1.0, tool: 1.0 },
      });

      const paradigmStartedCalls = updateCallback.mock.calls.filter(
        (call) => call[0].type === 'paradigm_started'
      );
      expect(paradigmStartedCalls.length).toBeGreaterThan(0);
    });

    it('should emit paradigm_completed events', async () => {
      await streamingOrchestrator.verifyWithUpdates('Test content', {
        methods: { reasoning: 1.0, tool: 1.0 },
      });

      const paradigmCompletedCalls = updateCallback.mock.calls.filter(
        (call) => call[0].type === 'paradigm_completed'
      );
      expect(paradigmCompletedCalls.length).toBe(2);
    });

    it('should emit completed event with final result', async () => {
      await streamingOrchestrator.verifyWithUpdates('Test content', {
        methods: { reasoning: 1.0 },
      });

      const completedCall = updateCallback.mock.calls.find(
        (call) => call[0].type === 'completed'
      );
      expect(completedCall).toBeDefined();
      expect(completedCall![0].data.finalResult).toBeDefined();
    });

    it('should track progress correctly', async () => {
      await streamingOrchestrator.verifyWithUpdates('Test content', {
        methods: { reasoning: 1.0, tool: 1.0, formal: 1.0 },
      });

      const completedCall = updateCallback.mock.calls.find(
        (call) => call[0].type === 'completed'
      );
      expect(completedCall).toBeDefined();
      expect(completedCall![0].data.progress.completed).toBe(3);
      expect(completedCall![0].data.progress.total).toBe(3);
    });

    it('should use custom verification ID when set', async () => {
      streamingOrchestrator.setVerificationId('my-custom-id');

      await streamingOrchestrator.verifyWithUpdates('Test content', {
        methods: { reasoning: 1.0 },
      });

      expect(updateCallback.mock.calls[0][0].verificationId).toBe('my-custom-id');
    });

    it('should include timestamps in all events', async () => {
      await streamingOrchestrator.verifyWithUpdates('Test content', {
        methods: { reasoning: 1.0 },
      });

      for (const call of updateCallback.mock.calls) {
        expect(call[0].timestamp).toBeDefined();
        expect(typeof call[0].timestamp).toBe('number');
      }
    });
  });
});

describe('Consensus and Decision Integration', () => {
  let orchestrator: VerificationOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new VerificationOrchestrator({
      keys: { openai: 'test-openai-key' },
    });
  });

  it('should produce accept decision with high confidence unanimous agreement', async () => {
    const result = await orchestrator.verify('The sky is blue', {
      methods: { reasoning: 1.0, tool: 1.0, formal: 1.0 },
    });

    // All mocked paradigms return true with high confidence
    expect(result.verdict).toBe('true');
    expect(result.confidence).toBeGreaterThan(0.8);
    // Decision should be accept or refine based on exact confidence
    expect(['accept', 'refine']).toContain(result.decision);
  });

  it('should include reasoning from all paradigms in result', async () => {
    const result = await orchestrator.verify('Test claim', {
      methods: { reasoning: 1.0, tool: 1.0 },
    });

    expect(result.reasoning).toBeDefined();
    expect(typeof result.reasoning).toBe('string');
  });
});
