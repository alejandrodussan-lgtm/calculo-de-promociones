import React from 'react';

interface ModuleToolbarProps {
  children: React.ReactNode;
  status?: string;
}

export function ModuleToolbar({ children, status }: ModuleToolbarProps) {
  return (
    <div className="action-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {children}
      {status && <span className="save-status">{status}</span>}
    </div>
  );
}
