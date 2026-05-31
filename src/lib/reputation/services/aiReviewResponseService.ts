/**
 * aiReviewResponseService.ts
 *
 * AI-powered review analysis and response generation service.
 * Uses the Anthropic Claude API (server-side only) to:
 *   - Detect language
 *   - Classify sentiment
 *   - Identify topics and responsible department
 *   - Assess reputational risk
 *   - Generate a professional response in GEH Suites brand voice
 *
 * Set ANTHROPIC_API_KEY in Vercel environment variables (never on the frontend).
 */

import type {
  Review,
  AIReviewAnalysis,
  ReviewSentiment,
  ReviewLanguage,
  HotelDepartment,
  ReputationRiskLevel,
} from '../../../types/reputation';

// ── GEH Suites brand voice guidelines ────────────────────────────────────────

const GEH_BRAND_VOICE = `
You are the Guest Relations Manager of GEH Suites Hotels — a premium boutique hotel brand
in Mexico. When writing responses to guest reviews, follow these brand voice principles:

TONE: Warm, professional, grateful, and solution-oriented. Never defensive.
LANGUAGE: Match the language of the original review exactly.
LENGTH: 80–200 words for positive reviews. 120–280 words for negative reviews.
STRUCTURE:
  1. Greet the guest by name.
  2. Thank them sincerely for their review.
  3. For positive points: acknowledge and reinforce the compliment.
  4. For negative points: apologize genuinely, explain if applicable, state the corrective action.
  5. Invite the guest to return or to contact you directly.
  6. Sign off with the hotel name.

ALWAYS:
- Be specific to the review content (never generic templates).
- Show empathy and ownership for any shortcomings.
- Mention the specific hotel name if provided.
- Maintain a human tone — not robotic or formulaic.

NEVER:
- Be dismissive or argue with the guest.
- Offer discounts or compensation in the public response.
- Share internal operational details.
- Use excessive superlatives.
`.trim();

// ── Analysis prompt ───────────────────────────────────────────────────────────

