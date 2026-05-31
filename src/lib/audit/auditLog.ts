/**
 * auditLog.ts — Append-only audit trail
 * Stored in localStorage (key: rmd_audit_log). Max 2000 entries (FIFO).
 * Swap with API POST in production.
 */

import type { AuditLog, AuditAction } from '../../types/auth';

const AUDIT_KEY = 'rmd_audit_log';
const MAX_ENTRIES = 2000;

export interface WriteAuditParams {
  action: AuditAction | string;
  userId: string | null;
  userName: string | null;
  hotelId: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  entityId?: string | null;
  entityType?: string;
  module?: string;
  metadata?: Record<string, unknown> | null;
}

export function writeAuditLog(params: WriteAuditParams): void {
  try {
    const logs: AuditLog[] = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    logs.unshift({
      id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      ...params,
      createdAt: new Date().toISOString(),
    });
    if (logs.length > MAX_ENTRIES) logs.splice(MAX_ENTRIES);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
  } catch { /* swallow — audit must never break the app */ }
}

export function getAuditLogs(limit = 500): AuditLog[] {
  try {
    return (JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]') as AuditLog[]).slice(0, limit);
  } catch {
    return [];
  }
}

export function getAuditLogsByUser(userId: string, limit = 200): AuditLog[] {
  return getAuditLogs(2000).filter(l => l.userId === userId).slice(0, limit);
}

export function getAuditLogsByHotel(hotelId: string, limit = 200): AuditLog[] {
  return getAuditLogs(2000).filter(l => l.hotelId === hotelId).slice(0, limit);
}

export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_KEY);
}
