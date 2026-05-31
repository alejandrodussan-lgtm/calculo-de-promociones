/**
 * sessionManager.ts — 24h inactivity tracker
 *
 * Usage:
 *   import { startSessionActivityTracker } from './sessionManager';
 *   startSessionActivityTracker(session, onExpire);
 */

import type { AuthSession } from '../../types/auth';
import { touchSession, clearSession } from './authService';

const INACTIVITY_MS = 24 * 3600 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const THROTTLE_MS = 60 * 1000;

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _lastTouch = Date.now();

export function startSessionActivityTracker(
  getSession: () => AuthSession | null,
  onExpire: () => void
): () => void {
  const touch = () => {
    const now = Date.now();
    if (now - _lastTouch < THROTTLE_MS) return;
    _lastTouch = now;
    const s = getSession();
    if (s) touchSession(s);
  };

  const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'] as const;
  events.forEach(ev => document.addEventListener(ev, touch, { passive: true }));

  _intervalId = setInterval(() => {
    const s = getSession();
    if (!s) return;
    const inactive = Date.now() - new Date(s.lastActivityAt).getTime();
    if (inactive >= INACTIVITY_MS) {
      clearSession();
      onExpire();
    }
  }, CHECK_INTERVAL_MS);

  return () => {
    events.forEach(ev => document.removeEventListener(ev, touch));
    if (_intervalId) clearInterval(_intervalId);
  };
}
