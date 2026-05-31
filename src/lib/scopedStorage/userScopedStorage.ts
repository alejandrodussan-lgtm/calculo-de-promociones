/**
 * userScopedStorage.ts — Scoped storage keyed by userId + hotelId
 *
 * Allows storing user-specific preferences, pending changes, and
 * personal configurations without affecting other users.
 *
 * Usage:
 *   const store = getUserScopedStorage(userId, hotelId);
 *   store.set('agendaView', 'cards');
 *   const view = store.get<string>('agendaView');
 */

import type { PendingChange } from '../../types/auth';

const SCOPED_KEY_PREFIX = 'rmd_usr_';
const PENDING_KEY = 'rmd_pending_changes';

// ── User-scoped key/value store ───────────────────────────────────────────────
export function getUserScopedStorage(userId: string, hotelId?: string) {
  const prefix = SCOPED_KEY_PREFIX + userId + (hotelId ? '_' + hotelId : '') + '_';

  return {
    get<T>(key: string): T | null {
      try {
        const raw = localStorage.getItem(prefix + key);
        return raw !== null ? JSON.parse(raw) : null;
      } catch { return null; }
    },
    set(key: string, value: unknown): void {
      localStorage.setItem(prefix + key, JSON.stringify(value));
    },
    delete(key: string): void {
      localStorage.removeItem(prefix + key);
    },
    clear(): void {
      Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    },
  };
}

// ── Pending changes ───────────────────────────────────────────────────────────
export function getPendingChanges(userId: string): PendingChange[] {
  try {
    const all: PendingChange[] = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    return all.filter(c => c.userId === userId);
  } catch { return []; }
}

export function addPendingChange(change: Omit<PendingChange, 'id' | 'createdAt'>): PendingChange {
  const all: PendingChange[] = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  const entry: PendingChange = {
    ...change,
    id: 'pc_' + Date.now(),
    createdAt: new Date().toISOString(),
  };
  all.push(entry);
  localStorage.setItem(PENDING_KEY, JSON.stringify(all));
  return entry;
}

export function clearPendingChanges(userId: string, hotelId?: string): void {
  const all: PendingChange[] = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  const remaining = all.filter(c =>
    c.userId !== userId || (hotelId && c.hotelId !== hotelId)
  );
  localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
}
