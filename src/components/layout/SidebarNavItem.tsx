import React from 'react';

interface SidebarNavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  future?: boolean;
  onClick?: () => void;
}

export function SidebarNavItem({ icon, label, active, future, onClick }: SidebarNavItemProps) {
  return (
    <button
      className={['sb-item', active ? 'active' : '', future ? 'sb-item-future' : ''].filter(Boolean).join(' ')}
      data-tooltip={label}
      onClick={onClick}
      disabled={future}
    >
      <span className="sb-item-icon">{icon}</span>
      <span className="sb-item-label">{label}</span>
    </button>
  );
}
