/**
 * Tests for Verification Prompts
 * Tests for response parsing and prompt generation
 */

import { describe, it, expect } from 'vitest';
import {
  parseVerificationResponse,
  REASONING_SYSTEM_PROMPT,
  REASONING_USER_PROMPT,
  REASONING_CRITIQUE_SYSTEM_PROMPT,
  createReasoningCritiqueUserPrompt,
  BIPRM_SYSTEM_PROMPT,
  BIPRM_USER_PROMPT,
  BIPRM_L2R_SYSTEM_PROMPT,
  createBiPRML2RUserPrompt,
  BIPRM_R2L_SYSTEM_PROMPT,
  createBiPRMR2LUserPrompt,
  TOOL_SYSTEM_PROMPT,
  TOOL_USER_PROMPT,
  TOOL_CLOVE_SYSTEM_PROMPT,
  createToolCLoVEUserPrompt,
  ENSEMBLE_SYSTEM_PROMPT,
  ENSEMBLE_USER_PROMPT,
  META_JUDGE_SYSTEM_PROMPT,
  createMetaJudgeUserPrompt,
  ENTROPY_SYSTEM_PROMPT,
  ENTROPY_USER_PROMPT,
  LOGPROB_ENTROPY_SYSTEM_PROMPT,
  FORMAL_SYSTEM_PROMPT,
  FORMAL_USER_PROMPT,
} from './index';

// =============================================================================
// parseVerificationResponse TESTS
// =============================================================================

