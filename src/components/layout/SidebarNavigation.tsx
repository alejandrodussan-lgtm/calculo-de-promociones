import React from 'react';
import type { AuthSession } from '../../types/auth';
import type { ModuleId } from './AppShell';
import { SidebarNavItem } from './SidebarNavItem';

interface NavGroup {
  label: string;
  items: Array<{ id: ModuleId; icon: string; label: string; future?: boolean }>;
}

function getNavGroups(session: AuthSession): NavGroup[] {
  const isAdmin = session.role === 'master_admin' || session.permissions.includes('canManageUsers');
  const groups: NavGroup[] = [
    {
      label: 'Revenue Management',
      items: [
        { id: 'simulator', icon: '📊', label: 'Simulador de Tarifas' },
        { id: 'otb',       icon: '📈', label: 'Comparativa OTB' },
      ],
    },
    {
      label: 'Seguimiento',
      items: [{ id: 'agenda', icon: '📋', label: 'Agenda Revenue' }],
    },
  ];
  if (isAdmin) {
    groups.push({
      label: 'Administración',
      items: [{ id: 'users', icon: '👤', label: 'Usuarios' }],
    });
  }
  groups.push({
    label: 'Próximamente',
    items: [
      { id: 'forecast',      icon: '🔮', label: 'Forecast',      future: true },
      { id: 'reportes',      icon: '📑', label: 'Reportes',      future: true },
      { id: 'configuracion', icon: '⚙',  label: 'Configuración', future: true },
    ],
  });
  return groups;
}

interface SidebarNavigationProps {
  session: AuthSession;
  activeModule: ModuleId;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
  onModuleChange: (mod: ModuleId) => void;
}

export function SidebarNavigation({ session, activeModule, collapsed, mobileOpen, onToggleCollapse, onMobileClose, onModuleChange }: SidebarNavigationProps) {
  const groups = getNavGroups(session);
  const sidebarClass = ['main-sidebar', collapsed ? 'sb-collapsed' : '', mobileOpen ? 'sb-mobile-open' : ''].filter(Boolean).join(' ');

  return (
    <>
      {mobileOpen && <div className="sb-mobile-overlay visible" onClick={onMobileClose} />}
      <aside className={sidebarClass}>
        <div className="sb-toggle-btn">
          <button onClick={onToggleCollapse} title="Colapsar/expandir menú">
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
        <nav className="sb-nav">
          {groups.map((group, gi) => (
            <div key={gi} className="sb-group">
              <div className="sb-group-label">{group.label}</div>
              {group.items.map(item => (
                <SidebarNavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeModule === item.id}
                  future={item.future}
                  onClick={() => !item.future && onModuleChange(item.id)}
                />
              ))}
              <hr className="sb-divider" />
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
