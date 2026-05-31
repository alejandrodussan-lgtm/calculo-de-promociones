import React, { useState } from 'react';
import type { Review, AIReviewAnalysis } from '../../types/reputation';

interface ReviewResponseEditorProps {
  review: Review;
  onSaveDraft: (draft: string) => void;
  onMarkPublished: (responseText: string) => void;
  onAnalyze: () => Promise<void>;
  analyzing?: boolean;
}

export function ReviewResponseEditor({
  review,
  onSaveDraft,
  onMarkPublished,
  onAnalyze,
  analyzing = false,
}: ReviewResponseEditorProps) {
  const [draft, setDraft] = useState(review.responseDraft ?? review.aiAnalysis?.generatedResponse ?? '');
  const [copied, setCopied] = useState(false);

  const analysis: AIReviewAnalysis | undefined = review.aiAnalysis;

  const canReply = !(review.tags ?? []).includes('score_only_no_reply_allowed');
  const isPublished = review.status === 'response_published';

  function handleCopy() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 4px' }}>
      {/* Review content */}
      <div style={{ background: '#f9f6f0', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--gold-border)' }}>
        <div style={{ fontWeight: 800, fontSize: '.78rem', color: 'var(--gold-dark)', marginBottom: 8 }}>
          ⭐ {review.rating}/10 — {review.authorName}
          <span style={{ fontWeight: 400, color: '#888', marginLeft: 8, fontSize: '.7rem' }}>{review.reviewDate.slice(0, 10)}</span>
        </div>
        {review.positiveComment && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: '.64rem', fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase' }}>👍 Positivo</span>
            <p style={{ margin: '2px 0', fontSize: '.78rem' }}>{review.positiveComment}</p>
          </div>
        )}
        {review.negativeComment && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: '.64rem', fontWeight: 700, color: '#c62828', textTransform: 'uppercase' }}>👎 Negativo</span>
            <p style={{ margin: '2px 0', fontSize: '.78rem' }}>{review.negativeComment}</p>
          </div>
        )}
        {review.comment && !review.positiveComment && !review.negativeComment && (
          <p style={{ margin: 0, fontSize: '.78rem' }}>{review.comment}</p>
        )}
        {!canReply && (
          <div style={{ marginTop: 8, fontSize: '.7rem', background: '#fff3cd', border: '1px solid #f5c842', borderRadius: 6, padding: '6px 10px', color: '#856404' }}>
            ℹ️ Esta reseña solo tiene puntuación (sin comentario escrito). Booking.com no permite responder a este tipo de reseñas.
          </div>
        )}
      </div>

      {/* AI Analysis panel */}
      {analysis && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '.7rem' }}>
          <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '8px 12px' }}>
            <strong>Sentimiento:</strong> {analysis.sentiment} ({analysis.sentimentScore > 0 ? '+' : ''}{analysis.sentimentScore.toFixed(2)})
            <br /><strong>Riesgo:</strong> {analysis.riskLevel}
            <br /><strong>Idioma:</strong> {analysis.detectedLanguage}
            <br /><strong>Urgencia:</strong> {analysis.urgencyScore}/10
          </div>
          <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '8px 12px' }}>
            <strong>Tema:</strong> {analysis.mainTopic}
            <br /><strong>Departamento:</strong> {analysis.department}
            {analysis.complaints.length > 0 && (
              <><br /><strong>Quejas:</strong> {analysis.complaints.join(', ')}</>
            )}
          </div>
        </div>
      )}

      {/* Analyze button */}
      {!analysis && canReply && (
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          style={{
            padding: '9px 18px', background: 'var(--gold)', color: '#fff', border: 'none',
            borderRadius: 8, fontWeight: 800, cursor: analyzing ? 'not-allowed' : 'pointer',
            opacity: analyzing ? .7 : 1, fontSize: '.8rem',
          }}
        >
          {analyzing ? '⏳ Analizando con IA...' : '🤖 Analizar y generar respuesta'}
        </button>
      )}

      {/* Response editor */}
      {canReply && !isPublished && (
        <>
          <div>
            <label style={{ fontSize: '.64rem', fontWeight: 800, color: 'var(--gray3)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 6 }}>
              Respuesta {analysis ? '(generada por IA — revisa antes de publicar)' : ''}
            </label>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={8}
              placeholder="Escribe aquí la respuesta a la reseña..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1.5px solid var(--gold-border)', fontSize: '.8rem',
                fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.66rem', color: '#999', marginTop: 4 }}>
              <span>{draft.length} caracteres</span>
              {draft.length > 3000 && <span style={{ color: '#c00' }}>⚠️ Excede el límite de Booking.com (3000)</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => onSaveDraft(draft)}
              disabled={!draft.trim()}
              style={{ padding: '8px 16px', border: '1.5px solid var(--gold-border)', borderRadius: 8, background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.78rem' }}
            >
              💾 Guardar borrador
            </button>
            <button
              onClick={handleCopy}
              disabled={!draft.trim()}
              style={{ padding: '8px 16px', border: '1.5px solid var(--gold-border)', borderRadius: 8, background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.78rem' }}
            >
              {copied ? '✅ ¡Copiado!' : '📋 Copiar respuesta'}
            </button>
            <button
              onClick={() => onMarkPublished(draft)}
              disabled={!draft.trim()}
              style={{ padding: '8px 16px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: '.78rem' }}
            >
              ✅ Marcar como publicada
            </button>
          </div>
        </>
      )}

      {/* Published state */}
      {isPublished && review.responseText && (
        <div style={{ background: '#e8f5e9', border: '1.5px solid #c8e6c9', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontWeight: 800, fontSize: '.72rem', color: '#2e7d32', marginBottom: 6 }}>✅ Respuesta publicada</div>
          <p style={{ margin: 0, fontSize: '.78rem', lineHeight: 1.6 }}>{review.responseText}</p>
          <div style={{ fontSize: '.65rem', color: '#555', marginTop: 8 }}>
            Publicado por {review.responsePublishedBy ?? '—'} · {review.responsePublishedAt?.slice(0, 10) ?? '—'}
          </div>
        </div>
      )}

      {/* TripAdvisor copy instructions */}
      {review.source === 'tripadvisor' && !isPublished && review.sourceUrl && (
        <div style={{ background: '#fff8e1', border: '1px solid #f5c842', borderRadius: 8, padding: '10px 14px', fontSize: '.72rem', color: '#7a4f00' }}>
          <strong>📌 Para publicar en TripAdvisor:</strong>
          <ol style={{ margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Copia la respuesta con el botón de arriba</li>
            <li>Ve a <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1565c0' }}>la reseña en TripAdvisor</a></li>
            <li>Haz clic en "Responder a esta reseña" y pega el texto</li>
            <li>Publica la respuesta y regresa aquí para marcarla como publicada</li>
          </ol>
        </div>
      )}
    </div>
  );
}
