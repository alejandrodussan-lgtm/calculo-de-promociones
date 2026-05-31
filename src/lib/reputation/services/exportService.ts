/**
 * exportService.ts
 *
 * Exports reviews, AI analyses, and reputation reports to Excel (.xlsx) or CSV.
 * Uses SheetJS (xlsx) — the same library already loaded in index.html.
 * Can run in the browser (reviews module) without a server.
 */

import type { Review, ReviewExportOptions, AIReviewAnalysis } from '../../../types/reputation';

// SheetJS is loaded globally in index.html; in a proper Next.js build use:
// import * as XLSX from 'xlsx';
declare const XLSX: {
  utils: {
    book_new(): unknown;
    book_append_sheet(wb: unknown, ws: unknown, name: string): void;
    json_to_sheet(data: Record<string, unknown>[]): unknown;
    aoa_to_sheet(data: unknown[][]): unknown;
  };
  writeFile(wb: unknown, filename: string): void;
  write(wb: unknown, opts: { bookType: string; type: string }): unknown;
};

// ── Row builders ──────────────────────────────────────────────────────────────

function reviewToRow(review: Review): Record<string, unknown> {
  return {
    ID: review.id,
    Fuente: review.source,
    Hotel: review.hotelId,
    Autor: review.authorName,
    País: review.authorCountry ?? '',
    'Puntuación (0-10)': review.rating,
    'Rating normalizado (1-5)': (review.rating / 2).toFixed(1),
    Título: review.title ?? '',
    Comentario: review.comment ?? '',
    'Comentario positivo': review.positiveComment ?? '',
    'Comentario negativo': review.negativeComment ?? '',
    Idioma: review.language,
    'Fecha de reseña': review.reviewDate ? review.reviewDate.slice(0, 10) : '',
    Estado: review.status,
    Sentimiento: review.sentiment ?? '',
    'Riesgo reputacional': review.riskLevel ?? '',
    'Tema principal': review.mainTopic ?? '',
    'Temas secundarios': (review.secondaryTopics ?? []).join(', '),
    Departamento: review.department ?? '',
    'Respuesta publicada': review.responseText ?? '',
    'Fecha respuesta': review.responsePublishedAt ? review.responsePublishedAt.slice(0, 10) : '',
    'Publicado por': review.responsePublishedBy ?? '',
    'URL reseña': review.sourceUrl ?? '',
    'Notas internas': review.internalNotes ?? '',
    'Etiquetas': (review.tags ?? []).join(', '),
    'Importado desde': review.importedFromFile ?? '',
  };
}

function aiAnalysisToRow(analysis: AIReviewAnalysis): Record<string, unknown> {
  return {
    'ID análisis': analysis.analysisId,
    'ID reseña': analysis.reviewId,
    'Analizado': analysis.analyzedAt.slice(0, 16).replace('T', ' '),
    Modelo: analysis.model,
    Idioma: analysis.detectedLanguage,
    Sentimiento: analysis.sentiment,
    'Score sentimiento': analysis.sentimentScore,
    'Nivel de riesgo': analysis.riskLevel,
    'Tema principal': analysis.mainTopic,
    'Temas secundarios': analysis.secondaryTopics.join(', '),
    Departamento: analysis.department,
    'Frases clave': analysis.keyPhrases.join('; '),
    Halagos: analysis.compliments.join('; '),
    Quejas: analysis.complaints.join('; '),
    Sugerencias: analysis.suggestions.join('; '),
    'Urgencia (0-10)': analysis.urgencyScore,
    'Respuesta sugerida': analysis.generatedResponse,
  };
}

// ── Filter reviews ────────────────────────────────────────────────────────────

function applyFilters(reviews: Review[], options: ReviewExportOptions): Review[] {
  return reviews.filter(r => {
    if (options.hotelIds?.length && !options.hotelIds.includes(r.hotelId)) return false;
    if (options.sources?.length && !options.sources.includes(r.source)) return false;
    if (options.statuses?.length && !options.statuses.includes(r.status)) return false;
    if (options.sentiments?.length && r.sentiment && !options.sentiments.includes(r.sentiment)) return false;
    if (options.riskLevels?.length && r.riskLevel && !options.riskLevels.includes(r.riskLevel)) return false;
    if (options.dateFrom && r.reviewDate < options.dateFrom) return false;
    if (options.dateTo && r.reviewDate > options.dateTo) return false;
    return true;
  });
}

// ── Excel export ──────────────────────────────────────────────────────────────

/**
 * Exports filtered reviews (and optionally AI analyses) as an .xlsx file.
 * Triggers a browser download — must be called from the browser context.
 */
