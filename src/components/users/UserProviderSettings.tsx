import React from 'react';

type AuthProvider = 'email' | 'google' | 'magic_link';

interface ProviderConfig {
  id: AuthProvider;
  label: string;
  icon: string;
  description: string;
}

const PROVIDERS: ProviderConfig[] = [
  { id: 'email',       label: 'Email + contraseña', icon: '✉',  description: 'El usuario puede iniciar sesión con correo y contraseña.' },
  { id: 'google',      label: 'Google / Gmail',      icon: '🔵', description: 'El usuario puede iniciar sesión con su cuenta Google o Gmail.' },
  { id: 'magic_link',  label: 'Magic Link',          icon: '🔗', description: 'El usuario recibe un enlace de acceso por correo sin contraseña.' },
];

interface UserProviderSettingsProps {
  allowedProviders: AuthProvider[];
  onChange: (providers: AuthProvider[]) => void;
  readonly?: boolean;
}

export function UserProviderSettings({ allowedProviders, onChange, readonly }: UserProviderSettingsProps) {
  function toggle(id: AuthProvider) {
    if (readonly) return;
    const next = allowedProviders.includes(id)
      ? allowedProviders.filter(p => p !== id)
      : [...allowedProviders, id];
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {PROVIDERS.map(p => {
        const enabled = allowedProviders.includes(p.id);
        return (
          <div
            key={p.id}
            onClick={() => toggle(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 12px', borderRadius: 8,
              border: `1.5px solid ${enabled ? 'var(--gold)' : 'var(--gold-border)'}`,
              background: enabled ? 'var(--gold-subtle)' : 'var(--white)',
              cursor: readonly ? 'default' : 'pointer',
              transition: 'all .15s',
            }}
          >
            <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text)' }}>{p.label}</div>
              <div style={{ fontSize: '.66rem', color: 'var(--gray3)', marginTop: 1 }}>{p.description}</div>
            </div>
            <div style={{
              width: 36, height: 20, borderRadius: 10,
              background: enabled ? 'var(--gold)' : '#ddd',
              position: 'relative', transition: 'background .15s', flexShrink: 0,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: enabled ? 18 : 2, transition: 'left .15s',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
