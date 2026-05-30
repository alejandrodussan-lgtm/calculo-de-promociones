/**
 * OTB AI Revenue Advisor — Service Layer
 *
 * Architecture stub for connecting an AI model to the OTB pickup analysis.
 * The pure-HTML frontend calls `generateAIRevenueRecommendations(payload)`
 * which routes to either:
 *   (a) rules-based engine (always available), or
 *   (b) AI model via a secure backend endpoint (when configured).
 *
 * SECURITY: Never put API keys in the browser frontend.
 * All AI calls must go through a serverless function / API route / backend proxy.
 *
 * To activate AI mode, set the environment variable:
 *   OTB_AI_ENDPOINT=https://your-backend.example.com/api/otb-ai
 *
 * The backend endpoint is responsible for:
 *   - Authenticating the request
 *   - Calling the AI provider (Anthropic Claude, OpenAI, etc.)
 *   - Returning a structured AIRevenueResponse
 */

// ── PAYLOAD TYPES ─────────────────────────────────────────────────────────────

export interface WeeklyPickupSummary {
  weekLabel: string;           // e.g. "Semana 1 (1-7)"
  weekNum: number;             // 1-5
  dateRange: string;           // e.g. "01/06 - 07/06"
  reservadasBase: number | null;
  reservadasActual: number | null;
  pickupHabs: number | null;   // rooms pickup for the week
  avgPickupPP: number | null;  // average pp pickup
  avgVelocity: number | null;  // avg velocity habs/day
  status: 'strong-up' | 'moderate-up' | 'stable' | 'moderate-down' | 'strong-down';
}

export interface DatePickupDetail {
  date: string;                // YYYY-MM-DD
  dayOfWeek: string;           // e.g. "Lunes"
  roomsBase: number | null;
  roomsActual: number | null;
  pickupHabs: number | null;
  occBase: number | null;
  occActual: number | null;
  pickupPP: number | null;
  velocityHabsDay: number | null;
  status: string;
  suggestedAction: string;
}

export interface AIRevenueAdvisorPayload {
  // Hotel context
  hotelName: string;
  month: string;               // e.g. "Junio 2026"
  comparisonType: string;      // "exactDate" | "dayOfMonth"

  // Cutoff dates
  baselineSnapshotDate: string | null;   // YYYY-MM-DD
  currentSnapshotDate: string | null;    // YYYY-MM-DD
  daysBetweenSnapshots: number | null;

  // Summary stats
  totalDatesAnalyzed: number;
  positivePickupDates: number;
  negativePickupDates: number;
  stableDates: number;
  totalRoomPickup: number | null;
  averagePickupPoints: number | null;    // pp
  averagePickupSpeed: number | null;     // habs/day

  // Detail arrays
  weeklyPickupSummary: WeeklyPickupSummary[];
  topGrowthDates: DatePickupDetail[];    // top 5 positive
  topDeclineDates: DatePickupDetail[];   // top 5 negative
  stagnantDates: DatePickupDetail[];     // stable + low occ
  criticalDates: DatePickupDetail[];     // strong-down

  // Occupancy context
  occupancyContext: {
    averageOccBase: number | null;
    averageOccActual: number | null;
    highOccDates: string[];    // dates with occ > 80%
    lowOccDates: string[];     // dates with occ < 40%
  };

  // Open-ended question to the model
  revenueManagerQuestion: string;

  // Optional: additional context
  additionalContext?: string;
}

// ── RESPONSE TYPES ────────────────────────────────────────────────────────────

export interface AIRevenueResponse {
  mode: 'ai' | 'rules';       // which engine generated this
  generatedAt: string;         // ISO timestamp

  executiveDiagnosis: string;
  opportunityDates: string[];
  criticalDates: string[];
  pricingRecommendations: string[];
  promotionalRecommendations: string[];
  restrictionRecommendations: string[];
  priorityActions: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    dates?: string[];
  }>;
  monthRisks: string[];
  suggestedFollowUp: string;
}

// ── PAYLOAD BUILDER ───────────────────────────────────────────────────────────

