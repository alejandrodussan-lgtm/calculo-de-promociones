/**
 * userStorage.ts — User CRUD layer
 * Backed by localStorage. Swap localStorage calls with API calls for production.
 */

import type { User, UserRole } from '../../types/auth';
import { hashPassword } from '../auth/authService';
import { DEFAULT_ROLE_PERMISSIONS } from '../auth/permissions';
import { writeAuditLog } from '../audit/auditLog';

const USERS_KEY = 'rmd_users';

export const MASTER_USER: User = {
  id: 'u_master',
  name: 'Alejandro',
  email: 'alejandro@gehsuites.com',
  passwordHash: '', // set at runtime
  role: 'master_admin',
  status: 'active',
  hotelAccess: [],
  permissions: DEFAULT_ROLE_PERMISSIONS.master_admin,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'system',
  lastLoginAt: null,
};

export function getAll(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const stored: User[] = raw ? JSON.parse(raw) : [];
    if (!stored.find(u => u.id === MASTER_USER.id)) stored.unshift({ ...MASTER_USER });
    return stored;
  } catch {
    return [{ ...MASTER_USER }];
  }
}

export function saveAll(users: User[]): void {
  if (!users.find(u => u.id === MASTER_USER.id)) users.unshift({ ...MASTER_USER });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function create(data: Partial<User> & { password?: string }, createdBy: string): User {
  const users = getAll();
  const now = new Date().toISOString();
  const role: UserRole = (data.role as UserRole) || 'viewer';
  const u: User = {
    id: 'u_' + Date.now(),
    name: data.name || '',
    email: data.email || '',
    passwordHash: data.password ? hashPassword(data.password) : '',
    role,
    status: 'active',
    hotelAccess: data.hotelAccess || [],
    permissions: data.permissions || DEFAULT_ROLE_PERMISSIONS[role] || [],
    createdAt: now,
    updatedAt: now,
    createdBy,
    lastLoginAt: null,
  };
  users.push(u);
  saveAll(users);
  writeAuditLog({ action: 'user_created', userId: createdBy, userName: createdBy, hotelId: null, newValue: u.id });
  return u;
}

export function update(id: string, updates: Partial<User> & { password?: string }, updatedBy: string): User | null {
  const users = getAll();
  const idx = users.findIndex(u => u.id === id);
  if (idx < 0) return null;
  const patch = { ...updates, updatedAt: new Date().toISOString() } as Partial<User>;
  if (updates.password) patch.passwordHash = hashPassword(updates.password);
  delete (patch as Record<string, unknown>).password;
  users[idx] = { ...users[idx], ...patch };
  saveAll(users);
  writeAuditLog({ action: 'user_updated', userId: updatedBy, userName: updatedBy, hotelId: null, entityId: id });
  return users[idx];
}

export function setStatus(id: string, status: 'active' | 'inactive', by: string): User | null {
  const action = status === 'inactive' ? 'user_disabled' : 'user_updated';
  const result = update(id, { status }, by);
  writeAuditLog({ action, userId: by, userName: by, hotelId: null, entityId: id });
  return result;
}
