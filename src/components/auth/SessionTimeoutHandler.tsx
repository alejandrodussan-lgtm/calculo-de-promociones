/**
 * SessionTimeoutHandler.tsx — Tracks user activity and fires onTimeout after
 * a configurable period of inactivity (default: 24 hours).
 *
 * Monitored events: click, scroll, keydown, mousemove.
 * The component renders nothing visible — it is a pure behaviour component.
 *
 * Usage:
 *   <SessionTimeoutHandler onTimeout={handleSessionExpired} />
 *   <SessionTimeoutHandler onTimeout={handleSessionExpired} inactivityMs={30 * 60 * 1000} />
 */

import { useEffect, useRef, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['click', 'scroll', 'keydown', 'mousemove'];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SessionTimeoutHandlerProps {
  /**
   * Callback fired when the user has been inactive for `inactivityMs` milliseconds.
   * The parent component is responsible for logging out the session.
   */
  onTimeout: () => void;
  /**
   * Duration of inactivity in milliseconds before onTimeout is called.
   * Defaults to 24 hours (86 400 000 ms).
   */
  inactivityMs?: number;
  /**
   * Whether to suppress the timeout (e.g. when no session is active).
   * When true, all listeners are removed and the timer is cleared.
   */
  paused?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SessionTimeoutHandler({
  onTimeout,
  inactivityMs = TWENTY_FOUR_HOURS_MS,
  paused = false,
}: SessionTimeoutHandlerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep the callback ref up to date without re-binding event listeners
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, inactivityMs);
  }, [inactivityMs]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start the initial countdown
    resetTimer();

    // Bind activity listeners
    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [paused, resetTimer]);

  // This component renders nothing
  return null;
}

export default SessionTimeoutHandler;
