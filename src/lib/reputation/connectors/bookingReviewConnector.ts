/**
 * bookingReviewConnector.ts
 *
 * Connector for Booking.com Guest Review API.
 *
 * STATUS: Ready for activation — requires Booking.com partner credentials.
 * Set the following in Vercel environment variables (never on the frontend):
 *   BOOKING_MACHINE_ACCOUNT_ID
 *   BOOKING_API_KEY
 *
 * Authentication: HTTP Basic Auth (machine account ID + API key).
 * All API calls must be made server-side (Next.js API routes).
 *
 * API reference: https://developers.booking.com/demand/docs/guest-reviews
 *
 * IMPORTANT: Booking.com allows replies ONLY to reviews that contain a written comment.
 * Reviews with a score but no text cannot receive a reply (enforced below).
 */

import type { Review, BookingCredentials, BookingProperty, ReviewLanguage } from '../../../types/reputation';

const BOOKING_API_BASE = 'https://partner-api.booking.com/connectivity/v1';

// ── Booking.com API types ─────────────────────────────────────────────────────

export interface BookingReview {
  id: string;
  property_id: number;
  author: { name: string; country_code?: string };
  average_score: number;             // 1–10
  title?: string;
  liked?: string;                    // positive comment
  disliked?: string;                 // negative comment
  supplier_response?: {
    response: string;
    response_date: string;
  };
  review_date: string;               // ISO
  language?: string;                 // BCP 47
  moderation_status?: 'approved' | 'rejected' | 'pending';
  review_url?: string;
}

export interface BookingReviewsResponse {
  result: BookingReview[];
  count: number;
  next_page?: string;
}

export interface BookingReplyRequest {
  response: string;
}

export interface ConnectorResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ── Auth helper ───────────────────────────────────────────────────────────────

function buildBasicAuthHeader(credentials: BookingCredentials): string {
  const encoded = Buffer.from(
    `${credentials.machineAccountId}:${credentials.apiKey}`
  ).toString('base64');
  return `Basic ${encoded}`;
}

// ── Read reviews ──────────────────────────────────────────────────────────────

/**
 * Lists all reviews for a property. Handles cursor-based pagination.
 */
export async function listReviewsByProperty(
  credentials: BookingCredentials,
  property: BookingProperty,
  options: { pageSize?: number; maxPages?: number; afterDate?: string } = {}
): Promise<ConnectorResult<BookingReview[]>> {
  const { pageSize = 100, maxPages = 20, afterDate } = options;

  const allReviews: BookingReview[] = [];
  let nextPage: string | undefined;
  let page = 0;

  do {
    const url = nextPage
      ? nextPage
      : buildListUrl(property.propertyId, pageSize, afterDate);

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: buildBasicAuthHeader(credentials),
          Accept: 'application/json',
          'X-Booking-Context': credentials.environment === 'sandbox' ? 'test' : 'prod',
        },
      });

      if (res.status === 401) {
        return { ok: false, error: 'Invalid credentials. Check BOOKING_MACHINE_ACCOUNT_ID and BOOKING_API_KEY.', statusCode: 401 };
      }
      if (res.status === 403) {
        return { ok: false, error: 'Access denied. Ensure your account has access to this property.', statusCode: 403 };
      }
      if (res.status === 404) {
        return { ok: false, error: `Property ${property.propertyId} not found.`, statusCode: 404 };
      }
      if (!res.ok) {
        return { ok: false, error: `Booking.com API error ${res.status}`, statusCode: res.status };
      }

      const body: BookingReviewsResponse = await res.json();
      allReviews.push(...body.result);
      nextPage = body.next_page;
      page++;
    } catch (e) {
      return { ok: false, error: `Network error: ${String(e)}` };
    }
  } while (nextPage && page < maxPages);

  return { ok: true, data: allReviews };
}

function buildListUrl(propertyId: string, pageSize: number, afterDate?: string): string {
  const url = new URL(`${BOOKING_API_BASE}/properties/${propertyId}/reviews`);
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('sort', 'review_date:desc');
  if (afterDate) url.searchParams.set('after_date', afterDate);
  return url.toString();
}

/**
 * Fetches a single review by ID.
 */
