/**
 * alertsStorage.ts — Thin localStorage adapter for reputation alerts.
 * Separated to avoid circular imports between notificationService and reviewDatabaseService.
 */

import type { ReputationAlert } from '../../../types/reputation';

const ALERTS_KEY = 'rmd_reputation_alerts';

export function readAlertsState(): ReputationAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as ReputationAlert[]) : [];
  } catch {
    return [];
  }
}

export function writeAlertsState(alerts: ReputationAlert[]): void {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}