/**
 * Build the AI payload from the OTB module state.
 * Call this with the data from OTB_STATE after running the comparison.
 */
export function buildAIPayload(params: {
  hotelName: string;
  month: string;
  comparisonMode: string;
  beforeCutoff: string | null;
  afterCutoff: string | null;
  daysBetween: number | null;
  metrics: Record<string, any>;
  comparison: any[];
  weeklyComparison: any[];
}): AIRevenueAdvisorPayload {
  const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function toDateDetail(r: any): DatePickupDetail {
    const d = r.stayDate ? new Date(r.stayDate + 'T12:00:00') : null;
    return {
      date: r.stayDate || r.afterDate || '',
      dayOfWeek: d ? DAYS_ES[d.getDay()] : '',
      roomsBase: r.roomsBefore ?? null,
      roomsActual: r.roomsAfter ?? null,
      pickupHabs: r.roomPickup ?? null,
      occBase: r.occBefore ?? null,
      occActual: r.occAfter ?? null,
      pickupPP: r.pickup ?? null,
      velocityHabsDay: r.velocityHabs ?? null,
      status: r.status,
      suggestedAction: r.status === 'strong-up' ? 'Evaluar incremento tarifario'
        : r.status === 'moderate-up' ? 'Mantener estrategia, revisar mejora tarifaria'
        : r.status === 'strong-down' ? 'Acción comercial prioritaria'
        : r.status === 'moderate-down' ? 'Activar estímulo táctico'
        : 'Monitorear',
    };
  }

  const rows = params.comparison || [];
  const wc = params.weeklyComparison || [];
  const m = params.metrics || {};

  const topGrowth   = rows.filter((r: any) => r.status === 'strong-up' || r.status === 'moderate-up')
                          .sort((a: any, b: any) => (b.roomPickup ?? b.pickup ?? 0) - (a.roomPickup ?? a.pickup ?? 0))
                          .slice(0, 5).map(toDateDetail);
  const topDecline  = rows.filter((r: any) => r.status === 'strong-down' || r.status === 'moderate-down')
                          .sort((a: any, b: any) => (a.roomPickup ?? a.pickup ?? 0) - (b.roomPickup ?? b.pickup ?? 0))
                          .slice(0, 5).map(toDateDetail);
  const stagnant    = rows.filter((r: any) => r.status === 'stable' && (r.occAfter ?? 100) < 50)
                          .map(toDateDetail);
  const critical    = rows.filter((r: any) => r.status === 'strong-down').map(toDateDetail);

  const occVals = rows.filter((r: any) => r.occAfter !== null).map((r: any) => r.occAfter as number);
  const occBaseVals = rows.filter((r: any) => r.occBefore !== null).map((r: any) => r.occBefore as number);
  const avgOccActual = occVals.length ? occVals.reduce((a, b) => a + b, 0) / occVals.length : null;
  const avgOccBase = occBaseVals.length ? occBaseVals.reduce((a, b) => a + b, 0) / occBaseVals.length : null;

  const weekSummary: WeeklyPickupSummary[] = (wc || []).map((w: any) => ({
    weekLabel: w.weekLabel,
    weekNum: w.weekNum,
    dateRange: '',
    reservadasBase: w.totalRoomsBase ?? null,
    reservadasActual: w.totalRoomsActual ?? null,
    pickupHabs: w.totalRoomPickup ?? null,
    avgPickupPP: w.avgPickup ?? null,
    avgVelocity: w.avgVelocity ?? null,
    status: w.status,
  }));

  return {
    hotelName: params.hotelName,
    month: params.month,
    comparisonType: params.comparisonMode,
    baselineSnapshotDate: params.beforeCutoff,
    currentSnapshotDate: params.afterCutoff,
    daysBetweenSnapshots: params.daysBetween,
    totalDatesAnalyzed: m.total ?? 0,
    positivePickupDates: m.up ?? 0,
    negativePickupDates: m.down ?? 0,
    stableDates: m.stable ?? 0,
    totalRoomPickup: m.hasRooms ? (m.totalRoomPickup ?? null) : null,
    averagePickupPoints: m.avgPickup ?? null,
    averagePickupSpeed: m.avgVelocityHabs ?? null,
    weeklyPickupSummary: weekSummary,
    topGrowthDates: topGrowth,
    topDeclineDates: topDecline,
    stagnantDates: stagnant,
    criticalDates: critical,
    occupancyContext: {
      averageOccBase: avgOccBase,
      averageOccActual: avgOccActual,
      highOccDates: rows.filter((r: any) => (r.occAfter ?? 0) > 80).map((r: any) => r.stayDate || r.afterDate),
      lowOccDates:  rows.filter((r: any) => (r.occAfter ?? 100) < 40).map((r: any) => r.stayDate || r.afterDate),
    },
    revenueManagerQuestion:
      'Actúa como Revenue Manager senior hotelero. Analiza el siguiente comportamiento de pickup del OTB. ' +
      'Identifica oportunidades de subida tarifaria, fechas críticas, semanas con riesgo, ' +
      'acciones promocionales recomendadas y prioridades de intervención. ' +
      'Estructura tu respuesta en: diagnóstico ejecutivo, fechas con oportunidad, ' +
      'fechas críticas, recomendaciones tarifarias, recomendaciones promocionales, ' +
      'recomendaciones de restricciones, prioridades de acción, riesgos del mes, ' +
      'y próximo seguimiento sugerido.',
  };
}

