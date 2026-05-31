/**
 * PermissionGate.tsx — Conditionally render children based on permissions
 *
 * Usage:
 *   <PermissionGate session={session} require="canEditPromotions">
 *     <button>Configurar promociones</button>
 *   </PermissionGate>
 *
 *   <PermissionGate session={session} require="canDeleteNotes" disabled tooltip="Sin permiso">
 *     <button>Eliminar</button>
 *   </PermissionGate>
 */

import React from 'react';
import type { AuthSession, Permission } from '../../types/auth';

interface PermissionGateProps {
  session: AuthSession | null;
  require: Permission;
  children: React.ReactNode;
  disabled?: boolean;        // show children but disabled instead of hiding
  tooltip?: string;          // tooltip text when disabled
  fallback?: React.ReactNode;
}

export function PermissionGate({ session, require: perm, children, disabled, tooltip, fallback }: PermissionGateProps) {
  const allowed = session?.permissions.includes(perm) ?? false;

  if (allowed) return <>{children}</>;
  if (disabled) {
    return (
      <span title={tooltip || `Sin permiso: ${perm}`} style={{ opacity: .4, pointerEvents: 'none', display: 'inline-block' }}>
        {children}
      </span>
    );
  }
  return fallback ? <>{fallback}</> : null;
}
