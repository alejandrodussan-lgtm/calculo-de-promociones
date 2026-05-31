import React, { useState } from 'react';
import type { User, UserRole } from '../../types/auth';
import { ROLE_LABELS } from '../../lib/auth/permissions';

type AuthProvider = 'email' | 'google' | 'magic_link';

interface UserFormProps {
  initial?: Partial<User>;
  hotels: string[];
  onSave: (data: Partial<User> & { password?: string }) => void;
  onCancel: () => void;
}

export function UserForm({ initial = {}, hotels, onSave, onCancel }: UserFormProps) {
  const [name, setName] = useState(initial.name || '');
  const [email, setEmail] = useState(initial.email || '');
  const [role, setRole] = useState<UserRole>(initial.role || 'viewer');
  const [status, setStatus] = useState<'active' | 'inactive'>(initial.status || 'active');
  const [password, setPassword] = useState('');
  const [allowedProviders, setAllowedProviders] = useState<AuthProvider[]>(
    (initial as any).allowedProviders || ['email', 'google']
  );
  const [hotelAccess, setHotelAccess] = useState<string[]>(initial.hotelAccess || []);

  const isNew = !initial.id;

  function toggleProvider(p: AuthProvider) {
    setAllowedProviders(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function toggleHotel(h: string) {
    setHotelAccess(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Partial<User> & { password?: string; allowedProviders?: AuthProvider[] } = {
      name, email, role, status, hotelAccess,
      allowedProviders,
    };
    if (password) data.password = password;
    onSave(data);
  }

  const providers: { id: AuthProvider; label: string; icon: string }[] = [
    { id: 'email', label: 'Email + contraseña', icon: '✉' },
    { id: 'google', label: 'Google / Gmail', icon: '🔵' },
    { id: 'magic_link', label: 'Magic Link', icon: '🔗' },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="user-form-row">
        <div className="user-form-group">
          <label>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="user-form-group">
          <label>Correo electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
      </div>

      <div className="user-form-row">
        <div className="user-form-group">
          <label>Rol</label>
          <select value={role} onChange={e => setRole(e.target.value as UserRole)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="user-form-group">
          <label>Estado</label>
          <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="user-form-group">
        <label>Métodos de acceso permitidos</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {providers.map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowedProviders.includes(p.id)}
                onChange={() => toggleProvider(p.id)}
              />
              {p.icon} {p.label}
            </label>
          ))}
        </div>
      </div>

      {(isNew || password) && allowedProviders.includes('email') && (
        <div className="user-form-group">
          <label>{isNew ? 'Contraseña inicial' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required={isNew}
            placeholder={isNew ? 'Contraseña inicial requerida' : 'Sin cambios'}
          />
        </div>
      )}

      <div className="user-form-group">
        <label>Hoteles asignados</label>
        <div className="hotels-checkbox-grid">
          {hotels.map(h => (
            <label key={h}>
              <input
                type="checkbox"
                checked={hotelAccess.includes(h)}
                onChange={() => toggleHotel(h)}
              />
              {h}
            </label>
          ))}
        </div>
      </div>

      <div className="user-modal-footer">
        <button type="button" className="save-btn" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="save-btn primary">{isNew ? 'Crear usuario' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}
