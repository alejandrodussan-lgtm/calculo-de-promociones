/**
 * AuditLogTable.tsx — Read-only table of audit log entries
 */

import React from 'react';
import type { AuditLog } from '../../types/auth';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (!logs.length) {
    return <p style={{ color: 'var(--gray3)', fontSize: '.8rem', padding: 16 }}>No hay registros de auditoría aún.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem', minWidth: 900 }}>
        <thead>
          <tr style={{ background: 'var(--gold-pale)' }}>
            {['Fecha', 'Usuario', 'Hotel', 'Acción', 'Valor anterior', 'Nuevo valor'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1.5px solid var(--gold-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} style={{ borderBottom: '1px solid var(--gray2)' }}>
              <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: 'var(--gray3)' }}>
                {(l.createdAt || '').slice(0, 16).replace('T', ' ')}
              </td>
              <td style={{ padding: '5px 10px', fontWeight: 700 }}>{l.userName || '—'}</td>
              <td style={{ padding: '5px 10px' }}>{l.hotelId || '—'}</td>
              <td style={{ padding: '5px 10px' }}>
                <code style={{ background: 'var(--gold-subtle)', padding: '1px 6px', borderRadius: 4 }}>{l.action}</code>
              </td>
              <td style={{ padding: '5px 10px', color: 'var(--gray3)' }}>{String(l.previousValue ?? '')}</td>
              <td style={{ padding: '5px 10px' }}>{String(l.newValue ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
