// ─────────────────────────────────────────────────────────────────────────────
// reputation.ts — Core types for the Reputación y Respuestas IA module
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewSource = 'google_business' | 'booking' | 'tripadvisor' | 'manual';
export type ReviewSentiment = 'positive' | 'neutral' | 'negative' | 'critical';
export type ReviewStatus =
  | 'pending_response'
  | 'response_draft'
  | 'response_ready'
  | 'response_published'
  | 'no_response_needed'
  | 'escalated';
export type ReviewLanguage = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it' | 'nl' | string;
export type HotelDepartment =
  | 'front_desk'
  | 'housekeeping'
  | 'food_beverage'
  | 'maintenance'
  | 'management'
  | 'spa'
  | 'concierge'
  | 'general';

export type ReputationRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ── Review ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  source: ReviewSource;
  externalId?: string;          // platform-native ID (e.g. Google reviewId)
  hotelId: string;
  propertyId?: string;          // Booking.com propertyId / Google locationId

  // Author
  authorName: string;
  authorCountry?: string;
  authorProfileUrl?: string;

  // Content
  rating: number;               // 0–10 normalized (Google 1–5 → ×2)
  title?: string;
  comment?: string;
  positiveComment?: string;     // Booking.com positive/negative split
  negativeComment?: string;
  language: ReviewLanguage;

  // Dates
  reviewDate: string;           // ISO
  publishedAt?: string;         // ISO — when visible on platform
  createdAt: string;            // ISO — when ingested into our system
  updatedAt: string;

  // Response
  responseText?: string;
  responseDraft?: string;
  responsePublishedAt?: string;
  responsePublishedBy?: string; // userId

  // Status & classification
  status: ReviewStatus;
  sentiment?: ReviewSentiment;
  riskLevel?: ReputationRiskLevel;
  mainTopic?: string;
  secondaryTopics?: string[];
  department?: HotelDepartment;

  // Meta
  sourceUrl?: string;
  manuallyMarkedPublished?: boolean;
  importedFromFile?: string;
  tags?: string[];
  internalNotes?: string;

  // AI analysis
  aiAnalysis?: AIReviewAnalysis;
}

// ── AI Analysis ───────────────────────────────────────────────────────────────

export interface AIReviewAnalysis {
  analysisId: string;
  reviewId: string;
  analyzedAt: string;
  model: string;

  detectedLanguage: ReviewLanguage;
  sentiment: ReviewSentiment;
  sentimentScore: number;       // -1.0 to +1.0
  riskLevel: ReputationRiskLevel;
  mainTopic: string;
  secondaryTopics: string[];
  department: HotelDepartment;

  keyPhrases: string[];
  compliments: string[];
  complaints: string[];
  suggestions: string[];

  urgencyScore: number;         // 0–10: how fast a response is needed
  responseRecommended: boolean;
  generatedResponse: string;
  alternativeResponses?: string[];

  brandVoiceScore?: number;     // 0–1: how well the response matches GEH voice
}

// ── Connector configs ─────────────────────────────────────────────────────────

export interface GoogleBusinessCredentials {
  clientId: string;             // from GOOGLE_OAUTH_CLIENT_ID env var
  clientSecret: string;        // NEVER on frontend — server-side only
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
}

export interface GoogleBusinessLocation {
  accountId: string;
  locationId: string;
  locationName: string;
  hotelId: string;
}

export interface BookingCredentials {
  machineAccountId: string;    // from BOOKING_MACHINE_ACCOUNT_ID env var
  apiKey: string;              // from BOOKING_API_KEY env var — server-side only
  environment: 'production' | 'sandbox';
}

export interface BookingProperty {
  propertyId: string;
  hotelId: string;
  propertyName: string;
}

// ── Import / Export ───────────────────────────────────────────────────────────

export interface ReviewImportRow {
  source: ReviewSource;
  hotelId: string;
  authorName: string;
  rating: number;
  title?: string;
  comment?: string;
  reviewDate: string;
  language?: string;
  sourceUrl?: string;
}

export interface ReviewExportOptions {
  hotelIds?: string[];
  sources?: ReviewSource[];
  statuses?: ReviewStatus[];
  sentiments?: ReviewSentiment[];
  riskLevels?: ReputationRiskLevel[];
  dateFrom?: string;
  dateTo?: string;
  format: 'xlsx' | 'csv';
  includeAIAnalysis?: boolean;
  includeResponses?: boolean;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationChannel = 'internal' | 'email' | 'whatsapp' | 'bitrix24';

export interface ReputationAlert {
  id: string;
  type: 'negative_review' | 'pending_too_long' | 'critical_risk' | 'unanswered_bulk';
  reviewId: string;
  hotelId: string;
  message: string;
  riskLevel: ReputationRiskLevel;
  createdAt: string;
  sentVia: NotificationChannel[];
  resolvedAt?: string;
  resolvedBy?: string;
}

// ── Review database change log ────────────────────────────────────────────────

export interface ReviewChangeLogEntry {
  id: string;
  reviewId: string;
  field: string;
  previousValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: string;  // userId
}

// ── Module state (localStorage) ───────────────────────────────────────────────

export interface ReputationModuleState {
  reviews: Review[];
  alerts: ReputationAlert[];
  changeLog: ReviewChangeLogEntry[];
  lastSyncedAt?: Partial<Record<ReviewSource, string>>;
  connectorStatus: Partial<Record<ReviewSource, 'connected' | 'disconnected' | 'error' | 'manual'>>;
}