// ── MAIN ENTRY POINT ──────────────────────────────────────────────────────────

/**
 * Generate Revenue Manager recommendations.
 *
 * Routes to AI or rules-based engine based on configuration.
 *
 * To enable AI mode, the backend endpoint must be configured via
 * an environment variable at build time. The frontend must never
 * contain API keys directly.
 *
 * Usage:
 *   const result = await generateAIRevenueRecommendations(payload);
 */
export async function generateAIRevenueRecommendations(
  payload: AIRevenueAdvisorPayload
): Promise<AIRevenueResponse> {
  // Check if AI endpoint is configured (injected at build time by your CI/CD)
  const AI_ENDPOINT = (typeof process !== 'undefined' && process.env?.OTB_AI_ENDPOINT)
    || (typeof window !== 'undefined' && (window as any).__OTB_AI_ENDPOINT__);

  if (AI_ENDPOINT) {
    try {
      const resp = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`AI endpoint returned ${resp.status}`);
      const data = await resp.json() as AIRevenueResponse;
      return { ...data, mode: 'ai', generatedAt: new Date().toISOString() };
    } catch (err) {
      console.warn('[OTB AI] Falling back to rules engine:', err);
      // Fall through to rules engine
    }
  }

  // Rules-based fallback (always available)
  return generateRulesBasedResponse(payload);
}

// ── RULES-BASED ENGINE ────────────────────────────────────────────────────────

