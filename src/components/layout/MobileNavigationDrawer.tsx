import React from 'react';
import type { AuthSession } from '../../types/auth';
import type { ModuleId } from './AppShell';
import { SidebarNavigation } from './SidebarNavigation';

interface MobileNavigationDrawerProps {
  session: AuthSession;
  activeModule: ModuleId;
  open: boolean;
  onClose: () => void;
  onModuleChange: (mod: ModuleId) => void;
}

export function MobileNavigationDrawer({ session, activeModule, open, onClose, onModuleChange }: MobileNavigationDrawerProps) {
  return (
    <SidebarNavigation
      session={session}
      activeModule={activeModule}
      collapsed={false}
      mobileOpen={open}
      onToggleCollapse={() => {}}
      onMobileClose={onClose}
      onModuleChange={onModuleChange}
    />
  );
}
