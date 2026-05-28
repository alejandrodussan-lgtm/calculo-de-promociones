'use client';

import { useState } from 'react';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import { PrepurchaseConfig, DEFAULT_CONFIG } from '@/lib/prepurchaseSettings';
import { formatCOP, calcBeneficioComercial, calcCupoTotal } from '@/lib/prepurchaseSettings';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function NumberInput({ value, onChange, min, step, prefix, suffix }: {
  value: number; onChange: (v: number) => void; min?: number; step?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
        style={{ '--tw-ring-color': '#c8920a' } as React.CSSProperties}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#c8920a'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200,146,10,0.2)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
    </div>
  );
}

export default function PrepurchaseSettings() {
  const { config, setConfig } = usePrepurchase();
  const [local, setLocal] = useState<PrepurchaseConfig>({ ...config });
  const [saved, setSaved] = useState(false);

  const beneficio = calcBeneficioComercial(local);
  const cupoTotal = calcCupoTotal(local);

  const update = (patch: Partial<PrepurchaseConfig>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const save = () => {
    setConfig(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const reset = () => {
    setLocal({ ...DEFAULT_CONFIG });
    setSaved(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(200,146,10,0.08)', border: '1px solid rgba(200,146,10,0.25)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: '#c8920a' }}>Configuración dinámica de la precompra</h2>
        <p className="text-xs" style={{ color: '#9a6f07' }}>
          Al guardar los cambios, todos los indicadores, gráficos y proyecciones se recalcularán automáticamente.
        </p>
      </div>

      {/* Preview */}
      <div className="rounded-xl p-5 bg-white border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Valores calculados (vista previa)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Valor Precompra', value: formatCOP(local.valorPrecompra) },
            { label: `Beneficio Comercial (${(local.porcentajeAdicional * 100).toFixed(1)}%)`, value: formatCOP(beneficio) },
            { label: 'Cupo Comercial Total', value: formatCOP(cupoTotal) },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(200,146,10,0.06)', border: '1px solid rgba(200,146,10,0.2)' }}>
              <p className="text-xs font-medium" style={{ color: '#c8920a' }}>{item.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">Valores financieros base</h3>
        <Field label="Valor total de la precompra (COP)" hint="Monto total acordado de la bolsa de precompra">
          <NumberInput value={local.valorPrecompra} onChange={(v) => update({ valorPrecompra: v })} min={0} step={1_000_000} prefix="$" />
        </Field>
        <Field label="Porcentaje adicional otorgado a la agencia (%)" hint="Beneficio comercial calculado sobre el valor de la precompra">
          <NumberInput value={local.porcentajeAdicional * 100} onChange={(v) => update({ porcentajeAdicional: v / 100 })} min={0} step={0.1} suffix="%" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicial de la bolsa">
            <input type="date" value={local.fechaInicial} onChange={(e) => update({ fechaInicial: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = '#c8920a'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200,146,10,0.2)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }} />
          </Field>
          <Field label="Fecha de corte del análisis" hint="Dejar vacío para usar todos los datos">
            <input type="date" value={local.fechaCorte ?? ''} onChange={(e) => update({ fechaCorte: e.target.value || null })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = '#c8920a'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200,146,10,0.2)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }} />
          </Field>
        </div>
      </div>

      {/* Forecast base */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Fecha base para el pronóstico</h3>
        <div className="space-y-2">
          {([
            { value: 'maxFile', label: 'Fecha máxima del archivo (recomendado)' },
            { value: 'today', label: 'Fecha actual del sistema' },
            { value: 'manual', label: 'Fecha manual' },
          ] as const).map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="fechaBase" value={opt.value}
                checked={local.fechaBasePronostico === opt.value}
                onChange={() => update({ fechaBasePronostico: opt.value })}
                style={{ accentColor: '#c8920a' }} />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
        {local.fechaBasePronostico === 'manual' && (
          <Field label="Fecha manual">
            <input type="date" value={local.fechaBaseManual ?? ''} onChange={(e) => update({ fechaBaseManual: e.target.value || null })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              onFocus={(e) => { e.currentTarget.style.borderColor = '#c8920a'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200,146,10,0.2)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }} />
          </Field>
        )}
      </div>

      {/* Manual consumption */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Escenario manual de consumo</h3>
        <p className="text-xs text-gray-500">Ingrese valores estimados para el escenario manual en el pronóstico. Solo complete el campo que desea usar como base.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Consumo diario (COP)">
            <NumberInput value={local.consumoDiarioManual ?? 0} onChange={(v) => update({ consumoDiarioManual: v || null })} min={0} step={1_000_000} prefix="$" />
          </Field>
          <Field label="Consumo semanal (COP)">
            <NumberInput value={local.consumoSemanalManual ?? 0} onChange={(v) => update({ consumoSemanalManual: v || null })} min={0} step={1_000_000} prefix="$" />
          </Field>
          <Field label="Consumo mensual (COP)">
            <NumberInput value={local.consumoMensualManual ?? 0} onChange={(v) => update({ consumoMensualManual: v || null })} min={0} step={1_000_000} prefix="$" />
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={save} className="px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors"
          style={{ backgroundColor: '#c8920a', color: '#0d0d0d' }}
          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#9a6f07'}
          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c8920a'}>
          Aplicar configuración
        </button>
        <button onClick={reset} className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
          Restaurar valores predeterminados
        </button>
        {saved && <span className="text-sm font-medium" style={{ color: '#c8920a' }}>✓ Configuración aplicada correctamente</span>}
      </div>
    </div>
  );
}