function generateRulesBasedResponse(payload: AIRevenueAdvisorPayload): AIRevenueResponse {
  const positive = payload.positivePickupDates;
  const negative = payload.negativePickupDates;
  const stable   = payload.stableDates;
  const total    = payload.totalDatesAnalyzed;

  const pctPositive = total ? Math.round(positive / total * 100) : 0;
  const pctNegative = total ? Math.round(negative / total * 100) : 0;

  let generalState = 'mixto';
  if (pctPositive > 60)  generalState = 'positivo';
  if (pctNegative > 60)  generalState = 'negativo';
  if (stable / total > 0.5) generalState = 'estancado';

  const diagnoses: string[] = [];
  if (generalState === 'positivo') {
    diagnoses.push(`El mes presenta tendencia positiva. ${pctPositive}% de las fechas muestran pickup positivo frente al corte base.`);
  } else if (generalState === 'negativo') {
    diagnoses.push(`El mes presenta tendencia negativa. ${pctNegative}% de las fechas muestran caída de pickup. Se requiere intervención comercial urgente.`);
  } else if (generalState === 'estancado') {
    diagnoses.push('El mes está estancado. La mayoría de fechas se mantienen sin variación. Se recomienda revisar visibilidad y competitividad tarifaria.');
  } else {
    diagnoses.push(`Comportamiento mixto. ${pctPositive}% de fechas con pickup positivo, ${pctNegative}% con pickup negativo. Gestión diferenciada requerida.`);
  }

  if (payload.averagePickupSpeed !== null) {
    const vel = payload.averagePickupSpeed;
    diagnoses.push(`Velocidad de pickup promedio: ${vel > 0 ? '+' : ''}${vel.toFixed(2)} habs/día${payload.daysBetweenSnapshots ? ` (entre ${payload.daysBetweenSnapshots} días)` : ''}.`);
  }

  const pricing: string[] = [];
  payload.topGrowthDates.forEach(d => {
    if ((d.occActual ?? 0) > 70 || (d.pickupHabs ?? 0) > 5) {
      pricing.push(`${d.date} (${d.dayOfWeek}): Occ ${d.occActual?.toFixed(0)}% con pickup +${d.pickupHabs ?? d.pickupPP?.toFixed(1)} → Evaluar incremento tarifario gradual`);
    }
  });

  const promotional: string[] = [];
  payload.topDeclineDates.forEach(d => {
    promotional.push(`${d.date} (${d.dayOfWeek}): Caída ${d.pickupHabs ?? d.pickupPP?.toFixed(1)} → Activar estímulo táctico, revisar tarifas vs compset`);
  });

  const restrictions: string[] = [];
  if (payload.occupancyContext.highOccDates.length > 0) {
    restrictions.push(`Fechas con alta ocupación (>80%): ${payload.occupancyContext.highOccDates.slice(0, 5).join(', ')} → Aplicar mínimo de noches, cerrar descuentos`);
  }

  const priorities: AIRevenueResponse['priorityActions'] = [];
  if (payload.criticalDates.length > 0) {
    priorities.push({
      priority: 'high',
      action: `Fechas críticas con caída fuerte: revisar tarifa y activar estímulo táctico urgente`,
      dates: payload.criticalDates.map(d => d.date),
    });
  }
  if (payload.topDeclineDates.length > 0 && payload.criticalDates.length === 0) {
    priorities.push({
      priority: 'high',
      action: 'Fechas con pickup negativo: revisar competitividad tarifaria y mejorar visibilidad en OTAs',
      dates: payload.topDeclineDates.map(d => d.date),
    });
  }
  const criticalWks = payload.weeklyPickupSummary.filter(w => (w.avgPickupPP ?? 0) < -3);
  if (criticalWks.length) {
    priorities.push({
      priority: 'medium',
      action: `Semanas con pickup negativo (${criticalWks.map(w => w.weekLabel).join(', ')}): crear campaña para esa ventana de estancia, revisar mínimos de noches`,
    });
  }
  if (payload.stagnantDates.length > 0) {
    priorities.push({
      priority: 'low',
      action: 'Fechas estables con baja ocupación: monitorear y evaluar visibilidad de contenido y distribución',
      dates: payload.stagnantDates.map(d => d.date),
    });
  }

  return {
    mode: 'rules',
    generatedAt: new Date().toISOString(),
    executiveDiagnosis: diagnoses.join(' '),
    opportunityDates: pricing,
    criticalDates: payload.criticalDates.map(d => d.date),
    pricingRecommendations: pricing.length ? pricing : ['Sin fechas con oportunidad de tarifa identificadas en este corte.'],
    promotionalRecommendations: promotional.length ? promotional : ['Sin fechas de alto riesgo comercial en este corte.'],
    restrictionRecommendations: restrictions.length ? restrictions : ['Sin restricciones recomendadas en este período.'],
    priorityActions: priorities,
    monthRisks: negative > total * 0.4 ? ['Riesgo de cierre del mes con pickup global negativo'] : [],
    suggestedFollowUp: `Próximo seguimiento sugerido: ${payload.daysBetweenSnapshots ? `en ${Math.round(payload.daysBetweenSnapshots / 2)} días` : 'en el próximo corte OTB'}. Revisar evolución de fechas críticas y velocidad de pickup.`,
  };
}
