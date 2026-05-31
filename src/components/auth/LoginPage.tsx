/**
 * LoginPage.tsx — GEH Suites branded login screen (future React/Next.js component)
 * Currently implemented inline in index.html. This file defines the future component.
 */

import React, { useState } from 'react';
import type { LoginResult } from '../../lib/auth/authService';

interface LoginPageProps {
  onLogin: (email: string, password: string) => LoginResult;
  sessionExpiredMessage?: string;
}

export function LoginPage({ onLogin, sessionExpiredMessage }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Ingrese correo y contraseña.'); return; }
    const result = onLogin(email, password);
    if (!result.ok) setError(result.error || 'Error de autenticación.');
  }

  return (
    <div className="auth-overlay">
      <div className="auth-box">
        {/* GEH Suites logo — SVG inline */}
        <div className="auth-logo">
          <svg viewBox="0 0 230 72" xmlns="http://www.w3.org/2000/svg" style={{ width: 130, height: 42 }}>
            <text x="2" y="54" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="54" fontWeight="900" fill="#CE7E1F">g</text>
            <text x="36" y="54" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="54" fontWeight="900" fill="#AF762B">e</text>
            <text x="70" y="54" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="54" fontWeight="900" fill="#CE7E1F">h</text>
            <text x="110" y="46" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="32" fontWeight="400" fill="#CE7E1F">suites</text>
            <text x="115" y="64" fontFamily="'Segoe UI',Arial,sans-serif" fontSize="15" fontWeight="400" fill="#AF762B" letterSpacing="3">Hotels</text>
          </svg>
        </div>
        <div className="auth-title">Revenue Master Dashboard</div>
        <div className="auth-subtitle">Pricing Strategy · OTA Channels · Net Revenue Control</div>
        <div className="auth-restricted">Acceso exclusivo para usuarios autorizados de GEH Suites.</div>
        {sessionExpiredMessage && (
          <div style={{ background: '#fff3cd', border: '1px solid #f5c842', color: '#856404', borderRadius: 6, padding: '8px 12px', fontSize: '.74rem', marginBottom: 10 }}>
            {sessionExpiredMessage}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@gehsuites.com" required />
          </div>
          <div className="auth-form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required />
          </div>
          {error && <div className="auth-error show">{error}</div>}
          <button type="submit" className="auth-btn">Iniciar sesión</button>
        </form>
        <div className="auth-footer">
          Las acciones realizadas dentro del sistema quedan registradas<br />
          para fines de control, seguridad y trazabilidad.
        </div>
      </div>
    </div>
  );
}
