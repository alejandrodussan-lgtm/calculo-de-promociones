import React, { useState } from 'react';
import type { AuthSession } from '../../types/auth';
import { GlobalHeader } from './GlobalHeader';
import { SidebarNavigation } from './SidebarNavigation';

export type ModuleId = 'simulator' | 'otb' | 'agenda' | 'users' | 'forecast' | 'reportes' | 'configuracion';

interface AppShellProps {
  session: AuthSession;
  activeModule: ModuleId;
  onModuleChange: (mod: ModuleId) => void;
  onLogout: () => void;
  onHotelSelect: () => void;
  children: React.ReactNode;
}

export function AppShell({ session, activeModule, onModuleChange, onLogout, onHotelSelect, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem('rmd_sidebar_collapsed') === '1'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('rmd_sidebar_collapsed', next ? '1' : '0');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <GlobalHeader
        session={session}
        onLogout={onLogout}
        onHotelSelect={onHotelSelect}
        onMobileMenuOpen={() => setMobileOpen(true)}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SidebarNavigation
          session={session}
          activeModule={activeModule}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={toggleCollapsed}
          onMobileClose={() => setMobileOpen(false)}
          onModuleChange={mod => { onModuleChange(mod); setMobileOpen(false); }}
        />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
