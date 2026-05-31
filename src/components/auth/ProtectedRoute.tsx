/**
 * ProtectedRoute.tsx — Route guard for authenticated users
 *
 * Usage:
 *   <ProtectedRoute session={session} fallback={<LoginPage />}>
 *     <Dashboard />
 *   </ProtectedRoute>
 */

import React from 'react';
import type { AuthSession, Permission } from '../../types/auth';

interface ProtectedRouteProps {
  session: AuthSession | null;
  fallback: React.ReactNode;
  children: React.ReactNode;
  requiredPermission?: Permission;
  deniedMessage?: string;
}

export function ProtectedRoute({ session, fallback, children, requiredPermission, deniedMessage }: ProtectedRouteProps) {
  if (!session) return <>{fallback}</>;
  if (requiredPermission && !session.permissions.includes(requiredPermission)) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#c00' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: '1rem' }}>Acceso denegado</div>
        <div style={{ fontSize: '.8rem', color: '#666', marginTop: 8 }}>
          {deniedMessage || 'No tiene permisos para acceder a este módulo.'}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
