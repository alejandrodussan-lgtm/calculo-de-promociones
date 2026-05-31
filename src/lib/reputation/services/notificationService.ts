/**
 * notificationService.ts
 *
 * Generates and manages reputation alerts for the Reputación module.
 *
 * Current channels: internal (localStorage-based alert feed).
 * Future channels: email, WhatsApp Business API, Bitrix24 webhooks.
 * Add new channels by implementing the NotificationChannelHandler interface.
 */

import type {
  Review,
  ReputationAlert,
  NotificationChannel,
  ReputationRiskLevel,
} from '../../../types/reputation';
import { readAlertsState, writeAlertsState } from './alertsStorage';

const PENDING_TOO_LONG_HOURS = 24;

// ── Channel handler interface (extensible) ────────────────────────────────────

export interface NotificationChannelHandler {
  channel: NotificationChannel;
  isConfigured(): boolean;
  send(alert: ReputationAlert): Promise<{ ok: boolean; error?: string }>;
}

// ── Internal channel (always available) ──────────────────────────────────────

const internalChannel: NotificationChannelHandler = {
  channel: 'internal',
  isConfigured: () => true,
  async send(alert) {
    // Already stored by createAlert — just mark it as sent via internal
    return { ok: true };
  },
};

// ── Email channel stub ────────────────────────────────────────────────────────

const emailChannel: NotificationChannelHandler = {
  channel: 'email',
  isConfigured: () => !!(
    typeof process !== 'undefined' && process.env?.SMTP_HOST && process.env?.SMTP_FROM
  ),
  async send(alert) {
    // Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, REPUTATION_ALERT_EMAIL
    // Use nodemailer or a transactional email provider (SendGrid, Resend, Mailgun)
    console.warn('[notificationService] Email channel not yet implemented. Configure SMTP env vars.');
    return { ok: false, error: 'Email channel not implemented. Set SMTP_HOST and related env vars.' };
  },
};

// ── WhatsApp Business stub ────────────────────────────────────────────────────

const whatsappChannel: NotificationChannelHandler = {
  channel: 'whatsapp',
  isConfigured: () => !!(
    typeof process !== 'undefined' && process.env?.WHATSAPP_BUSINESS_TOKEN
  ),
  async send(alert) {
    // Requires WHATSAPP_BUSINESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_RECIPIENT_NUMBER
    // Use Meta Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
    console.warn('[notificationService] WhatsApp channel not yet implemented.');
    return { ok: false, error: 'WhatsApp channel not implemented. Set WHATSAPP_BUSINESS_TOKEN.' };
  },
};

// ── Bitrix24 stub ─────────────────────────────────────────────────────────────

const bitrix24Channel: NotificationChannelHandler = {
  channel: 'bitrix24',
  isConfigured: () => !!(
    typeof process !== 'undefined' && process.env?.BITRIX24_WEBHOOK_URL
  ),
  async send(alert) {
    // Requires BITRIX24_WEBHOOK_URL
    // POST to the webhook with the alert payload
    const webhookUrl = process.env?.BITRIX24_WEBHOOK_URL;
    if (!webhookUrl) return { ok: false, error: 'BITRIX24_WEBHOOK_URL not set.' };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[GEH Suites - Reputación] ${alert.message}`,
          riskLevel: alert.riskLevel,
          hotelId: alert.hotelId,
          reviewId: alert.reviewId,
          type: alert.type,
        }),
      });
      return res.ok ? { ok: true } : { ok: false, error: `Bitrix24 error ${res.status}` };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

// ── Channel registry ──────────────────────────────────────────────────────────

const CHANNEL_HANDLERS: NotificationChannelHandler[] = [
  internalChannel,
  emailChannel,
  whatsappChannel,
  bitrix24Channel,
];

function getConfiguredChannels(): NotificationChannelHandler[] {
  return CHANNEL_HANDLERS.filter(h => h.isConfigured());
}

// ── Alert creation ────────────────────────────────────────────────────────────

async function createAlert(
  type: ReputationAlert['type'],
  review: Review,
  message: string,
  riskLevel: ReputationRiskLevel
): Promise<ReputationAlert> {
  const alert: ReputationAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type,
    reviewId: review.id,
    hotelId: review.hotelId,
    message,
    riskLevel,
    createdAt: new Date().toISOString(),
    sentVia: [],
  };

  // Dispatch to all configured channels
  const configured = getConfiguredChannels();
  const results = await Promise.allSettled(configured.map(h => h.send(alert)));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.ok) {
      alert.sentVia.push(configured[i].channel);
    }
  });

  // Persist to alert store
  const state = readAlertsState();
  state.unshift(alert);
  if (state.length > 1000) state.splice(1000);
  writeAlertsState(state);

  return alert;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Evaluates a review and fires alerts based on risk level and sentiment.
 */
export async function evaluateAndAlert(review: Review): Promise<ReputationAlert[]> {
  const fired: ReputationAlert[] = [];

  if (review.riskLevel === 'critical' || review.riskLevel === 'high') {
    fired.push(await createAlert(
      'negative_review',
      review,
      `⚠️ Reseña ${review.riskLevel === 'critical' ? 'crítica' : 'negativa'} recibida en ${review.source} para ${review.hotelId}. ` +
      `Rating: ${review.rating}/10. Autor: ${review.authorName}. ` +
      `Tema: ${review.mainTopic ?? 'General'}.`,
      review.riskLevel
    ));
  }

  return fired;
}

/**
 * Scans all pending reviews and alerts for those that have been waiting
 * longer than PENDING_TOO_LONG_HOURS without a response.
 */
export async function alertPendingTooLong(reviews: Review[]): Promise<ReputationAlert[]> {
  const cutoff = Date.now() - PENDING_TOO_LONG_HOURS * 3600 * 1000;
  const fired: ReputationAlert[] = [];

  const overdue = reviews.filter(r =>
    r.status === 'pending_response' &&
    new Date(r.reviewDate).getTime() < cutoff
  );

  for (const r of overdue) {
    const hoursWaiting = Math.round((Date.now() - new Date(r.reviewDate).getTime()) / 3600000);
    fired.push(await createAlert(
      'pending_too_long',
      r,
      `⏰ Reseña sin respuesta por ${hoursWaiting} horas. Canal: ${r.source}. Hotel: ${r.hotelId}. Autor: ${r.authorName}.`,
      r.riskLevel ?? 'medium'
    ));
  }

  return fired;
}

/**
 * Returns all alerts, optionally filtered by hotel.
 */
export function getAlerts(hotelId?: string): ReputationAlert[] {
  const all = readAlertsState();
  return hotelId ? all.filter(a => a.hotelId === hotelId) : all;
}

/**
 * Marks an alert as resolved.
 */
export function resolveAlert(alertId: string, resolvedBy: string): boolean {
  const state = readAlertsState();
  const idx = state.findIndex(a => a.id === alertId);
  if (idx < 0) return false;
  state[idx] = { ...state[idx], resolvedAt: new Date().toISOString(), resolvedBy };
  writeAlertsState(state);
  return true;
}
