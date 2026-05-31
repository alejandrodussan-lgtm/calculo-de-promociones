/**
 * tripadvisorManualConnector.ts
 *
 * Manual connector for TripAdvisor reviews.
 *
 * DESIGN DECISION: TripAdvisor's API requires partnership approval and is
 * strictly regulated. Scraping or automated extraction is prohibited by their
 * Terms of Service. This connector uses a manual Excel/CSV import flow:
 *
 *   1. Staff exports reviews from the TripAdvisor management portal manually.
 *   2. The file is imported here — reviews are parsed and stored.
 *   3. AI generates a response ready to copy-paste into TripAdvisor.
 *   4. Staff pastes the response on TripAdvisor and marks it as published here.
 *
 * No scraping. No unauthorized automation. Full audit trail.
 */

import type { Review, ReviewImportRow, ReviewLanguage } from '../../../types/reputation';

// ── Expected Excel/CSV columns ────────────────────────────────────────────────

export const TRIPADVISOR_IMPORT_COLUMNS = [
  'reviewer_name',       // required
  'rating',              // required — numeric 1–5
  'title',               // optional
  'comment',             // optional but strongly recommended
  'review_date',         // required — YYYY-MM-DD or DD/MM/YYYY
  'language',            // optional — es/en/fr/...
  'review_url',          // optional — TripAdvisor link to the review
  'hotel',               // optional — hotel name/id
] as const;

export type TripAdvisorImportColumn = typeof TRIPADVISOR_IMPORT_COLUMNS[number];

export interface TripAdvisorImportRow {
  reviewer_name: string;
  rating: string | number;
  title?: string;
  comment?: string;
  review_date: string;
  language?: string;
  review_url?: string;
  hotel?: string;
}

export interface ImportResult {
  imported: Review[];
  skipped: Array<{ row: number; reason: string; data: TripAdvisorImportRow }>;
  total: number;
}

// ── Date parsing ──────────────────────────────────────────────────────────────

function parseReviewDate(raw: string): string | null {
  if (!raw) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw).toISOString();

  // DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`).toISOString();

  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return new Date(raw).toISOString();

  // Try native Date parse as fallback
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeRating5to10(rating: number): number {
  return Math.round(Math.min(5, Math.max(1, rating)) * 2);
}

// ── Parse and validate import rows ───────────────────────────────────────────

/**
 * Converts raw Excel/CSV rows into internal Review objects.
 * Rows with missing required fields are collected in `skipped`.
 */
export function parseImportRows(
  rows: TripAdvisorImportRow[],
  defaultHotelId: string,
  importedFromFile: string
): ImportResult {
  const imported: Review[] = [];
  const skipped: ImportResult['skipped'] = [];
  const now = new Date().toISOString();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header row

    if (!row.reviewer_name?.toString().trim()) {
      skipped.push({ row: rowNum, reason: 'reviewer_name is required', data: row });
      return;
    }

    const ratingNum = Number(row.rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      skipped.push({ row: rowNum, reason: 'rating must be a number between 1 and 5', data: row });
      return;
    }

    const reviewDate = parseReviewDate(String(row.review_date));
    if (!reviewDate) {
      skipped.push({ row: rowNum, reason: `Cannot parse review_date: "${row.review_date}"`, data: row });
      return;
    }

    const review: Review = {
      id: `ta_import_${Date.now()}_${idx}`,
      source: 'tripadvisor',
      externalId: undefined,
      hotelId: row.hotel?.toString().trim() || defaultHotelId,
      authorName: row.reviewer_name.toString().trim(),
      rating: normalizeRating5to10(ratingNum),
      title: row.title?.toString().trim() || undefined,
      comment: row.comment?.toString().trim() || undefined,
      language: (row.language?.toString().trim() || 'es') as ReviewLanguage,
      reviewDate,
      publishedAt: reviewDate,
      sourceUrl: row.review_url?.toString().trim() || undefined,
      status: 'pending_response',
      importedFromFile,
      createdAt: now,
      updatedAt: now,
      manuallyMarkedPublished: false,
    };

    imported.push(review);
  });

  return { imported, skipped, total: rows.length };
}

// ── Mark response as published ────────────────────────────────────────────────

/**
 * Returns an updated review object with the response marked as manually published.
 * The actual publishing happens on TripAdvisor's website by the staff member.
 */
export function markResponsePublished(
  review: Review,
  publishedBy: string,
  responseText: string
): Review {
  const now = new Date().toISOString();
  return {
    ...review,
    responseText,
    responsePublishedAt: now,
    responsePublishedBy: publishedBy,
    status: 'response_published',
    manuallyMarkedPublished: true,
    updatedAt: now,
  };
}

// ── Copy-paste response helper ────────────────────────────────────────────────

export interface CopyReadyResponse {
  reviewId: string;
  authorName: string;
  reviewUrl?: string;
  responseText: string;
  steps: string[];
}

/**
 * Formats a response for manual copy-paste into TripAdvisor.
 * Returns a structured object the UI uses to guide the staff member.
 */
export function buildCopyReadyResponse(review: Review, responseText: string): CopyReadyResponse {
  const steps = [
    `1. Ir a la reseña de ${review.authorName} en TripAdvisor${review.sourceUrl ? ` (${review.sourceUrl})` : ''}`,
    '2. Hacer clic en "Responder a esta reseña"',
    '3. Copiar el texto de respuesta generado y pegarlo en el campo de texto',
    '4. Revisar que el texto esté correcto y hacer clic en "Publicar respuesta"',
    '5. Volver aquí y marcar la reseña como "Respuesta publicada"',
  ];

  return {
    reviewId: review.id,
    authorName: review.authorName,
    reviewUrl: review.sourceUrl,
    responseText,
    steps,
  };
}

// ── Template for Excel export (import template) ───────────────────────────────

export const TRIPADVISOR_TEMPLATE_HEADERS: TripAdvisorImportColumn[] = [
  'reviewer_name',
  'rating',
  'title',
  'comment',
  'review_date',
  'language',
  'review_url',
  'hotel',
];

export const TRIPADVISOR_TEMPLATE_EXAMPLE: TripAdvisorImportRow[] = [
  {
    reviewer_name: 'María García',
    rating: 4,
    title: 'Excelente estadía',
    comment: 'El servicio fue muy bueno y las habitaciones estaban limpias.',
    review_date: '2025-05-15',
    language: 'es',
    review_url: 'https://www.tripadvisor.com/ShowUserReviews-...',
    hotel: 'GEH Suites Centro',
  },
];
