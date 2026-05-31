/**
 * emailAuthProvider.ts — Email + password authentication
 *
 * PRODUCTION NOTE: Replace hashPassword (FNV-1a) with bcrypt or Argon2 hashed
 * server-side. Never store or transmit plaintext passwords. Hash comparison must
 * happen on the server; never send the stored hash to the client.
 *
 * DEV NOTE: The FNV-1a implementation below is intentionally simple for local
 * development and is NOT cryptographically secure.
 */

import type { User } from '../../types/auth';
import { getUserByEmail } from '../users/userStorage';

// ── FNV-1a hash (DEV ONLY) ────────────────────────────────────────────────────

/**
 * Produces a deterministic hex string from a raw password using the FNV-1a
 * 32-bit algorithm plus a short base64 prefix derived from the first 3 chars.
 *
 * DEV ONLY — do NOT use in production. Replace with bcrypt/Argon2 server-side.
 */
export function hashPassword(raw: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const suffix = btoa(raw.slice(0, 3)).replace(/=/g, '');
  return 'h' + h.toString(16).padStart(8, '0') + suffix;
}

// ── Login result type ─────────────────────────────────────────────────────────

export interface EmailLoginResult {
  ok: boolean;
  user?: User;
  error?: 'invalid_credentials' | 'user_inactive' | 'provider_not_allowed' | 'user_not_found';
}

// ── Email + password login ────────────────────────────────────────────────────

/**
 * Validates an email/password pair against the local user store.
 *
 * Returns `{ ok: true, user }` on success or `{ ok: false, error }` on failure.
 * All error messages intentionally avoid specifying whether the email or
 * password was wrong to prevent user enumeration.
 *
 * PRODUCTION NOTE: Move this validation to a secure server endpoint.
 * The passwordHash should never leave the server.
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<EmailLoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { ok: false, error: 'invalid_credentials' };
  }

  const user = getUserByEmail(normalizedEmail);

  if (!user) {
    // Perform a dummy hash to avoid timing-based user enumeration
    hashPassword(password);
    return { ok: false, error: 'invalid_credentials' };
  }

  if (user.status !== 'active') {
    return { ok: false, error: 'user_inactive' };
  }

  if (!user.allowedProviders.includes('email')) {
    return { ok: false, error: 'provider_not_allowed' };
  }

  const candidateHash = hashPassword(password);
  if (candidateHash !== user.passwordHash) {
    return { ok: false, error: 'invalid_credentials' };
  }

  return { ok: true, user };
}
