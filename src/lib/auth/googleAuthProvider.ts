/**
 * googleAuthProvider.ts — Google Identity Services integration
 *
 * PRODUCTION NOTE: GOOGLE_CLIENT_ID is a public identifier (not a secret).
 * Store it in NEXT_PUBLIC_GOOGLE_CLIENT_ID (Next.js) or as a build-time env var.
 * The id_token JWT should be verified server-side using Google's tokeninfo endpoint
 * or a library such as google-auth-library before trusting any claims.
 *
 * DEV NOTE: decodeGoogleJWT does NOT verify the signature — it only reads the payload.
 * Never use this for authorization in production without server-side verification.
 */

// ── Google Identity Services types ───────────────────────────────────────────

/** Raw response from google.accounts.id callback */
export interface GoogleCredentialResponse {
  /** Base64url-encoded JWT (id_token) issued by Google */
  credential: string;
  /** How the credential was selected (e.g. 'user_1tap', 'btn_confirm', 'auto') */
  select_by: string;
}

/** Claims extracted from the Google id_token JWT payload */
export interface DecodedGoogleToken {
  /** Stable Google user identifier (use this as the foreign key, not email) */
  sub: string;
  email: string;
  name: string;
  /** URL of the user's profile picture */
  picture: string;
  /** Whether Google has verified ownership of this email address */
  email_verified: boolean;
}

// ── JWT payload decoder (DEV ONLY — no signature verification) ───────────────

/**
 * Decodes the payload section of a Google id_token JWT.
 *
 * WARNING: This function does NOT verify the JWT signature.
 * In production, verify the token server-side before trusting its claims.
 */
export function decodeGoogleJWT(token: string): DecodedGoogleToken {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 segments separated by "."');
  }

  const payloadB64 = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded = payloadB64.padEnd(
    payloadB64.length + ((4 - (payloadB64.length % 4)) % 4),
    '='
  );

  let json: string;
  try {
    json = atob(padded);
  } catch {
    throw new Error('Failed to base64-decode JWT payload');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('Failed to parse JWT payload as JSON');
  }

  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new Error('JWT payload is missing required fields (sub, email)');
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    name: (payload.name as string) ?? '',
    picture: (payload.picture as string) ?? '',
    email_verified: Boolean(payload.email_verified),
  };
}

// ── Google Identity Services initialisation ───────────────────────────────────

/**
 * Initialises the Google Sign-In flow using the Google Identity Services library.
 * Must be called after the GSI script (`https://accounts.google.com/gsi/client`)
 * has loaded on the page.
 *
 * @param clientId  Your Google OAuth 2.0 client ID (public identifier, not a secret)
 * @param callback  Function invoked when the user completes the sign-in flow
 */
export function initGoogleSignIn(
  clientId: string,
  callback: (response: GoogleCredentialResponse) => void
): void {
  if (typeof window === 'undefined') return;

  const google = (window as unknown as { google?: { accounts?: { id?: { initialize?: Function; prompt?: Function } } } }).google;

  if (!google?.accounts?.id?.initialize) {
    console.error(
      '[googleAuthProvider] google.accounts.id is not available. ' +
      'Ensure the GSI script is loaded before calling initGoogleSignIn.'
    );
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

// ── Button renderer ───────────────────────────────────────────────────────────

/**
 * Renders the official Google Sign-In button inside the given container element.
 * Must be called after `initGoogleSignIn`.
 *
 * @param containerId  The `id` attribute of the DOM element that will host the button
 */
export function renderGoogleButton(containerId: string): void {
  if (typeof window === 'undefined') return;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[googleAuthProvider] Container element #${containerId} not found in DOM.`);
    return;
  }

  const google = (window as unknown as { google?: { accounts?: { id?: { renderButton?: Function } } } }).google;

  if (!google?.accounts?.id?.renderButton) {
    console.error(
      '[googleAuthProvider] google.accounts.id.renderButton is not available. ' +
      'Ensure initGoogleSignIn has been called first.'
    );
    return;
  }

  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: 280,
  });
}
