import React from 'react';
import type { Review } from '../../types/reputation';

interface ReviewCardProps {
  review: Review;
  onSelect: (review: Review) => void;
  selected?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  google_business: '🔵 Google',
  booking: '🏨 Booking',
  tripadvisor: '🦉 TripAdvisor',
  manual: '📋 Manual',
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#2e7d32',
  neutral:  '#5c5c00',
  negative: '#c62828',
  critical: '#b71c1c',
};

const STATUS_LABELS: Record<string, string> = {
  pending_response:    '⏳ Pendiente',
  response_draft:      '✏️ Borrador',
  response_ready:      '✅ Lista',
  response_published:  '🟢 Publicada',
  no_response_needed:  '—',
  escalated:           '🔴 Escalada',
};

function StarBar({ rating }: { rating: number }) {
  const normalized = rating / 10;
  const filled = Math.round(normalized * 5);
  return (
    <span title={`${rating}/10`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < filled ? '#CE7E1F' : '#ddd', fontSize: '0.8rem' }}>★</span>
      ))}
      <span style={{ fontSize: '.7rem', color: '#999', marginLeft: 4 }}>{rating}/10</span>
    </span>
  );
}

export function ReviewCard({ review, onSelect, selected }: ReviewCardProps) {
  const riskColor = review.riskLevel === 'critical' ? '#b71c1c'
    : review.riskLevel === 'high' ? '#e65100'
    : review.riskLevel === 'medium' ? '#f57f17'
    : '#388e3c';

  return (
    <div
      onClick={() => onSelect(review)}
      style={{
        border: `1.5px solid ${selected ? 'var(--gold)' : 'var(--gold-border)'}`,
        borderRadius: 10,
        padding: '12px 16px',
        cursor: 'pointer',
        background: selected ? 'var(--gold-subtle)' : 'var(--white)',
        transition: 'all .15s',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: '.7rem', color: '#555', fontWeight: 700 }}>
              {SOURCE_LABELS[review.source] ?? review.source}
            </span>
            <StarBar rating={review.rating} />
            {review.riskLevel && review.riskLevel !== 'low' && (
              <span style={{ fontSize: '.62rem', background: riskColor, color: '#fff', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                {review.riskLevel.toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ fontWeight: 700, fontSize: '.8rem', marginBottom: 2 }}>
            {review.authorName}
            {review.authorCountry && <span style={{ fontWeight: 400, color: '#888', marginLeft: 6 }}>{review.authorCountry}</span>}
          </div>

          {review.title && (
            <div style={{ fontStyle: 'italic', fontSize: '.75rem', color: '#555', marginBottom: 4 }}>"{review.title}"</div>
          )}

          <div style={{ fontSize: '.72rem', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>
            {review.comment || review.positiveComment || review.negativeComment || '(Sin comentario escrito)'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: '.62rem', color: '#999' }}>{review.reviewDate.slice(0, 10)}</span>
          <span style={{
            fontSize: '.64rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700,
            background: review.status === 'response_published' ? '#e8f5e9' : '#fff3e0',
            color: review.status === 'response_published' ? '#2e7d32' : '#e65100',
            border: '1px solid',
            borderColor: review.status === 'response_published' ? '#c8e6c9' : '#ffe0b2',
          }}>
            {STATUS_LABELS[review.status] ?? review.status}
          </span>
          {review.sentiment && (
            <span style={{ fontSize: '.62rem', color: SENTIMENT_COLORS[review.sentiment] ?? '#555', fontWeight: 700 }}>
              {review.sentiment}
            </span>
          )}
        </div>
      </div>

      {review.mainTopic && (
        <div style={{ marginTop: 6, fontSize: '.65rem', color: '#777' }}>
          📌 {review.mainTopic}
          {(review.secondaryTopics ?? []).length > 0 && (
            <span style={{ marginLeft: 6 }}> · {review.secondaryTopics!.join(', ')}</span>
          )}
        </div>
      )}
    </div>
  );
}
