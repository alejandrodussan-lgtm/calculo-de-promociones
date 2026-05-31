/**
 * googleBusinessReviewConnector.ts
 *
 * Connector for Google Business Profile (formerly Google My Business) Reviews API.
 *
 * STATUS: Ready for activation — requires OAuth 2.0 credentials.
 * Set the following in Vercel environment variables (never on the frontend):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URI
 *
 * API reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews
 *
 * OAuth flow must run server-side (Next.js API routes) to protect the client secret.
 */

import type {
  Review,
  GoogleBusinessCredentials,
  GoogleBusinessLocation,
  ReviewLanguage,
  ReviewStatus,
} from '../../../types/reputation';

const GBP_API_BASE = 'https://mybusinessreviews.googleapis.com/v1';

export interface GBPReview {
  name: string;                   // accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
  reviewId: string;
  reviewer: { profilePhotoUrl?: string; displayName: string; isAnonymous?: boolean };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

export interface GBPReviewsResponse {
  reviews?: GBPReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

export interface GBPReplyRequest {
  comment: string;
}

export interface ConnectorResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ── Star rating normalization (1–5 → 0–10) ───────────────────────────────────

const STAR_MAP: Record<GBPReview['starRating'], number> = {
  ONE: 2, TWO: 4, THREE: 6, FOUR: 8, FIVE: 10,
};

function normalizeRating(star: GBPReview['starRating']): number {
  return STAR_MAP[star] ?? 0;
}

// ── Token management (server-side only) ──────────────────────────────────────

export interface TokenRefreshResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Refreshes an expired OAuth 2.0 access token using the stored refresh token.
 * Must be called from a Next.js API route — never from the browser bundle.
 */
export async function refreshAccessToken(
  credentials: GoogleBusinessCredentials
): Promise<ConnectorResult<TokenRefreshResult>> {
  if (!credentials.refreshToken) {
    return { ok: false, error: 'No refresh token available. Re-authorize the app.' };
  }

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: 'refresh_token',
  });

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error_description ?? 'Token refresh failed', statusCode: res.status };
    }
    const data = await res.json();
    return { ok: true, data: { accessToken: data.access_token, expiresIn: data.expires_in, tokenType: data.token_type } };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Read reviews ──────────────────────────────────────────────────────────────

/**
 * Fetches all reviews for a given location. Handles pagination automatically.
 */
export async function listReviews(
  credentials: GoogleBusinessCredentials,
  location: GoogleBusinessLocation,
  options: { pageSize?: number; maxPages?: number } = {}
): Promise<ConnectorResult<GBPReview[]>> {
  const { pageSize = 50, maxPages = 20 } = options;

  if (!credentials.accessToken) {
    return { ok: false, error: 'No access token. Authenticate with Google first.' };
  }

  const allReviews: GBPReview[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    const url = new URL(
      `${GBP_API_BASE}/accounts/${location.accountId}/locations/${location.locationId}/reviews`
    );
    url.searchParams.set('pageSize', String(pageSize));
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (res.status === 401) {
        return { ok: false, error: 'Access token expired. Refresh the token and retry.', statusCode: 401 };
      }
      if (res.status === 403) {
        return { ok: false, error: 'Insufficient permissions. Ensure the account has OWNER or MANAGER role.', statusCode: 403 };
      }
      if (!res.ok) {
        return { ok: false, error: `Google API error ${res.status}`, statusCode: res.status };
      }

      const body: GBPReviewsResponse = await res.json();
      allReviews.push(...(body.reviews ?? []));
      pageToken = body.nextPageToken;
      page++;
    } catch (e) {
      return { ok: false, error: `Network error: ${String(e)}` };
    }
  } while (pageToken && page < maxPages);

  return { ok: true, data: allReviews };
}

/**
 * Fetches a single review by its resource name.
 */
export async function getReview(
  credentials: GoogleBusinessCredentials,
  location: GoogleBusinessLocation,
  reviewId: string
): Promise<ConnectorResult<GBPReview>> {
  if (!credentials.accessToken) {
    return { ok: false, error: 'No access token.' };
  }

  try {
    const res = await fetch(
      `${GBP_API_BASE}/accounts/${location.accountId}/locations/${location.locationId}/reviews/${reviewId}`,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } }
    );
    if (!res.ok) return { ok: false, error: `Google API error ${res.status}`, statusCode: res.status };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Post reply ────────────────────────────────────────────────────────────────

/**
 * Posts or updates a reply to a Google Business review.
 * A reply can be edited after posting; the new text overwrites the previous one.
 */
export async function replyToReview(
  credentials: GoogleBusinessCredentials,
  location: GoogleBusinessLocation,
  reviewId: string,
  replyText: string
): Promise<ConnectorResult<{ comment: string; updateTime: string }>> {
  if (!credentials.accessToken) {
    return { ok: false, error: 'No access token.' };
  }
  if (!replyText.trim()) {
    return { ok: false, error: 'Reply text cannot be empty.' };
  }
  if (replyText.length > 4096) {
    return { ok: false, error: 'Reply text exceeds the 4096-character limit.' };
  }

  try {
    const res = await fetch(
      `${GBP_API_BASE}/accounts/${location.accountId}/locations/${location.locationId}/reviews/${reviewId}/reply`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: replyText } satisfies GBPReplyRequest),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error?.message ?? `Google API error ${res.status}`, statusCode: res.status };
    }
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Deletes the reply for a review (sets status back to pending_response).
 */
export async function deleteReply(
  credentials: GoogleBusinessCredentials,
  location: GoogleBusinessLocation,
  reviewId: string
): Promise<ConnectorResult<void>> {
  if (!credentials.accessToken) return { ok: false, error: 'No access token.' };

  try {
    const res = await fetch(
      `${GBP_API_BASE}/accounts/${location.accountId}/locations/${location.locationId}/reviews/${reviewId}/reply`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      }
    );
    if (!res.ok) return { ok: false, error: `Google API error ${res.status}`, statusCode: res.status };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Normalize GBP review to internal Review type ──────────────────────────────

export function normalizeGBPReview(
  raw: GBPReview,
  location: GoogleBusinessLocation
): Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
  const now = new Date().toISOString();
  return {
    source: 'google_business',
    externalId: raw.reviewId,
    hotelId: location.hotelId,
    propertyId: location.locationId,
    authorName: raw.reviewer.displayName,
    rating: normalizeRating(raw.starRating),
    comment: raw.comment,
    language: 'es' as ReviewLanguage,   // detected later by AI analysis
    reviewDate: raw.createTime,
    publishedAt: raw.createTime,
    responseText: raw.reviewReply?.comment,
    responsePublishedAt: raw.reviewReply?.updateTime,
    sourceUrl: `https://search.google.com/local/reviews?placeid=${location.locationId}`,
  };
}