function buildAnalysisPrompt(review: Review): string {
  const content = [
    review.title ? `Title: ${review.title}` : null,
    review.positiveComment ? `Positive: ${review.positiveComment}` : null,
    review.negativeComment ? `Negative: ${review.negativeComment}` : null,
    review.comment && !review.positiveComment && !review.negativeComment
      ? `Comment: ${review.comment}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `
Analyze the following hotel guest review and return a JSON object with the exact schema below.
Hotel: ${review.hotelId}
Rating: ${review.rating}/10

REVIEW CONTENT:
${content || '(Score only — no written comment)'}

SCHEMA:
{
  "detectedLanguage": "ISO 639-1 code (es/en/fr/de/pt/it/nl/...)",
  "sentiment": "positive | neutral | negative | critical",
  "sentimentScore": number between -1.0 (very negative) and 1.0 (very positive),
  "riskLevel": "low | medium | high | critical",
  "mainTopic": "string — primary topic (e.g. 'Habitación', 'Limpieza', 'Servicio', 'Ubicación', 'Desayuno')",
  "secondaryTopics": ["array of additional topics mentioned"],
  "department": "front_desk | housekeeping | food_beverage | maintenance | management | spa | concierge | general",
  "keyPhrases": ["important phrases from the review"],
  "compliments": ["specific positive aspects mentioned"],
  "complaints": ["specific negative aspects mentioned"],
  "suggestions": ["improvements suggested by the guest"],
  "urgencyScore": number 0–10 (10 = needs immediate response),
  "responseRecommended": boolean,
  "generatedResponse": "professional response in the detected language following GEH Suites brand voice"
}

BRAND VOICE GUIDELINES:
${GEH_BRAND_VOICE}

Return ONLY the JSON object, no markdown, no explanation.
`.trim();
}

// ── Anthropic API call ────────────────────────────────────────────────────────

interface AnthropicMessage {
  id: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data: AnthropicMessage = await res.json();
  const text = data.content.find(c => c.type === 'text')?.text ?? '';
  return text;
}

// ── Main analysis function ────────────────────────────────────────────────────

export interface AIAnalysisResult {
  ok: boolean;
  analysis?: AIReviewAnalysis;
  error?: string;
}

/**
 * Analyzes a review and generates a professional response using Claude.
 * Must be called from a Next.js API route — requires ANTHROPIC_API_KEY.
 */
export async function analyzeReview(
  review: Review,
  apiKey: string
): Promise<AIAnalysisResult> {
  if (!apiKey) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.' };
  }

  const hasContent = !!(review.comment || review.positiveComment || review.negativeComment || review.title);

  // Score-only reviews get a minimal analysis without generating a response
  if (!hasContent) {
    const analysis: AIReviewAnalysis = {
      analysisId: `ai_${Date.now()}`,
      reviewId: review.id,
      analyzedAt: new Date().toISOString(),
      model: 'rule-based',
      detectedLanguage: 'es',
      sentiment: scoreToSentiment(review.rating),
      sentimentScore: (review.rating - 5) / 5,
      riskLevel: review.rating <= 4 ? 'medium' : 'low',
      mainTopic: 'General',
      secondaryTopics: [],
      department: 'general',
      keyPhrases: [],
      compliments: [],
      complaints: [],
      suggestions: [],
      urgencyScore: review.rating <= 4 ? 5 : 1,
      responseRecommended: false,
      generatedResponse: '',
    };
    return { ok: true, analysis };
  }

  try {
    const prompt = buildAnalysisPrompt(review);
    const raw = await callClaude(prompt, apiKey);

    // Strip markdown fences if Claude wrapped the JSON
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    const analysis: AIReviewAnalysis = {
      analysisId: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      reviewId: review.id,
      analyzedAt: new Date().toISOString(),
      model: 'claude-sonnet-4-6',
      detectedLanguage: parsed.detectedLanguage as ReviewLanguage,
      sentiment: parsed.sentiment as ReviewSentiment,
      sentimentScore: Number(parsed.sentimentScore),
      riskLevel: parsed.riskLevel as ReputationRiskLevel,
      mainTopic: parsed.mainTopic,
      secondaryTopics: parsed.secondaryTopics ?? [],
      department: parsed.department as HotelDepartment,
      keyPhrases: parsed.keyPhrases ?? [],
      compliments: parsed.compliments ?? [],
      complaints: parsed.complaints ?? [],
      suggestions: parsed.suggestions ?? [],
      urgencyScore: Number(parsed.urgencyScore),
      responseRecommended: Boolean(parsed.responseRecommended),
      generatedResponse: parsed.generatedResponse ?? '',
    };

    return { ok: true, analysis };
  } catch (e) {
    return { ok: false, error: `Analysis failed: ${String(e)}` };
  }
}

// ── Batch analysis ────────────────────────────────────────────────────────────

export interface BatchAnalysisResult {
  succeeded: Array<{ reviewId: string; analysis: AIReviewAnalysis }>;
  failed: Array<{ reviewId: string; error: string }>;
}

/**
 * Analyzes multiple reviews with a configurable concurrency limit.
 */
export async function analyzeReviewsBatch(
  reviews: Review[],
  apiKey: string,
  concurrency = 3
): Promise<BatchAnalysisResult> {
  const results: BatchAnalysisResult = { succeeded: [], failed: [] };
  const queue = [...reviews];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const settled = await Promise.allSettled(
      batch.map(r => analyzeReview(r, apiKey))
    );

    settled.forEach((result, i) => {
      const review = batch[i];
      if (result.status === 'fulfilled' && result.value.ok && result.value.analysis) {
        results.succeeded.push({ reviewId: review.id, analysis: result.value.analysis });
      } else {
        const error = result.status === 'rejected'
          ? String(result.reason)
          : result.value.error ?? 'Unknown error';
        results.failed.push({ reviewId: review.id, error });
      }
    });
  }

  return results;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function scoreToSentiment(rating: number): ReviewSentiment {
  if (rating >= 8) return 'positive';
  if (rating >= 6) return 'neutral';
  if (rating >= 4) return 'negative';
  return 'critical';
}

export { scoreToSentiment };
