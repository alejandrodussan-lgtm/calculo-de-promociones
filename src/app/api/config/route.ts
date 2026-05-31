import { NextResponse } from 'next/server';

/**
 * GET /api/config
 *
 * Returns public runtime configuration for the frontend.
 * Set GOOGLE_CLIENT_ID in your Vercel environment variables (Settings → Environment Variables).
 * It is NOT prefixed with NEXT_PUBLIC_ because it is served server-side and returned as JSON —
 * the value is a public OAuth client identifier (not a secret) but is kept out of the bundle.
 */
export async function GET() {
  return NextResponse.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  });
}
