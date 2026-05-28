'use client';

import { usePrepurchase } from '@/context/PrepurchaseContext';
import { formatCOP, formatPct, formatNumber } from '@/lib/prepurchaseSettings';
import { riskBg } from '@/lib/riskClassifier';
import {
  exportReservasEfectivas,
  exportReservasCanceladas,
  exportInconsistencias,
  exportDuplicados,
  exportResumenEjecutivo,
} from '@/lib/exportService';

type CardColor = 'gold' | 'green' | 'red' | 'yellow' | 'dark' | 'gray';

function KpiCard({ label, value, sub, color = 'dark' }: {
  label: string; value: string; sub?: string; color?: CardColor;
}) {
  const styles: Record<CardColor, { bg: string; border: string; labelColor: string; valueColor: string; subColor: string }> = {
    gold:  { bg: 'rgba(200,146,10,0.08)',  border: 'rgba(200,146,10,0.3)', labelColor: '#c8920a', valueColor: '#0d0d0d', subColor: '#9a6f07' },
    green: { bg: '#f0fdf4', border: '#bbf7d0', labelColor: '#15803d', valueColor: '#14532d', subColor: '#16a34a' },
    red:   { bg: '#fef2f2', border: '#fecaca', labelColor: '#dc2626', valueColor: '#7f1d1d', subColor: '#ef4444' },
    yellow:{ bg: '#fefce8', border: '#fde68a', labelColor: '#a16207', valueColor: '#713f12', subColor: '#ca8a04' },
    dark:  { bg: '#ffffff', border: '#e5e7eb', labelColor: '#6b7280', valueColor: '#111827', subColor: '#9ca3af' },
    gray:  { bg: '#f9fafb', border: '#e5e7eb', labelColor: '#6b7280', valueColor: '#374151', subColor: '#9ca3af' },
  };
  const s = styles[color];

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: s.labelColor }}>{label}</p>
      <p className="text-xl font-bold mt-1 leading-tight" style={{ color: s.valueColor }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: s.subColor }}>{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { summary, config, hotelSummaries, forecastScenarios, classifiedRows } = usePrepurchase();

  if (!summary) {
    return <div className="p-6 text-center text-gray-500">No hay datos disponibles.</div>;
  }

  const topHotel = hotelSummaries[0];
  const bestForecast = forecastScenarios.find((s) => s.escenario.startsWith('Medio'));

  const monthConsumption = new Map<string, number>();
  for (const r of classifiedRows) {
    if (r.status !== 'effective' || !r.date) continue;
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    monthConsumption.set(key, (monthConsumption.get(key) ?? 0) + r.amount);
  }
  const maxMonth = Array.from(monthConsumption.entries()).sort((a, b) => b[1] - a[1])[0];

  const weekConsumption = new Map<string, number>();
  for (const r of classifiedRows) {
    if (r.status !== 'effective' || !r.date) continue;
    const d = r.date;
    const sw = new Date(d);
    sw.setDate(d.getDate() - d.getDay());
    const key = sw.toISOString().slice(0, 10);
    weekConsumption.set(key, (weekConsumption.get(key) ?? 0) + r.amount);
  }
  const maxWeek = Array.from(weekConsumption.entries()).sort((a, b) => b[1] - a[1])[0];

  const handleExport = (type: string) => {
    if (type === 'efectivas') exportReservasEfectivas(classifiedRows);
    if (type === 'canceladas') exportReservasCanceladas(classifiedRows);
    if (type === 'inconsistencias') exportInconsistencias(classifiedRows);
    if (type === 'duplicados') exportDuplicados(classifiedRows);
    if (type === 'resumen') exportResumenEjecutivo(summary, config, forecastScenarios);
  };

  const pct = Math.min(100, summary.porcentajeConsumido * 100);
  const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f97316' : '#c8920a';

  return (
    <div className="p-6 space-y-6">

      {/* Financial Summary */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c8920a' }}>
          Resumen Financiero de la Precompra
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Cupo Comercial Total" value={formatCOP(summary.cupoTotal)} color="gold" />
          <KpiCard label="Venta Bruta Efectiva" value={formatCOP(summary.ventaBrutaEfectiva)} color="green" />
          <KpiCard label="Over-Commission" value={formatCOP(summary.overCommissionEfectiva)} sub="Valor descontado" color="yellow" />
          <KpiCard label="Consumo Neto" value={formatCOP(summary.consumoNeto)} color="dark" />
          <KpiCard
            label="Saldo Comercial Disponible"
            value={formatCOP(summary.saldoComercialDisponible)}
            sub={`${formatPct(summary.porcentajeDisponible)} disponible`}
            color="green"
          />
          <KpiCard
            label="Saldo Neto vs Prepago"
            value={formatCOP(summary.saldoNetoContraPrepago)}
            color={summary.saldoNetoContraPrepago < 0 ? 'red' : 'dark'}
          />
          <KpiCard
            label="% Consumido"
            value={formatPct(summary.porcentajeConsumido)}
            sub={`${formatPct(summary.porcentajeDisponible)} disponible`}
            color={summary.porcentajeConsumido > 0.9 ? 'red' : 'gold'}
          />
          <KpiCard label="Valor Precompra" value={formatCOP(config.valorPrecompra)} sub={`+${formatPct(config.porcentajeAdicional)} adicional`} color="gray" />
        </div>
      </section>

      {/* Progress bar */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Consumo de la bolsa de precompra</span>
          <span className="text-sm font-bold" style={{ color: barColor }}>{formatPct(summary.porcentajeConsumido)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
          <div
            className="h-5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>COP $0</span>
          <span style={{ color: barColor }}>{formatCOP(summary.ventaBrutaEfectiva)} consumido</span>
          <span>{formatCOP(summary.cupoTotal)}</span>
        </div>
      </section>

      {/* Averages */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c8920a' }}>
          Promedios de Consumo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Promedio Diario" value={formatCOP(summary.promedioDiario)} color="dark" />
          <KpiCard label="Promedio Semanal" value={formatCOP(summary.promedioSemanal)} color="dark" />
          <KpiCard label="Promedio Mensual" value={formatCOP(summary.promedioMensual)} color="dark" />
          <KpiCard label="Ticket Promedio / Reserva" value={formatCOP(summary.ticketPromedio)} color="gray" />
        </div>
      </section>

      {/* Forecast Quick */}
      {bestForecast && (
        <section className="rounded-xl p-5 border border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c8920a' }} />
            <h2 className="text-sm font-semibold text-gray-800">Pronóstico Más Probable — Escenario Medio</h2>
          </div>
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-gray-500">Fecha estimada de agotamiento</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {bestForecast.fechaEstimada
                  ? bestForecast.fechaEstimada.toLocaleDateString('es-CO', { dateStyle: 'long' })
                  : 'N/D'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Días restantes</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatNumber(bestForecast.diasRestantes)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Semanas restantes</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatNumber(bestForecast.semanasRestantes, 1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nivel de riesgo</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${riskBg(bestForecast.nivelRiesgo)}`}>
                {bestForecast.nivelRiesgo.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Consumo diario promedio</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#c8920a' }}>{formatCOP(bestForecast.consumoDiario)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Reservation stats */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c8920a' }}>
          Estado de Reservas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Reservas Efectivas" value={formatNumber(summary.numReservasEfectivas)} color="green" />
          <KpiCard label="Reservas Canceladas" value={formatNumber(summary.numReservasCanceladas)} color="red" />
          <KpiCard label="Duplicadas" value={formatNumber(summary.numDuplicados)} color="yellow" />
          <KpiCard label="En Revisión" value={formatNumber(summary.numEnRevision)} color="gray" />
        </div>
      </section>

      {/* Highlights */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c8920a' }}>
          Destacados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topHotel && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Hotel con mayor consumo</p>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{topHotel.hotel}</p>
              <p className="font-bold mt-1" style={{ color: '#c8920a' }}>{formatCOP(topHotel.ventaEfectiva)}</p>
              <p className="text-xs text-gray-500">{formatNumber(topHotel.numReservas)} reservas · {formatPct(topHotel.participacion)} del total</p>
            </div>
          )}
          {maxMonth && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Mes de mayor consumo</p>
              <p className="font-semibold text-gray-900">{maxMonth[0]}</p>
              <p className="font-bold mt-1" style={{ color: '#c8920a' }}>{formatCOP(maxMonth[1])}</p>
            </div>
          )}
          {maxWeek && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Semana de mayor consumo</p>
              <p className="font-semibold text-gray-900">{maxWeek[0]}</p>
              <p className="font-bold mt-1" style={{ color: '#c8920a' }}>{formatCOP(maxWeek[1])}</p>
            </div>
          )}
        </div>
      </section>

      {/* Exports */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c8920a' }}>
          Exportar Datos
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'resumen', label: '📊 Resumen Ejecutivo (Excel)' },
            { key: 'efectivas', label: '✅ Reservas Efectivas' },
            { key: 'canceladas', label: '❌ Reservas Canceladas' },
            { key: 'inconsistencias', label: '⚠️ Inconsistencias' },
            { key: 'duplicados', label: '🔁 Duplicados' },
          ].map((exp) => (
            <button
              key={exp.key}
              onClick={() => handleExport(exp.key)}
              className="px-4 py-2 text-sm rounded-lg border transition-colors"
              style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', color: '#374151' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#c8920a';
                (e.currentTarget as HTMLButtonElement).style.color = '#c8920a';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLButtonElement).style.color = '#374151';
              }}
            >
              {exp.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
