import React from 'react';
import type { AuthSession } from '../../types/auth';
import { ROLE_LABELS } from '../../lib/auth/permissions';

interface GlobalHeaderProps {
  session: AuthSession;
  onLogout: () => void;
  onHotelSelect: () => void;
  onMobileMenuOpen: () => void;
}

export function GlobalHeader({ session, onLogout, onHotelSelect, onMobileMenuOpen }: GlobalHeaderProps) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="sb-hamburger" onClick={onMobileMenuOpen} title="Menú">☰</button>
        <div className="header-logo">
          <div className="header-title">
            <h1>Revenue Master Dashboard</h1>
            <p>Pricing Strategy · OTA Channels · Net Revenue Control</p>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="hotel-toggle-btn" onClick={onHotelSelect}>
          <span className="htb-icon">🏨</span>
          <span className="htb-name">{session.activeHotelId || 'GEH Suites Hotels'}</span>
          <span className="htb-arrow">▼</span>
        </button>
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
      </div>
    </header>
  );
}
