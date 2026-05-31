import React from 'react';

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function ModuleHeader({ title, subtitle, actions }: ModuleHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1.5px solid var(--gold-border)', background: 'var(--gold-pale)', flexShrink: 0 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: '.88rem', color: 'var(--gold-dark)', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: '.72rem', color: 'var(--gray3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