describe('parseVerificationResponse', () => {
  describe('valid JSON responses', () => {
    it('should parse valid true verdict', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: 0.95,
        reasoning: 'The claim is accurate based on evidence.',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
      expect(parsed.confidence).toBe(0.95);
      expect(parsed.reasoning).toBe('The claim is accurate based on evidence.');
    });

    it('should parse valid false verdict', () => {
      const response = JSON.stringify({
        verdict: 'false',
        confidence: 0.85,
        reasoning: 'The claim contains factual errors.',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('false');
      expect(parsed.confidence).toBe(0.85);
    });

    it('should parse valid uncertain verdict', () => {
      const response = JSON.stringify({
        verdict: 'uncertain',
        confidence: 0.5,
        reasoning: 'Cannot determine with available information.',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('uncertain');
      expect(parsed.confidence).toBe(0.5);
    });

    it('should extract JSON from mixed response', () => {
      const response = `Here is my analysis:

        {"verdict": "true", "confidence": 0.9, "reasoning": "Verified"}

        Additional notes...`;

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
      expect(parsed.confidence).toBe(0.9);
    });
  });

  describe('verdict normalization', () => {
    it('should normalize "yes" to "true"', () => {
      const response = JSON.stringify({
        verdict: 'yes',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should normalize "accurate" to "true"', () => {
      const response = JSON.stringify({
        verdict: 'accurate',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should normalize "correct" to "true"', () => {
      const response = JSON.stringify({
        verdict: 'correct',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should normalize "no" to "false"', () => {
      const response = JSON.stringify({
        verdict: 'no',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('false');
    });

    it('should normalize "inaccurate" to "false"', () => {
      const response = JSON.stringify({
        verdict: 'inaccurate',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('false');
    });

    it('should normalize "incorrect" to "false"', () => {
      const response = JSON.stringify({
        verdict: 'incorrect',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('false');
    });

    it('should handle case-insensitive verdicts', () => {
      const response = JSON.stringify({
        verdict: 'TRUE',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should default unknown verdicts to uncertain', () => {
      const response = JSON.stringify({
        verdict: 'maybe',
        confidence: 0.9,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('uncertain');
    });
  });

  describe('confidence normalization', () => {
    it('should clamp confidence > 1 to 1', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: 1.5,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.confidence).toBe(1);
    });

    it('should clamp confidence < 0 to 0', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: -0.5,
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.confidence).toBe(0);
    });

    it('should default missing confidence to 0.5', () => {
      const response = JSON.stringify({
        verdict: 'true',
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.confidence).toBe(0.5);
    });

    it('should default non-numeric confidence to 0.5', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: 'high',
        reasoning: 'Test',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.confidence).toBe(0.5);
    });
  });

  describe('reasoning extraction', () => {
    it('should extract reasoning field', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: 0.9,
        reasoning: 'Detailed analysis here.',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.reasoning).toBe('Detailed analysis here.');
    });

    it('should fall back to analysis field', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: 0.9,
        analysis: 'Analysis content.',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.reasoning).toBe('Analysis content.');
    });

    it('should fall back to explanation field', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: 0.9,
        explanation: 'Explanation content.',
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.reasoning).toBe('Explanation content.');
    });

    it('should provide default when no reasoning found', () => {
      const response = JSON.stringify({
        verdict: 'true',
        confidence: 0.9,
      });

      const parsed = parseVerificationResponse(response);

      expect(parsed.reasoning).toBe('No reasoning provided');
    });
  });

  describe('fallback text parsing', () => {
    it('should detect true from text content', () => {
      const response = 'After analysis, the verdict: true based on evidence.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should detect false from text content', () => {
      const response = 'The claim verdict: false as it contains errors.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('false');
    });

    it('should detect true from "is accurate"', () => {
      const response = 'This statement is accurate and well-supported.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should detect true from "is correct"', () => {
      const response = 'The claim is correct based on available data.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should detect false from "is inaccurate"', () => {
      const response = 'This statement is inaccurate.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('false');
    });

    it('should detect false from "is incorrect"', () => {
      const response = 'The claim is incorrect.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('false');
    });

    it('should detect verdict from quoted strings', () => {
      const response = 'Based on my analysis, I conclude "true".';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
    });

    it('should default to uncertain for ambiguous text', () => {
      const response = 'This is a complex claim with multiple factors.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('uncertain');
    });

    it('should use default confidence for text fallback', () => {
      const response = 'verdict: true - the claim is valid.';

      const parsed = parseVerificationResponse(response);

      expect(parsed.confidence).toBe(0.5);
    });

    it('should truncate long responses for reasoning', () => {
      const longResponse = 'x'.repeat(1000);

      const parsed = parseVerificationResponse(longResponse);

      expect(parsed.reasoning.length).toBeLessThanOrEqual(500);
    });
  });

  describe('malformed JSON handling', () => {
    it('should handle incomplete JSON', () => {
      const response = '{"verdict": "true", "confidence": 0.9';

      const parsed = parseVerificationResponse(response);

      // Should fall back to text parsing
      expect(parsed.verdict).toBe('true');
    });

    it('should handle JSON with trailing content', () => {
      const response = '{"verdict": "true", "confidence": 0.9, "reasoning": "Test"} extra stuff';

      const parsed = parseVerificationResponse(response);

      expect(parsed.verdict).toBe('true');
      expect(parsed.confidence).toBe(0.9);
    });
  });
});

// =============================================================================
// PROMPT TEMPLATE TESTS
// =============================================================================

describe('Prompt Templates', () => {
  describe('REASONING prompts', () => {
    it('should define system prompt', () => {
      expect(REASONING_SYSTEM_PROMPT).toBeDefined();
      expect(REASONING_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it('should include JSON format instruction', () => {
      expect(REASONING_SYSTEM_PROMPT).toContain('JSON');
    });

    it('should include verdict options', () => {
      expect(REASONING_SYSTEM_PROMPT).toContain('true');
      expect(REASONING_SYSTEM_PROMPT).toContain('false');
      expect(REASONING_SYSTEM_PROMPT).toContain('uncertain');
    });

    it('should generate user prompt with content', () => {
      const prompt = REASONING_USER_PROMPT('Test claim', {});

      expect(prompt).toContain('Test claim');
    });

    it('should include context when provided', () => {
      const prompt = REASONING_USER_PROMPT('Test claim', { source: 'test' });

      expect(prompt).toContain('source');
    });

    it('should handle empty context', () => {
      const prompt = REASONING_USER_PROMPT('Test claim', {});

      expect(prompt).toContain('Test claim');
    });
  });

  describe('BIPRM prompts', () => {
    it('should define system prompt', () => {
      expect(BIPRM_SYSTEM_PROMPT).toBeDefined();
      expect(BIPRM_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it('should mention forward reasoning', () => {
      expect(BIPRM_SYSTEM_PROMPT.toLowerCase()).toContain('forward');
    });

    it('should mention reasoning steps', () => {
      expect(BIPRM_SYSTEM_PROMPT.toLowerCase()).toContain('steps');
      expect(BIPRM_SYSTEM_PROMPT.toLowerCase()).toContain('valid');
    });

    it('should generate user prompt with content', () => {
      const prompt = BIPRM_USER_PROMPT('Test claim', {});

      expect(prompt).toContain('Test claim');
    });
  });

  describe('TOOL prompts', () => {
    it('should define system prompt', () => {
      expect(TOOL_SYSTEM_PROMPT).toBeDefined();
    });

    it('should mention source verification', () => {
      expect(TOOL_SYSTEM_PROMPT.toLowerCase()).toContain('source');
    });

    it('should generate user prompt with search results', () => {
      const prompt = TOOL_USER_PROMPT('Test claim', 'Search result 1\nSearch result 2', {});

      expect(prompt).toContain('Test claim');
      expect(prompt).toContain('Search result 1');
    });
  });

  describe('ENSEMBLE prompts', () => {
    it('should define system prompt', () => {
      expect(ENSEMBLE_SYSTEM_PROMPT).toBeDefined();
    });

    it('should generate user prompt with content', () => {
      const prompt = ENSEMBLE_USER_PROMPT('Test claim', {});

      expect(prompt).toContain('Test claim');
    });
  });

  describe('ENTROPY prompts', () => {
    it('should define system prompt', () => {
      expect(ENTROPY_SYSTEM_PROMPT).toBeDefined();
    });

    it('should mention verdict classification', () => {
      expect(ENTROPY_SYSTEM_PROMPT.toLowerCase()).toContain('verdict');
      expect(ENTROPY_SYSTEM_PROMPT.toLowerCase()).toContain('classify');
    });

    it('should request JSON with verdicts array', () => {
      expect(ENTROPY_SYSTEM_PROMPT).toContain('verdicts');
      expect(ENTROPY_SYSTEM_PROMPT).toContain('JSON');
    });

    it('should generate user prompt with claim and responses', () => {
      const prompt = ENTROPY_USER_PROMPT('Test claim', ['Response 1', 'Response 2']);

      expect(prompt).toContain('Test claim');
      expect(prompt).toContain('Response 1');
      expect(prompt).toContain('Response 2');
    });

    it('should number responses in user prompt', () => {
      const prompt = ENTROPY_USER_PROMPT('Claim', ['A', 'B', 'C']);

      expect(prompt).toContain('response_1');
      expect(prompt).toContain('response_2');
      expect(prompt).toContain('response_3');
    });
  });

  describe('FORMAL prompts', () => {
    it('should define system prompt', () => {
      expect(FORMAL_SYSTEM_PROMPT).toBeDefined();
    });

    it('should mention formal verification', () => {
      expect(FORMAL_SYSTEM_PROMPT.toLowerCase()).toContain('formal');
    });

    it('should mention proof', () => {
      expect(FORMAL_SYSTEM_PROMPT.toLowerCase()).toContain('proof');
    });

    it('should generate user prompt with content', () => {
      const prompt = FORMAL_USER_PROMPT('Test claim', {});

      expect(prompt).toContain('Test claim');
    });
  });

  // =========================================================================
  // NEW SOTA PROMPTS
  // =========================================================================

  describe('REASONING CRITIQUE prompts (TTT)', () => {
    it('should define critique system prompt', () => {
      expect(REASONING_CRITIQUE_SYSTEM_PROMPT).toBeDefined();
      expect(REASONING_CRITIQUE_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it('should mention critique and bias', () => {
      expect(REASONING_CRITIQUE_SYSTEM_PROMPT.toLowerCase()).toContain('critique');
      expect(REASONING_CRITIQUE_SYSTEM_PROMPT.toLowerCase()).toContain('bias');
    });

    it('should generate critique user prompt with content and analysis', () => {
      const prompt = createReasoningCritiqueUserPrompt(
        'Test claim',
        'Previous analysis here',
        { source: 'test' }
      );

      expect(prompt).toContain('Test claim');
      expect(prompt).toContain('Previous analysis here');
    });
  });

  describe('BIPRM L2R/R2L prompts', () => {
    it('should define L2R system prompt', () => {
      expect(BIPRM_L2R_SYSTEM_PROMPT).toBeDefined();
      expect(BIPRM_L2R_SYSTEM_PROMPT.toLowerCase()).toContain('forward');
    });

    it('should define R2L system prompt', () => {
      expect(BIPRM_R2L_SYSTEM_PROMPT).toBeDefined();
      expect(BIPRM_R2L_SYSTEM_PROMPT.toLowerCase()).toContain('backward');
    });

    it('should request step-level JSON from L2R', () => {
      expect(BIPRM_L2R_SYSTEM_PROMPT).toContain('steps');
      expect(BIPRM_L2R_SYSTEM_PROMPT).toContain('valid');
    });

    it('should request step-level JSON from R2L', () => {
      expect(BIPRM_R2L_SYSTEM_PROMPT).toContain('steps');
      expect(BIPRM_R2L_SYSTEM_PROMPT).toContain('valid');
    });

    it('should generate L2R user prompt', () => {
      const prompt = createBiPRML2RUserPrompt('Test claim', {});
      expect(prompt).toContain('Test claim');
      expect(prompt).toContain('FORWARD');
    });

    it('should generate R2L user prompt', () => {
      const prompt = createBiPRMR2LUserPrompt('Test claim', {});
      expect(prompt).toContain('Test claim');
      expect(prompt).toContain('BACKWARD');
    });

    it('should maintain backward compatibility with BIPRM_SYSTEM_PROMPT', () => {
      expect(BIPRM_SYSTEM_PROMPT).toBe(BIPRM_L2R_SYSTEM_PROMPT);
    });
  });

  describe('TOOL CLoVE prompts', () => {
    it('should define CLoVE system prompt', () => {
      expect(TOOL_CLOVE_SYSTEM_PROMPT).toBeDefined();
      expect(TOOL_CLOVE_SYSTEM_PROMPT.toLowerCase()).toContain('contrastive');
    });

    it('should request per-source independence', () => {
      expect(TOOL_CLOVE_SYSTEM_PROMPT).toContain('independent');
      expect(TOOL_CLOVE_SYSTEM_PROMPT).toContain('sources');
    });

    it('should generate CLoVE user prompt', () => {
      const prompt = createToolCLoVEUserPrompt('Test claim', 'Search results here', {});
      expect(prompt).toContain('Test claim');
      expect(prompt).toContain('Search results here');
      expect(prompt).toContain('FALSE');
    });

    it('should maintain backward compatibility with TOOL_SYSTEM_PROMPT', () => {
      expect(TOOL_SYSTEM_PROMPT).toBe(TOOL_CLOVE_SYSTEM_PROMPT);
    });
  });

  describe('META-JUDGE prompts', () => {
    it('should define meta-judge system prompt', () => {
      expect(META_JUDGE_SYSTEM_PROMPT).toBeDefined();
      expect(META_JUDGE_SYSTEM_PROMPT.toLowerCase()).toContain('meta-judge');
    });

    it('should mention bias detection', () => {
      expect(META_JUDGE_SYSTEM_PROMPT.toLowerCase()).toContain('verbosity bias');
      expect(META_JUDGE_SYSTEM_PROMPT.toLowerCase()).toContain('agreement bias');
    });

    it('should generate meta-judge user prompt', () => {
      const prompt = createMetaJudgeUserPrompt(
        'Test claim',
        [
          { member: { provider: 'openai', model: 'gpt-4o' }, verdict: 'true', confidence: 0.9, reasoning: 'Analysis 1' },
          { member: { provider: 'anthropic', model: 'claude' }, verdict: 'false', confidence: 0.8, reasoning: 'Analysis 2' },
        ],
        'factual'
      );

      expect(prompt).toContain('Test claim');
      expect(prompt).toContain('openai');
      expect(prompt).toContain('anthropic');
      expect(prompt).toContain('factual');
    });
  });

  describe('LOGPROB ENTROPY prompt', () => {
    it('should define logprob entropy system prompt', () => {
      expect(LOGPROB_ENTROPY_SYSTEM_PROMPT).toBeDefined();
    });

    it('should request verdict in JSON', () => {
      expect(LOGPROB_ENTROPY_SYSTEM_PROMPT).toContain('verdict');
      expect(LOGPROB_ENTROPY_SYSTEM_PROMPT).toContain('JSON');
    });
  });

  describe('ENTROPY prompts with clustering', () => {
    it('should mention clustering in system prompt', () => {
      expect(ENTROPY_SYSTEM_PROMPT.toLowerCase()).toContain('cluster');
    });

    it('should request clusters array in JSON', () => {
      expect(ENTROPY_SYSTEM_PROMPT).toContain('clusters');
    });
  });
});
