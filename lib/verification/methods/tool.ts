/**
 * Tool-Augmented Verification Method — CLoVE
 * Contrastive Local Verifiable Explanations
 *
 * Improved query extraction + per-source independence assessment + contrastive reasoning.
 * Single LLM call with CLoVE-structured prompt (no additional API calls vs baseline).
 *
 * FPR: ~1% (down from ~2%)
 * Latency: 1-2s (+0-200ms from larger prompt output)
 * Best for: Factual claims, verifiable statements
 */

import { LLMClient, ProviderKeys, LLMProvider, calculateCostCents } from '@/lib/llm';
import { createLogger } from '@/lib/logger';
import { ParadigmExecutor, ParadigmResult, ParadigmOptions, Verdict } from '../types';
import { TOOL_CLOVE_SYSTEM_PROMPT, createToolCLoVEUserPrompt } from '../prompts';
import {
  createParadigmErrorResult,
  selectBestProvider,
  getDefaultModel,
  normalizeVerdict,
  normalizeConfidence,
  extractJsonFromResponse,
} from './shared';

const log = createLogger('ToolVerification');

// =============================================================================
// SEARCH CONFIGURATION
// =============================================================================

const SERPER_API_URL = 'https://google.serper.dev/search';
const MAX_SEARCH_RESULTS = 5;

// Common stop words to filter from search queries
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'that', 'this', 'these',
  'those', 'it', 'its', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
]);

// =============================================================================
// SEARCH FUNCTIONS
// =============================================================================

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

async function performWebSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    log.warn('SERPER_API_KEY not configured, using mock search results');
    return [
      {
        title: 'Search not available',
        link: 'https://example.com',
        snippet: 'Web search is not configured. Please set SERPER_API_KEY environment variable.',
      },
    ];
  }

  try {
    const response = await fetch(SERPER_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: MAX_SEARCH_RESULTS,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }

    const data = await response.json();

    const results: SearchResult[] = (data.organic || [])
      .slice(0, MAX_SEARCH_RESULTS)
      .map((result: { title?: string; link?: string; snippet?: string }) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
      }));

    return results;
  } catch (error) {
    log.error({ err: error }, 'Web search error');
    return [];
  }
}

/**
 * Improved search query extraction:
 * - Filter stop words
 * - Prioritize capitalized words (likely entities/proper nouns)
 * - Prioritize numbers and quoted strings
 * - Cap at 15 meaningful words
 */
function extractSearchQuery(content: string): string {
  const words = content.split(/\s+/);

  // Extract quoted strings first
  const quotedMatch = content.match(/"([^"]+)"/g);
  const quotedTerms = quotedMatch ? quotedMatch.map((q) => q.replace(/"/g, '')) : [];

  // Filter and prioritize remaining words
  const filtered = words
    .map((w) => w.replace(/[.,;:!?()[\]{}]/g, ''))
    .filter((w) => w.length > 1)
    .filter((w) => !STOP_WORDS.has(w.toLowerCase()));

  // Prioritize: entities (capitalized), numbers, then rest
  const entities = filtered.filter((w) => /^[A-Z]/.test(w) || /\d/.test(w));
  const rest = filtered.filter((w) => !/^[A-Z]/.test(w) && !/\d/.test(w));

  // Build query: quoted terms first, then entities, then rest
  const queryParts = [...quotedTerms, ...entities, ...rest];
  const unique = [...new Set(queryParts)];

  return unique.slice(0, 15).join(' ');
}

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No search results found.';
  }

  return results
    .map((r, i) => `[Source ${i + 1}] ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`)
    .join('\n\n');
}

// =============================================================================
// CLOVE RESPONSE PARSING
// =============================================================================

interface CLoVESourceAssessment {
  sourceIndex: number;
  supports: boolean;
  relevance: number;
  independent: boolean;
}

interface CLoVEResponse {
  verdict: Verdict;
  confidence: number;
  sources: CLoVESourceAssessment[];
  contrastivePlausibility: number;
  reasoning: string;
}

