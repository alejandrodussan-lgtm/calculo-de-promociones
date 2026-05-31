/**
 * reviewDatabaseService.ts
 *
 * Persistence layer for the Reputación module.
 * Current implementation: localStorage (same pattern as the rest of the app).
 * Architecture is designed to drop in a real backend (Supabase, PostgreSQL) with
 * minimal changes — replace the storage helpers and keep all the business logic intact.
 */

import type {
  Review,
  AIReviewAnalysis,
  ReviewChangeLogEntry,
  ReputationModuleState,
  ReviewStatus,
  ReviewSource,
} from '../../../types/reputation';

const STORAGE_KEY = 'rmd_reputation';
const MAX_CHANGELOG_ENTRIES = 5000;

// ── State helpers ─────────────────────────────────────────────────────────────

function readState(): ReputationModuleState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return JSON.parse(raw) as ReputationModuleState;
  } catch {
    return emptyState();
  }
}

function writeState(state: ReputationModuleState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emptyState(): ReputationModuleState {
  return {
    reviews: [],
    alerts: [],
    changeLog: [],
    connectorStatus: {
      google_business: 'disconnected',
      booking: 'disconnected',
      tripadvisor: 'manual',
      manual: 'connected',
    },
  };
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export function getAllReviews(): Review[] {
  return readState().reviews;
}

export function getReviewById(id: string): Review | undefined {
  return readState().reviews.find(r => r.id === id);
}

export function getReviewsByHotel(hotelId: string): Review[] {
  return readState().reviews.filter(r => r.hotelId === hotelId);
}

export function getReviewsBySource(source: ReviewSource): Review[] {
  return readState().reviews.filter(r => r.source === source);
}

export function getReviewsByStatus(status: ReviewStatus): Review[] {
  return readState().reviews.filter(r => r.status === status);
}

/**
 * Upserts a review: inserts if new, updates if externalId or id already exists.
 * Returns the final review object.
 */
export function upsertReview(review: Review, changedBy: string): Review {
  const state = readState();
  const now = new Date().toISOString();

  const existingIdx = state.reviews.findIndex(
    r => r.id === review.id ||
         (r.externalId && r.externalId === review.externalId && r.source === review.source)
  );

  if (existingIdx >= 0) {
    const existing = state.reviews[existingIdx];
    const updated: Review = { ...existing, ...review, updatedAt: now };

    // Log field-level changes for the audit trail
    const tracked: (keyof Review)[] = ['status', 'responseText', 'responseDraft', 'responsePublishedAt', 'internalNotes', 'tags'];
    tracked.forEach(field => {
      const prev = String(existing[field] ?? '');
      const next = String(updated[field] ?? '');
      if (prev !== next) {
        appendChangeLog(state, {
          id: `cl_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          reviewId: updated.id,
          field,
          previousValue: prev || null,
          newValue: next || null,
          changedAt: now,
          changedBy,
        });
      }
    });

    state.reviews[existingIdx] = updated;
    writeState(state);
    return updated;
  }

  const inserted: Review = { ...review, createdAt: now, updatedAt: now };
  state.reviews.unshift(inserted);
  writeState(state);
  return inserted;
}

/**
 * Bulk-inserts reviews from an import without overwriting existing ones.
 * Returns counts of inserted vs skipped duplicates.
 */
export function bulkImportReviews(
  reviews: Review[],
  changedBy: string
): { inserted: number; skipped: number } {
  let inserted = 0;
  let skipped = 0;

  for (const r of reviews) {
    const existing = readState().reviews.find(
      ex => ex.id === r.id ||
            (ex.externalId && ex.externalId === r.externalId && ex.source === r.source)
    );
    if (existing) { skipped++; continue; }
    upsertReview(r, changedBy);
    inserted++;
  }

  return { inserted, skipped };
}

export function deleteReview(id: string): boolean {
  const state = readState();
  const before = state.reviews.length;
  state.reviews = state.reviews.filter(r => r.id !== id);
  writeState(state);
  return state.reviews.length < before;
}

// ── AI Analysis ───────────────────────────────────────────────────────────────

/**
 * Attaches an AI analysis to a review and updates derived fields.
 */
export function saveAIAnalysis(reviewId: string, analysis: AIReviewAnalysis, changedBy: string): Review | null {
  const review = getReviewById(reviewId);
  if (!review) return null;

  const updated: Review = {
    ...review,
    aiAnalysis: analysis,
    sentiment: analysis.sentiment,
    riskLevel: analysis.riskLevel,
    mainTopic: analysis.mainTopic,
    secondaryTopics: analysis.secondaryTopics,
    department: analysis.department,
    language: analysis.detectedLanguage,
    responseDraft: analysis.generatedResponse || review.responseDraft,
    status: analysis.responseRecommended && review.status === 'pending_response'
      ? 'response_draft'
      : review.status,
  };

  return upsertReview(updated, changedBy);
}

// ── Response management ───────────────────────────────────────────────────────

export function saveDraftResponse(reviewId: string, draft: string, changedBy: string): Review | null {
  const review = getReviewById(reviewId);
  if (!review) return null;
  return upsertReview({
    ...review,
    responseDraft: draft,
    status: 'response_draft',
  }, changedBy);
}

export function markResponsePublished(
  reviewId: string,
  responseText: string,
  publishedBy: string
): Review | null {
  const review = getReviewById(reviewId);
  if (!review) return null;
  return upsertReview({
    ...review,
    responseText,
    responseDraft: undefined,
    responsePublishedAt: new Date().toISOString(),
    responsePublishedBy: publishedBy,
    status: 'response_published',
    manuallyMarkedPublished: true,
  }, publishedBy);
}

// ── Change log ────────────────────────────────────────────────────────────────

function appendChangeLog(state: ReputationModuleState, entry: ReviewChangeLogEntry): void {
  state.changeLog.unshift(entry);
  if (state.changeLog.length > MAX_CHANGELOG_ENTRIES) {
    state.changeLog.splice(MAX_CHANGELOG_ENTRIES);
  }
}

export function getChangeLog(reviewId?: string): ReviewChangeLogEntry[] {
  const log = readState().changeLog;
  return reviewId ? log.filter(e => e.reviewId === reviewId) : log;
}

// ── Connector status ──────────────────────────────────────────────────────────

export function setConnectorStatus(
  source: ReviewSource,
  status: ReputationModuleState['connectorStatus'][ReviewSource]
): void {
  const state = readState();
  state.connectorStatus[source] = status;
  writeState(state);
}

export function getConnectorStatus(): ReputationModuleState['connectorStatus'] {
  return readState().connectorStatus;
}

export function recordSync(source: ReviewSource): void {
  const state = readState();
  if (!state.lastSyncedAt) state.lastSyncedAt = {};
  state.lastSyncedAt[source] = new Date().toISOString();
  writeState(state);
}

// ── Statistics ────────────────────────────────────────────────────────────────

export interface ReputationStats {
  total: number;
  bySource: Record<ReviewSource, number>;
  byStatus: Record<ReviewStatus, number>;
  averageRating: number;
  pendingResponse: number;
  criticalRisk: number;
  responseRate: number;
}

export function computeStats(hotelId?: string): ReputationStats {
  const all = hotelId ? getReviewsByHotel(hotelId) : getAllReviews();

  const bySource = {} as Record<ReviewSource, number>;
  const byStatus = {} as Record<ReviewStatus, number>;
  let ratingSum = 0;
  let responded = 0;

  for (const r of all) {
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    ratingSum += r.rating;
    if (r.status === 'response_published') responded++;
  }

  return {
    total: all.length,
    bySource,
    byStatus,
    averageRating: all.length ? Math.round((ratingSum / all.length) * 10) / 10 : 0,
    pendingResponse: byStatus['pending_response'] ?? 0,
    criticalRisk: all.filter(r => r.riskLevel === 'critical').length,
    responseRate: all.length ? Math.round((responded / all.length) * 100) : 0,
  };
}
