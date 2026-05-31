/**
 * GoogleLoginButton.tsx — Renders the Google Sign-In button and handles the
 * credential response lifecycle.
 *
 * PRODUCTION NOTE: Pass the verified user object (from a server-side token
 * check) to onSuccess rather than the raw decoded JWT payload.
 */

import React, { useEffect, useRef } from 'react';
import {
  initGoogleSignIn,
  renderGoogleButton,
  decodeGoogleJWT,
} from '../../lib/auth/googleAuthProvider';
import { checkAuthorizedEmail } from '../../lib/auth/authorizedUsers';
import type { GoogleCredentialResponse, DecodedGoogleToken } from '../../lib/auth/googleAuthProvider';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GoogleLoginButtonProps {
  /** Google OAuth 2.0 Client ID — public identifier, safe to embed in frontend code */
  clientId: string;
  /** Called when the user successfully signs in with an authorized Google account */
  onSuccess: (decoded: DecodedGoogleToken) => void;
  /** Called when sign-in fails or the email is not in the authorized user list */
  onError: (reason: 'unauthorized' | 'google_error' | 'provider_not_allowed', message: string) => void;
  /** Whether the button should be rendered in a disabled/loading state */
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

const BUTTON_CONTAINER_ID = 'google-signin-button';

export function GoogleLoginButton({
  clientId,
  onSuccess,
  onError,
  disabled = false,
}: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current || disabled) return;

    const handleCredentialResponse = (response: GoogleCredentialResponse) => {
      try {
        const decoded = decodeGoogleJWT(response.credential);

        if (!decoded.email_verified) {
          onError('google_error', 'La cuenta de Google no tiene el email verificado.');
          return;
        }

        const check = checkAuthorizedEmail(decoded.email, 'google');

        if (!check.authorized) {
          const message =
            check.reason === 'inactive'
              ? 'Tu cuenta está desactivada. Contacta al administrador.'
              : check.reason === 'provider_not_allowed'
              ? 'Esta cuenta no tiene permiso para usar Google Sign-In.'
              : 'Esta dirección de email no está autorizada para acceder al sistema.';
          onError(
            check.reason === 'provider_not_allowed' ? 'provider_not_allowed' : 'unauthorized',
            message
          );
          return;
        }

        onSuccess(decoded);
      } catch (err) {
        onError('google_error', 'No se pudo procesar la respuesta de Google.');
        console.error('[GoogleLoginButton] decodeGoogleJWT error:', err);
      }
    };

    initGoogleSignIn(clientId, handleCredentialResponse);
    renderGoogleButton(BUTTON_CONTAINER_ID);
    initialised.current = true;
  }, [clientId, disabled, onSuccess, onError]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <div
        id={BUTTON_CONTAINER_ID}
        ref={containerRef}
        aria-label="Iniciar sesión con Google"
        style={{ minHeight: 44 }}
      />
      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
        Solo cuentas autorizadas por el administrador
      </p>
    </div>
  );
}

export default GoogleLoginButton;
