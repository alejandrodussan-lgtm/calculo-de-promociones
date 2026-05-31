/**
 * authorizedUsers.ts — Validates whether an email is authorized to access the dashboard.
 *
 * A user must exist in the users store with status:'active' regardless of their
 * authentication method. Additionally, the chosen auth provider must be listed in
 * the user's allowedProviders array.
 *
 * This check is intentionally separate from credential validation: it enforces
 * access control at the identity layer (who may log in) rather than the
 * credential layer (how they prove identity).
 */

import type { User, AuthProvider } from '../../types/auth';
import { getAll } from '../users/userStorage';

// ── Result type ───────────────────────────────────────────────────────────────

export interface AuthorizedUserCheck {
  /** Whether the user is allowed to proceed with authentication */
  authorized: boolean;
  /**
   * Reason for denial. Only present when `authorized` is false.
   *
   * - `not_found`            — No user record matches the supplied email address.
   * - `inactive`             — The user account exists but has been deactivated.
   * - `provider_not_allowed` — The user exists and is active but has not been
   *                            granted access via the requested auth provider.
   */
  reason?: 'not_found' | 'inactive' | 'provider_not_allowed';
  /** The matching User record. Present only when `authorized` is true. */
  user?: User;
}

// ── Authorization check ───────────────────────────────────────────────────────

/**
 * Looks up `email` in the user store and determines whether the user is allowed
 * to authenticate using the given `provider`.
 *
 * @param email     Email address supplied by the identity provider or login form
 * @param provider  The auth method being used ('email' | 'google' | 'magic_link')
 */
export function checkAuthorizedEmail(
  email: string,
  provider: AuthProvider
): AuthorizedUserCheck {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getAll();

  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return { authorized: false, reason: 'not_found' };
  }

  if (user.status !== 'active') {
    return { authorized: false, reason: 'inactive' };
  }

  // Guard: legacy users created before allowedProviders was introduced
  // default to allowing all providers so existing accounts are not locked out.
  const allowed = user.allowedProviders ?? (['email', 'google', 'magic_link'] as AuthProvider[]);

  if (!allowed.includes(provider)) {
    return { authorized: false, reason: 'provider_not_allowed' };
  }

  return { authorized: true, user };
}