export function exportToExcel(reviews: Review[], options: ReviewExportOptions): void {
  const filtered = applyFilters(reviews, options);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Reviews
  const reviewRows = filtered.map(reviewToRow);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reviewRows), 'Reseñas');

  // Sheet 2: AI Analyses (optional)
  if (options.includeAIAnalysis) {
    const analysisRows = filtered
      .filter(r => r.aiAnalysis)
      .map(r => aiAnalysisToRow(r.aiAnalysis!));
    if (analysisRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analysisRows), 'Análisis IA');
    }
  }

  // Sheet 3: Critical reviews snapshot
  const critical = filtered.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high');
  if (critical.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(critical.map(reviewToRow)),
      'Críticas y Alto Riesgo'
    );
  }

  // Sheet 4: Response tracking
  if (options.includeResponses) {
    const responseRows = filtered.map(r => ({
      Hotel: r.hotelId,
      Fuente: r.source,
      Autor: r.authorName,
      Puntuación: r.rating,
      'Fecha reseña': r.reviewDate.slice(0, 10),
      Estado: r.status,
      'Respuesta': r.responseText ?? '',
      'Fecha respuesta': r.responsePublishedAt?.slice(0, 10) ?? '',
      'Publicado por': r.responsePublishedBy ?? '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(responseRows), 'Seguimiento Respuestas');
  }

  // Sheet 5: Summary by hotel
  const summaryRows = buildHotelSummary(filtered);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen por Hotel');

  const filename = buildFilename(options, 'xlsx');
  XLSX.writeFile(wb, filename);
}

// ── CSV export ────────────────────────────────────────────────────────────────

/**
 * Exports filtered reviews as a UTF-8 CSV with BOM (for Excel compatibility).
 */
export function exportToCSV(reviews: Review[], options: ReviewExportOptions): void {
  const filtered = applyFilters(reviews, options);
  const rows = filtered.map(reviewToRow);

  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? '').replace(/"/g, '""');
        return val.includes(',') || val.includes('\n') || val.includes('"')
          ? `"${val}"`
          : val;
      }).join(',')
    ),
  ];

  const bom = '﻿';
  const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildFilename(options, 'csv');
  a.click();
  URL.revokeObjectURL(url);
}

// ── Tripadvisor import template ───────────────────────────────────────────────

/**
 * Generates and downloads the Excel template for TripAdvisor manual import.
 */
export function downloadTripAdvisorTemplate(): void {
  const wb = XLSX.utils.book_new();
  const headers = [
    'reviewer_name', 'rating', 'title', 'comment',
    'review_date', 'language', 'review_url', 'hotel',
  ];
  const example = [
    'María García', 4, 'Excelente estadía',
    'El servicio fue muy bueno y las habitaciones estaban limpias.',
    '2025-05-15', 'es', 'https://www.tripadvisor.com/ShowUserReviews-...', 'GEH Suites Centro',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  XLSX.utils.book_append_sheet(wb, ws, 'Reseñas TripAdvisor');
  XLSX.writeFile(wb, 'plantilla_tripadvisor.xlsx');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildHotelSummary(reviews: Review[]): Record<string, unknown>[] {
  const byHotel: Record<string, Review[]> = {};
  reviews.forEach(r => {
    byHotel[r.hotelId] = byHotel[r.hotelId] ?? [];
    byHotel[r.hotelId].push(r);
  });

  return Object.entries(byHotel).map(([hotel, hrs]) => {
    const avg = hrs.reduce((s, r) => s + r.rating, 0) / hrs.length;
    const responded = hrs.filter(r => r.status === 'response_published').length;
    return {
      Hotel: hotel,
      'Total reseñas': hrs.length,
      'Puntuación media': Math.round(avg * 10) / 10,
      Respondidas: responded,
      'Tasa respuesta %': Math.round((responded / hrs.length) * 100),
      Positivas: hrs.filter(r => r.sentiment === 'positive').length,
      Neutras: hrs.filter(r => r.sentiment === 'neutral').length,
      Negativas: hrs.filter(r => r.sentiment === 'negative').length,
      Críticas: hrs.filter(r => r.sentiment === 'critical').length,
    };
  });
}

function buildFilename(options: ReviewExportOptions, ext: 'xlsx' | 'csv'): string {
  const date = new Date().toISOString().slice(0, 10);
  const hotel = options.hotelIds?.length === 1 ? `_${options.hotelIds[0].replace(/\s+/g, '_')}` : '';
  return `reputacion${hotel}_${date}.${ext}`;
}
