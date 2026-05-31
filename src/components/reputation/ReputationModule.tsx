/**
 * ReputationModule.tsx — Main orchestrator for the Reputación y Respuestas IA module.
 *
 * Architecture:
 *   - Works immediately with manual Excel/CSV import (TripAdvisor)
 *   - Google Business and Booking.com connectors activate when credentials are set
 *   - AI analysis calls POST /api/reputation/analyze (requires ANTHROPIC_API_KEY on server)
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { Review, ReviewSource, ReviewStatus } from '../../types/reputation';
import { getAllReviews, upsertReview, saveAIAnalysis, saveDraftResponse, markResponsePublished, computeStats } from '../../lib/reputation/services/reviewDatabaseService';
import { downloadTripAdvisorTemplate, exportToExcel } from '../../lib/reputation/services/exportService';
import { parseImportRows } from '../../lib/reputation/connectors/tripadvisorManualConnector';
import type { TripAdvisorImportRow } from '../../lib/reputation/connectors/tripadvisorManualConnector';
import { ReviewCard } from './ReviewCard';
import { ReviewResponseEditor } from './ReviewResponseEditor';
import { ReviewImportPanel } from './ReviewImportPanel';

interface ReputationModuleProps {
  currentHotelId: string;
  currentUserId: string;
  currentUserName: string;
}

const SOURCE_LABELS: Record<ReviewSource, string> = {
  google_business: '🔵 Google',
  booking: '🏨 Booking',
  tripadvisor: '🦉 TripAdvisor',
  manual: '📋 Manual',
};

const STATUS_FILTER_OPTIONS: Array<{ value: ReviewStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending_response', label: '⏳ Pendiente' },
  { value: 'response_draft', label: '✏️ Borrador' },
  { value: 'response_published', label: '🟢 Publicada' },
  { value: 'escalated', label: '🔴 Escalada' },
];

export function ReputationModule({ currentHotelId, currentUserId, currentUserName }: ReputationModuleProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Review | null>(null);
  const [filterSource, setFilterSource] = useState<ReviewSource | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'all'>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [view, setView] = useState<'list' | 'stats'>('list');

  function reload() {
    setReviews(getAllReviews());
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    return reviews
      .filter(r => r.hotelId === currentHotelId || currentHotelId === 'all')
      .filter(r => filterSource === 'all' || r.source === filterSource)
      .filter(r => filterStatus === 'all' || r.status === filterStatus)
      .filter(r => {
        if (!filterSearch) return true;
        const q = filterSearch.toLowerCase();
        return r.authorName.toLowerCase().includes(q) ||
               (r.comment ?? '').toLowerCase().includes(q) ||
               (r.mainTopic ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
  }, [reviews, currentHotelId, filterSource, filterStatus, filterSearch]);

  const stats = useMemo(() => computeStats(currentHotelId !== 'all' ? currentHotelId : undefined), [reviews, currentHotelId]);

  async function handleAnalyze(review: Review) {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/reputation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });
      const data = await res.json();
      if (data.ok && data.analysis) {
        saveAIAnalysis(review.id, data.analysis, currentUserId);
        reload();
        setSelected(getAllReviews().find(r => r.id === review.id) ?? review);
      } else {
        alert(`Error al analizar: ${data.error ?? 'Error desconocido'}`);
      }
    } catch (e) {
      alert(`Error de red: ${String(e)}`);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleImport(rows: Array<{ source: 'tripadvisor' | string; hotelId: string; authorName: string; rating: number; title?: string; comment?: string; reviewDate: string; language?: string; sourceUrl?: string }>, filename: string) {
    // rows come from ReviewImportPanel already normalized as ReviewImportRow
    // We re-use parseImportRows with already-typed TripAdvisorImportRow format
    const rawRows: TripAdvisorImportRow[] = rows.map(r => ({
      reviewer_name: r.authorName,
      rating: r.rating,           // 1–5 from panel
      title: r.title,
      comment: r.comment,
      review_date: r.reviewDate,
      language: r.language,
      review_url: r.sourceUrl,
      hotel: r.hotelId,
    }));
    const result = parseImportRows(rawRows, currentHotelId, filename);
    result.imported.forEach(rev => upsertReview(rev, currentUserId));
    reload();
    setShowImport(false);
    alert(`✅ Importadas ${result.imported.length} reseñas. ${result.skipped.length} omitidas.`);
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* LEFT PANEL */}
      <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1.5px solid var(--gold-border)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gold-border)', background: 'var(--gold-pale)' }}>
          <div style={{ fontWeight: 900, fontSize: '.88rem', color: 'var(--gold-dark)', textTransform: 'uppercase', letterSpacing: .8 }}>
            🏆 Reputación y Respuestas IA
          </div>
          <div style={{ fontSize: '.68rem', color: 'var(--gray3)', marginTop: 2 }}>
            {stats.total} reseñas · {stats.pendingResponse} pendientes · {stats.responseRate}% respondidas · ⭐ {stats.averageRating}/10
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--gold-border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setShowImport(!showImport)} style={{ padding: '6px 12px', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer', fontSize: '.72rem' }}>
            {showImport ? '✕ Cerrar' : '📂 Importar TripAdvisor'}
          </button>
          <button onClick={() => exportToExcel(reviews, { format: 'xlsx', hotelIds: currentHotelId !== 'all' ? [currentHotelId] : undefined, includeAIAnalysis: true, includeResponses: true })} style={{ padding: '6px 12px', border: '1.5px solid var(--gold-border)', borderRadius: 6, background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.72rem' }}>
            ⬇ Exportar Excel
          </button>
          <button onClick={() => setView(v => v === 'list' ? 'stats' : 'list')} style={{ padding: '6px 12px', border: '1.5px solid var(--gold-border)', borderRadius: 6, background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.72rem' }}>
            {view === 'list' ? '📊 Ver estadísticas' : '📋 Ver lista'}
          </button>
        </div>

        {/* Import panel */}
        {showImport && (
          <div style={{ padding: 12, borderBottom: '1px solid var(--gold-border)' }}>
            <ReviewImportPanel hotelId={currentHotelId} onImport={handleImport} onDownloadTemplate={downloadTripAdvisorTemplate} />
          </div>
        )}

        {/* Filters */}
        {view === 'list' && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--gold-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              placeholder="Buscar por autor, comentario o tema..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--gold-border)', borderRadius: 6, fontSize: '.75rem', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value as ReviewSource | 'all')} style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--gold-border)', borderRadius: 6, fontSize: '.72rem', fontFamily: 'inherit' }}>
                <option value="all">Todos los canales</option>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ReviewStatus | 'all')} style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--gold-border)', borderRadius: 6, fontSize: '.72rem', fontFamily: 'inherit' }}>
                {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ fontSize: '.66rem', color: '#888' }}>{filtered.length} de {reviews.length} reseñas</div>
          </div>
        )}

        {/* List or Stats */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {view === 'stats' ? (
            <StatsPanel stats={stats} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40, fontSize: '.8rem' }}>
              {reviews.length === 0 ? 'Importa reseñas con el botón de arriba para comenzar.' : 'No hay reseñas que coincidan con los filtros.'}
            </div>
          ) : (
            filtered.map(r => (
              <ReviewCard key={r.id} review={r} selected={selected?.id === r.id} onSelect={setSelected} />
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {selected ? (
          <ReviewResponseEditor
            review={selected}
            analyzing={analyzing}
            onAnalyze={() => handleAnalyze(selected)}
            onSaveDraft={draft => { saveDraftResponse(selected.id, draft, currentUserId); reload(); setSelected(getAllReviews().find(r => r.id === selected.id) ?? selected); }}
            onMarkPublished={text => { markResponsePublished(selected.id, text, currentUserName); reload(); setSelected(getAllReviews().find(r => r.id === selected.id) ?? selected); }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#bbb', padding: 60, fontSize: '.9rem' }}>
            Selecciona una reseña para ver el detalle y generar la respuesta.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats mini-panel ──────────────────────────────────────────────────────────

function StatsPanel({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const items = [
    { label: 'Total reseñas', value: stats.total },
    { label: 'Puntuación media', value: `⭐ ${stats.averageRating}/10` },
    { label: 'Tasa de respuesta', value: `${stats.responseRate}%` },
    { label: 'Pendientes de respuesta', value: stats.pendingResponse },
    { label: 'Riesgo crítico', value: stats.criticalRisk },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 4 }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: '.62rem', color: 'var(--gray3)', textTransform: 'uppercase', letterSpacing: .6, fontWeight: 800, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--gold-dark)' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