export async function getReviewById(
  credentials: BookingCredentials,
  property: BookingProperty,
  reviewId: string
): Promise<ConnectorResult<BookingReview>> {
  try {
    const res = await fetch(
      `${BOOKING_API_BASE}/properties/${property.propertyId}/reviews/${reviewId}`,
      {
        headers: {
          Authorization: buildBasicAuthHeader(credentials),
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) return { ok: false, error: `Booking.com API error ${res.status}`, statusCode: res.status };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Post reply ────────────────────────────────────────────────────────────────

/**
 * Sends a reply to a Booking.com guest review.
 *
 * BOOKING.COM POLICY: Replies are only allowed for reviews that contain a
 * written comment (liked or disliked field). Score-only reviews CANNOT receive
 * a reply. This check is enforced before the API call.
 */
export async function replyToReview(
  credentials: BookingCredentials,
  property: BookingProperty,
  review: BookingReview,
  replyText: string
): Promise<ConnectorResult<{ success: boolean }>> {
  // Enforce Booking.com policy: no reply to score-only reviews
  const hasWrittenComment = !!(review.liked?.trim() || review.disliked?.trim());
  if (!hasWrittenComment) {
    return {
      ok: false,
      error:
        'Booking.com policy: replies are only allowed for reviews that contain a written comment. This review has a score only and cannot be replied to.',
    };
  }

  if (!replyText.trim()) {
    return { ok: false, error: 'Reply text cannot be empty.' };
  }
  if (replyText.length > 3000) {
    return { ok: false, error: 'Reply text exceeds the 3000-character limit.' };
  }

  if (review.moderation_status === 'pending') {
    return { ok: false, error: 'Review is pending moderation. Wait until it is approved before replying.' };
  }
  if (review.moderation_status === 'rejected') {
    return { ok: false, error: 'Review was rejected by Booking.com moderation and cannot receive a reply.' };
  }

  try {
    const res = await fetch(
      `${BOOKING_API_BASE}/properties/${property.propertyId}/reviews/${review.id}/response`,
      {
        method: 'POST',
        headers: {
          Authorization: buildBasicAuthHeader(credentials),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ response: replyText } satisfies BookingReplyRequest),
      }
    );

    if (res.status === 409) {
      return { ok: false, error: 'A reply already exists for this review. Use the update endpoint instead.', statusCode: 409 };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.message ?? `Booking.com API error ${res.status}`, statusCode: res.status };
    }
    return { ok: true, data: { success: true } };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Normalize Booking review to internal Review type ─────────────────────────

export function normalizeBookingReview(
  raw: BookingReview,
  property: BookingProperty
): Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
  const hasComment = !!(raw.liked?.trim() || raw.disliked?.trim());

  return {
    source: 'booking',
    externalId: raw.id,
    hotelId: property.hotelId,
    propertyId: String(raw.property_id),
    authorName: raw.author.name,
    authorCountry: raw.author.country_code,
    rating: raw.average_score,              // already 0–10
    title: raw.title,
    positiveComment: raw.liked,
    negativeComment: raw.disliked,
    comment: [raw.liked, raw.disliked].filter(Boolean).join('\n\n'),
    language: (raw.language ?? 'es') as ReviewLanguage,
    reviewDate: raw.review_date,
    publishedAt: raw.review_date,
    responseText: raw.supplier_response?.response,
    responsePublishedAt: raw.supplier_response?.response_date,
    sourceUrl: raw.review_url,
    // Mark score-only reviews so the UI can disable the reply button
    tags: hasComment ? [] : ['score_only_no_reply_allowed'],
  };
}

// ── Moderation status helpers ─────────────────────────────────────────────────

export function canReplyToBookingReview(review: BookingReview): { canReply: boolean; reason?: string } {
  if (review.moderation_status === 'pending') {
    return { canReply: false, reason: 'Pending moderation' };
  }
  if (review.moderation_status === 'rejected') {
    return { canReply: false, reason: 'Rejected by moderation' };
  }
  const hasComment = !!(review.liked?.trim() || review.disliked?.trim());
  if (!hasComment) {
    return { canReply: false, reason: 'Score-only review — Booking.com policy does not allow replies' };
  }
  return { canReply: true };
}