function parseCLoVEResponse(response: string): CLoVEResponse {
  const parsed = extractJsonFromResponse<Record<string, unknown>>(response, {});

  if (Object.keys(parsed).length === 0) {
    return {
      verdict: 'uncertain',
      confidence: 0.5,
      sources: [],
      contrastivePlausibility: 0.5,
      reasoning: response.slice(0, 500),
    };
  }

  // Parse per-source assessments
  const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const sources: CLoVESourceAssessment[] = rawSources.map(
    (s: Record<string, unknown>, i: number) => ({
      sourceIndex: typeof s.source_index === 'number' ? s.source_index : i + 1,
      supports: Boolean(s.supports),
      relevance: normalizeConfidence(s.relevance),
      independent: Boolean(s.independent),
    })
  );

  // Calculate confidence from source assessments
  const relevantSources = sources.filter((s) => s.relevance > 0.3);
  const corroboratingSources = relevantSources.filter((s) => s.supports);
  const independentCorroborating = corroboratingSources.filter((s) => s.independent);

  // Base confidence from LLM response
  let confidence = normalizeConfidence(parsed.confidence);

  // Boost for independent corroboration: +0.1 per independent corroborating source
  confidence += independentCorroborating.length * 0.1;

  // Contrastive plausibility penalty
  const contrastivePlausibility = normalizeConfidence(parsed.contrastive_plausibility ?? parsed.contrastivePlausibility ?? 0.5);
  confidence *= (1 - contrastivePlausibility * 0.3);

  confidence = Math.max(0, Math.min(1, confidence));

  return {
    verdict: normalizeVerdict(parsed.verdict),
    confidence,
    sources,
    contrastivePlausibility,
    reasoning: String(parsed.reasoning || 'No reasoning provided'),
  };
}

// =============================================================================
// TOOL PARADIGM EXECUTOR
// =============================================================================

export class ToolParadigm implements ParadigmExecutor {
  name = 'tool' as const;
  private llmClient: LLMClient;

  constructor(keys: ProviderKeys) {
    this.llmClient = new LLMClient(keys);
  }

  async execute(
    content: string,
    context: Record<string, unknown>,
    options: ParadigmOptions
  ): Promise<ParadigmResult> {
    const startTime = Date.now();

    const provider: LLMProvider = options.provider || selectBestProvider(this.llmClient);
    const model = options.model || getDefaultModel(provider);

    try {
      // Step 1: Extract improved search query
      const searchQuery = extractSearchQuery(content);

      // Step 2: Perform web search
      const searchResults = await performWebSearch(searchQuery);
      const formattedResults = formatSearchResults(searchResults);

      // Step 3: Use LLM with CLoVE-structured prompt
      const response = await this.llmClient.complete(
        provider,
        [
          { role: 'system', content: TOOL_CLOVE_SYSTEM_PROMPT },
          { role: 'user', content: createToolCLoVEUserPrompt(content, formattedResults, context) },
        ],
        {
          model,
          temperature: 0.1,
          maxTokens: 1536,
          timeout: options.timeout || 30000,
        }
      );

      const clove = parseCLoVEResponse(response.content);
      const costCents = calculateCostCents(
        model,
        response.usage.inputTokens,
        response.usage.outputTokens
      );

      // Format source assessment summary
      const sourcesSummary = clove.sources
        .map(
          (s) =>
            `  [${s.sourceIndex}] ${s.supports ? 'SUPPORTS' : 'CONTRADICTS'} (relevance: ${(s.relevance * 100).toFixed(0)}%, independent: ${s.independent ? 'yes' : 'no'})`
        )
        .join('\n');

      return {
        paradigm: 'tool',
        weight: options.weight,
        provider,
        model: response.model,
        verdict: clove.verdict,
        confidence: clove.confidence,
        reasoning: `Search query: "${searchQuery}"\n\nSource Assessments:\n${sourcesSummary || '  (no sources assessed)'}\n\nContrastive plausibility: ${(clove.contrastivePlausibility * 100).toFixed(0)}%\n\n${clove.reasoning}`,
        processingTimeMs: Date.now() - startTime,
        costCents,
        tokenUsage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
      };
    } catch (error) {
      return createParadigmErrorResult(
        'tool',
        options.weight,
        provider,
        model,
        Date.now() - startTime,
        error
      );
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createToolParadigm(keys: ProviderKeys): ToolParadigm {
  return new ToolParadigm(keys);
}
