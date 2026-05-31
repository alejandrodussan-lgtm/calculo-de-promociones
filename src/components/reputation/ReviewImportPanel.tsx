import React, { useRef, useState } from 'react';
import type { ReviewImportRow } from '../../types/reputation';
import { parseImportRows, TRIPADVISOR_TEMPLATE_EXAMPLE, TRIPADVISOR_TEMPLATE_HEADERS } from '../../lib/reputation/connectors/tripadvisorManualConnector';
import type { TripAdvisorImportRow } from '../../lib/reputation/connectors/tripadvisorManualConnector';

interface ReviewImportPanelProps {
  hotelId: string;
  onImport: (rows: ReviewImportRow[], filename: string) => void;
  onDownloadTemplate: () => void;
}

interface ParsedPreview {
  rows: TripAdvisorImportRow[];
  filename: string;
  parseErrors: string[];
}

declare const XLSX: {
  read(data: ArrayBuffer, opts: { type: string }): unknown;
  utils: {
    sheet_to_json<T>(ws: unknown): T[];
    book_new(): unknown;
    book_append_sheet(wb: unknown, ws: unknown, name: string): void;
    aoa_to_sheet(data: unknown[][]): unknown;
    json_to_sheet(data: unknown[]): unknown;
  };
  writeFile(wb: unknown, filename: string): void;
};

export function ReviewImportPanel({ hotelId, onImport, onDownloadTemplate }: ReviewImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);

    try {
      const buffer = await file.arrayBuffer();

      let rows: TripAdvisorImportRow[];

      if (file.name.endsWith('.csv')) {
        const text = new TextDecoder('utf-8').decode(buffer);
        rows = parseCSV(text);
      } else {
        const wb = XLSX.read(buffer, { type: 'array' }) as { SheetNames: string[]; Sheets: Record<string, unknown> };
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<TripAdvisorImportRow>(ws);
      }

      if (!rows.length) {
        setError('El archivo está vacío o no contiene filas válidas.');
        return;
      }

      setPreview({ rows, filename: file.name, parseErrors: [] });
    } catch (err) {
      setError(`Error al leer el archivo: ${String(err)}`);
    }
  }

  function handleImport() {
    if (!preview) return;
    setImporting(true);

    const result = parseImportRows(preview.rows, hotelId, preview.filename);
    // Convert to ReviewImportRow for the parent
    const importRows: ReviewImportRow[] = result.imported.map(r => ({
      source: 'tripadvisor',
      hotelId: r.hotelId,
      authorName: r.authorName,
      rating: r.rating / 2, // denormalize back to 1–5 for parent (parent re-normalizes)
      title: r.title,
      comment: r.comment,
      reviewDate: r.reviewDate,
      language: r.language,
      sourceUrl: r.sourceUrl,
    }));

    onImport(importRows, preview.filename);
    setImporting(false);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div style={{ border: '1.5px dashed var(--gold-border)', borderRadius: 10, padding: 20, background: '#fdfaf5' }}>
      <div style={{ fontWeight: 800, fontSize: '.82rem', color: 'var(--gold-dark)', marginBottom: 8 }}>
        🦉 Importar reseñas de TripAdvisor (Excel / CSV)
      </div>
      <p style={{ fontSize: '.72rem', color: '#666', margin: '0 0 14px' }}>
        TripAdvisor no permite automatización. Descarga la plantilla, exporta manualmente las reseñas desde el panel de TripAdvisor,
        y súbelas aquí. La IA generará respuestas listas para copiar y pegar.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button
          onClick={onDownloadTemplate}
          style={{ padding: '8px 14px', border: '1.5px solid var(--gold-border)', borderRadius: 8, background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.75rem' }}
        >
          📥 Descargar plantilla Excel
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          style={{ padding: '8px 14px', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: '.75rem' }}
        >
          📂 Seleccionar archivo (.xlsx / .csv)
        </button>
      </div>

      <input ref={inputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleFile} />

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #f5c6cb', borderRadius: 6, padding: '8px 12px', color: '#c00', fontSize: '.75rem', marginBottom: 10 }}>
          {error}
        </div>
      )}

      {preview && (
        <div style={{ background: '#fff', border: '1px solid var(--gold-border)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: '.74rem', fontWeight: 700, marginBottom: 8 }}>
            Vista previa: <span style={{ color: 'var(--gold-dark)' }}>{preview.filename}</span> — {preview.rows.length} filas encontradas
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.68rem' }}>
              <thead>
                <tr style={{ background: 'var(--gold-pale)' }}>
                  {TRIPADVISOR_TEMPLATE_HEADERS.map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid var(--gold-border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    {TRIPADVISOR_TEMPLATE_HEADERS.map(h => (
                      <td key={h} style={{ padding: '3px 8px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String((row as Record<string, unknown>)[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 5 && (
              <div style={{ fontSize: '.66rem', color: '#999', marginTop: 4 }}>… y {preview.rows.length - 5} filas más</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => setPreview(null)} style={{ padding: '7px 14px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '.75rem' }}>
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              style={{ padding: '7px 16px', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer', fontSize: '.75rem' }}
            >
              {importing ? 'Importando...' : `✅ Importar ${preview.rows.length} reseñas`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Simple CSV parser ─────────────────────────────────────────────────────────

function parseCSV(text: string): TripAdvisorImportRow[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i]?.replace(/^"|"$/g, '').trim() ?? ''; });
    return row as unknown as TripAdvisorImportRow;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}
