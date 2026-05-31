/**
 * EmailLoginForm.tsx — Email + password login form.
 *
 * Calls loginWithEmail from emailAuthProvider, which validates credentials
 * against the local user store. The form enforces basic client-side validation
 * before the async call to avoid unnecessary work.
 *
 * PRODUCTION NOTE: Replace the local loginWithEmail call with a POST to a
 * server-side authentication endpoint that handles bcrypt/Argon2 comparison.
 */

import React, { useState, useRef, FormEvent } from 'react';
import { loginWithEmail } from '../../lib/auth/emailAuthProvider';
import type { User } from '../../types/auth';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface EmailLoginFormProps {
  /** Called with the authenticated user record on successful login */
  onSuccess: (user: User) => void;
  /** Called when authentication fails with a user-facing error message */
  onError: (message: string) => void;
  /** Whether the form should be rendered in a disabled/loading state */
  disabled?: boolean;
}

// ── Error message map ─────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  user_inactive: 'Tu cuenta está desactivada. Contacta al administrador.',
  provider_not_allowed: 'Esta cuenta no tiene permiso para usar email/contraseña.',
  user_not_found: 'Email o contraseña incorrectos.',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function EmailLoginForm({ onSuccess, onError, disabled = false }: EmailLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const emailRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'El email es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Ingresa un email válido.';
    }
    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 4) {
      errors.password = 'La contraseña debe tener al menos 4 caracteres.';
    }
    setFieldError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldError({});

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await loginWithEmail(email.trim().toLowerCase(), password);

      if (result.ok && result.user) {
        onSuccess(result.user);
      } else {
        const msg = ERROR_MESSAGES[result.error ?? ''] ?? 'Error de autenticación. Intenta de nuevo.';
        onError(msg);
      }
    } catch {
      onError('Error inesperado. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = disabled || loading;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      aria-label="Formulario de inicio de sesión"
    >
      {/* Email field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="login-email" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
          Email
        </label>
        <input
          id="login-email"
          ref={emailRef}
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isDisabled}
          placeholder="tu@email.com"
          aria-describedby={fieldError.email ? 'login-email-error' : undefined}
          aria-invalid={!!fieldError.email}
          style={{
            padding: '8px 12px',
            border: `1px solid ${fieldError.email ? '#dc2626' : '#d1d5db'}`,
            borderRadius: 6,
            fontSize: 14,
            outline: 'none',
          }}
        />
        {fieldError.email && (
          <span id="login-email-error" role="alert" style={{ fontSize: 12, color: '#dc2626' }}>
            {fieldError.email}
          </span>
        )}
      </div>

      {/* Password field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="login-password" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isDisabled}
          placeholder="••••••••"
          aria-describedby={fieldError.password ? 'login-password-error' : undefined}
          aria-invalid={!!fieldError.password}
          style={{
            padding: '8px 12px',
            border: `1px solid ${fieldError.password ? '#dc2626' : '#d1d5db'}`,
            borderRadius: 6,
            fontSize: 14,
            outline: 'none',
          }}
        />
        {fieldError.password && (
          <span id="login-password-error" role="alert" style={{ fontSize: 12, color: '#dc2626' }}>
            {fieldError.password}
          </span>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isDisabled}
        style={{
          padding: '10px 16px',
          background: isDisabled ? '#9ca3af' : '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Verificando…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

export default EmailLoginForm;
