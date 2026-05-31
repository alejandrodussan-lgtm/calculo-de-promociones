/**
 * POST /api/reputation/analyze
 *
 * Analyzes a hotel review using Claude and returns an AIReviewAnalysis JSON object.
 * Set ANTHROPIC_API_KEY in Vercel environment variables.
 *
 * Request body: Review object (src/types/reputation.ts)
 * Response: { ok: boolean; analysis?: AIReviewAnalysis; error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeReview } from '../../../../lib/reputation/services/aiReviewResponseService';
import type { Review } from '../../../../types/reputation';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 503 }
    );
  }

  let review: Review;
  try {
    review = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }

  if (!review?.id || !review?.source) {
    return NextResponse.json({ ok: false, error: 'review.id and review.source are required.' }, { status: 400 });
  }

  const result = await analyzeReview(review, apiKey);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
