/**
 * authService.ts — Auth service layer for Revenue Master Dashboard
 *
 * DEV NOTE: This implementation uses localStorage + a deterministic hash
 * (NOT cryptographically secure). For production, replace with:
 *   - Supabase Auth
 *   - Firebase Auth
 *   - Auth.js / NextAuth
 *   - Your own JWT backend
 *
 * No API keys or secrets should ever live in this file.
 */

import type { User, AuthSession, Permission, UserRole } from '../../types/auth';

const AUTH_STORAGE_KEY = 'rmd_auth_session';
const SESSION_INACTIVITY_HOURS = 24;

// ── Simple hash (DEV ONLY) ────────────────────────────────────────────────────
export function hashPassword(raw: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return 'h' + h.toString(16).padStart(8, '0') + btoa(raw.slice(0, 3)).replace(/=/g, '');
}

// ── Session persistence ───────────────────────────────────────────────────────
export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const s: AuthSession = JSON.parse(raw);
    const inactiveMs = Date.now() - new Date(s.lastActivityAt).getTime();
    if (inactiveMs > SESSION_INACTIVITY_HOURS * 3600 * 1000) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function touchSession(session: AuthSession): AuthSession {
  const updated = { ...session, lastActivityAt: new Date().toISOString() };
  writeSession(updated);
  return updated;
}

// ── Permission helpers ────────────────────────────────────────────────────────
export function hasPermission(session: AuthSession, perm: Permission): boolean {
  return session.permissions.includes(perm);
}

export function canAccessHotel(session: AuthSession, hotelName: string): boolean {
  if (session.role === 'master_admin' || session.permissions.includes('canViewAllHotels')) return true;
  return session.hotelAccess.includes(hotelName);
}

// ── Login ─────────────────────────────────────────────────────────────────────
export interface LoginResult {
  ok: boolean;
  session?: AuthSession;
  error?: string;
}

export function login(users: User[], email: string, password: string): LoginResult {
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) return { ok: false, error: 'Usuario no encontrado.' };
  if (user.status === 'inactive') return { ok: false, error: 'Usuario desactivado. Contacte al administrador.' };
  if (user.passwordHash !== hashPassword(password)) return { ok: false, error: 'Contraseña incorrecta.' };

  const now = new Date().toISOString();
  const session: AuthSession = {
    userId: user.id,
    userName: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    hotelAccess: user.hotelAccess,
    activeHotelId: user.hotelAccess.length > 0 ? user.hotelAccess[0] : null,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: new Date(Date.now() + SESSION_INACTIVITY_HOURS * 3600000).toISOString(),
  };
  writeSession(session);
  return { ok: true, session };
}
