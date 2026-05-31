/**
 * UserMenu.tsx — User info chip + logout button in the app header
 */

import React from 'react';
import type { AuthSession } from '../../types/auth';
import { ROLE_LABELS } from '../../lib/auth/permissions';

interface UserMenuProps {
  session: AuthSession;
  onLogout: () => void;
}

export function UserMenu({ session, onLogout }: UserMenuProps) {
  return (
    <div className="header-user">
      <div className="header-user-info">
        <div className="header-user-name">
          {session.userName}
          <span style={{ fontWeight: 400, opacity: .7 }}> · {ROLE_LABELS[session.role] || session.role}</span>
        </div>
        <div className="header-user-role">{session.activeHotelId || 'Todos los hoteles'}</div>
      </div>
      <button className="header-logout-btn" onClick={onLogout}>Cerrar sesión</button>
    </div>
  );
}
