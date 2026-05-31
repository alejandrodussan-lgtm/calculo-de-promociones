/**
 * UserManagementTab.tsx — Admin panel for managing users
 * Currently rendered in index.html via initUsersModule(). This file defines the future component.
 */

import React, { useState } from 'react';
import type { User, AuthSession } from '../../types/auth';
import { ROLE_LABELS } from '../../lib/auth/permissions';

interface UserManagementTabProps {
  session: AuthSession;
  users: User[];
  onCreateUser: (data: Partial<User> & { password: string }) => void;
  onUpdateUser: (id: string, data: Partial<User>) => void;
  onToggleStatus: (id: string, status: 'active' | 'inactive') => void;
}

export function UserManagementTab({ session, users, onCreateUser, onUpdateUser, onToggleStatus }: UserManagementTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canManage = session.permissions.includes('canManageUsers');

  if (!canManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#c00' }}>
        <div style={{ fontSize: '2rem' }}>🔒</div>
        <p>No tiene permisos para gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--gold-dark)', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
          👤 Gestión de Usuarios
        </h2>
        {session.permissions.includes('canCreateUsers') && (
          <button className="save-btn primary" onClick={() => setShowForm(true)}>+ Nuevo usuario</button>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.75rem' }}>
        <thead>
          <tr style={{ background: 'var(--gold-pale)' }}>
            <th style={{ padding: '7px 10px', textAlign: 'left' }}>Nombre</th>
            <th style={{ padding: '7px 10px', textAlign: 'left' }}>Correo</th>
            <th style={{ padding: '7px 10px', textAlign: 'left' }}>Rol</th>
            <th style={{ padding: '7px 10px', textAlign: 'left' }}>Estado</th>
            <th style={{ padding: '7px 10px', textAlign: 'left' }}>Último acceso</th>
            <th style={{ padding: '7px 10px', textAlign: 'left' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--gray2)' }}>
              <td style={{ padding: '7px 10px', fontWeight: 700 }}>{u.name}</td>
              <td style={{ padding: '7px 10px', fontSize: '.72rem' }}>{u.email}</td>
              <td style={{ padding: '7px 10px' }}>
                <span className={`badge-role ${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
              </td>
              <td style={{ padding: '7px 10px' }}>
                <span className={u.status === 'active' ? 'badge-active' : 'badge-inactive'}>
                  {u.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td style={{ padding: '7px 10px', color: 'var(--gray3)', fontSize: '.68rem' }}>
                {u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : 'Nunca'}
              </td>
              <td style={{ padding: '7px 10px' }}>
                {u.id !== 'u_master' && (
                  <>
                    <button onClick={() => { setEditingId(u.id); setShowForm(true); }}>✏ Editar</button>
                    {u.status === 'active'
                      ? <button style={{ color: '#c00' }} onClick={() => onToggleStatus(u.id, 'inactive')}>Desactivar</button>
                      : <button style={{ color: '#0a3622' }} onClick={() => onToggleStatus(u.id, 'active')}>Activar</button>
                    }
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
