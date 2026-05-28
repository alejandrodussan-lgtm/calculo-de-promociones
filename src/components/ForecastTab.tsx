'use client';

import { useMemo } from 'react';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import { formatCOP, formatNumber } from '@/lib/prepurchaseSettings';
import { riskBg } from '@/lib/riskClassifier';
import { buildProjectionTimeline } from '@/lib/forecastCalculations';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { exportPronostico } from '@/lib/exportService';

function CopFormatter(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

export default function ForecastTab() {
  const { forecastScenarios, summary, baseDate, maxFileDate } = usePrepurchase();

  const today = new Date();
  const showWarning = maxFileDate && maxFileDate < today;

  const mediumScenario = forecastScenarios.find((s) => s.escenario.startsWith('Medio (Histórico')) ?? forecastScenarios.find((s) => s.escenario.startsWith('Medio'));

  const projectionData = useMemo(() => {
    if (!mediumScenario || !summary) return [];
    const pts = buildProjectionTimeline(baseDate, summary.saldoComercialDisponible, mediumScenario.consumoDiario);
    const step = Math.max(1, Math.floor(pts.length / 50));
    return pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p) => ({
      date: p.label,
      saldo: Math.max(0, p.saldo),
    }));
  }, [mediumScenario, summary, baseDate]);

  const scenarioGroups = useMemo(() => {
    const groups = ['Conservador (Histórico completo)', 'Medio (Histórico completo)', 'Acelerado (Histórico completo)', 'Manual'];
    return groups.map((name) => forecastScenarios.find((s) => s.escenario === name)).filter(Boolean);
  }, [forecastScenarios]);

  const comparisonData = useMemo(() => {
    if (scenarioGroups.length === 0 || !summary) return [];
    const maxDias = Math.max(...scenarioGroups.map((s) => Math.min(s!.diasRestantes, 365)));
    const step = Math.max(1, Math.floor(maxDias / 40));
    const points: Record<string, number | string>[] = [];
    for (let d = 0; d <= maxDias; d += step) {
      const pt: Record<string, number | string> = { dia: `Día ${d}` };
      for (const sc of scenarioGroups) {
        if (!sc) continue;
        pt[sc.escenario.replace(' (Histórico completo)', '')] = Math.max(0, summary.saldoComercialDisponible - sc.consumoDiario * d);
      }
      points.push(pt);
    }
    return points;
  }, [scenarioGroups, summary]);

  const daysBarData = useMemo(() => {
    const top = ['Conservador (Histórico completo)', 'Medio (Histórico completo)', 'Acelerado (Histórico completo)', 'Conservador (Últimos 30 días)', 'Medio (Últimos 30 días)', 'Manual'];
    return forecastScenarios.filter((s) => top.includes(s.escenario)).map((s) => ({
      name: s.escenario.replace(' (Histórico completo)', ' (Hist.)').replace(' (Últimos 30 días)', ' (30d)'),
      dias: Math.min(s.diasRestantes, 500),
      riesgo: s.nivelRiesgo,
    }));
  }, [forecastScenarios]);

  if (!summary) return <div className="p-6 text-center text-gray-500">No hay datos para calcular el pronóstico.</div>;

  return (
    <div className="p-6 space-y-6">

      {showWarning && (
        <div className="rounded-xl p-4 text-sm border" style={{ backgroundColor: 'rgba(200,146,10,0.08)', borderColor: 'rgba(200,146,10,0.3)', color: '#9a6f07' }}>
          <strong>⚠️ Atención:</strong> El archivo tiene información hasta{' '}
          {maxFileDate!.toLocaleDateString('es-CO', { dateStyle: 'long' })}. Puede cambiar la fecha base en{' '}
          <strong>Configuración de Precompra</strong>.
        </div>
      )}

      {/* Gauge */}
      <div className="rounded-xl p-5 bg-white border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c8920a' }} />
          <h2 className="text-sm font-semibold text-gray-800">Indicador de Agotamiento de la Bolsa</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(200,146,10,0.06)', border: '1px solid rgba(200,146,10,0.2)' }}>
            <p className="text-xs font-medium" style={{ color: '#c8920a' }}>Porcentaje Consumido</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{(summary.porcentajeConsumido * 100).toFixed(1)}%</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs font-medium text-gray-500">Saldo Disponible</p>
            <p className="text-lg font-bold text-gray-900 mt-2">{formatCOP(summary.saldoComercialDisponible)}</p>
          </div>
          {mediumScenario && (
            <>
              <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs font-medium text-gray-500">Fecha Estimada Agotamiento</p>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {mediumScenario.fechaEstimada?.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) ?? 'N/D'}
                </p>
              </div>
              <div className={`text-center p-4 rounded-xl ${riskBg(mediumScenario.nivelRiesgo)}`}>
                <p className="text-xs font-medium opacity-70">Nivel de Riesgo</p>
                <p className="text-2xl font-bold mt-2">{mediumScenario.nivelRiesgo.toUpperCase()}</p>
                <p className="text-xs mt-1 opacity-70">{mediumScenario.diasRestantes} días restantes</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Tabla Ejecutiva de Pronóstico</h2>
          <button onClick={() => exportPronostico(forecastScenarios)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: '#c8920a', color: '#0d0d0d' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#9a6f07'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c8920a'}>
            📥 Exportar Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200" style={{ backgroundColor: '#0d0d0d' }}>
                {['Escenario', 'Consumo Diario', 'Consumo Semanal', 'Consumo Mensual', 'Días Rest.', 'Semanas Rest.', 'Fecha Estimada', 'Riesgo', 'Observación'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: '#c8920a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forecastScenarios.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{s.escenario}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCOP(s.consumoDiario)}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCOP(s.consumoSemanal)}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCOP(s.consumoMensual)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatNumber(s.diasRestantes)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatNumber(s.semanasRestantes, 1)}</td>
                  <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                    {s.fechaEstimada ? s.fechaEstimada.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/D'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${riskBg(s.nivelRiesgo)}`}>{s.nivelRiesgo.toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[200px]">{s.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Línea de Agotamiento Proyectado</h3>
          <p className="text-xs text-gray-400 mb-4">Escenario Medio — Histórico completo</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
              <Tooltip formatter={(v) => [formatCOP(Number(v)), 'Saldo']} labelFormatter={(l) => `Fecha: ${l}`} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Agotamiento', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="saldo" name="Saldo Proyectado" stroke="#c8920a" dot={false} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Comparación de Escenarios</h3>
          <p className="text-xs text-gray-400 mb-4">Base: Histórico completo</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
              <Tooltip formatter={(v, name) => [formatCOP(Number(v)), String(name)]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="Conservador" stroke="#22c55e" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Medio" stroke="#c8920a" dot={false} strokeWidth={2.5} />
              <Line type="monotone" dataKey="Acelerado" stroke="#ef4444" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Manual" stroke="#8b5cf6" dot={false} strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Días Restantes por Escenario</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={daysBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
              <Tooltip formatter={(v) => [Number(v) + ' días', 'Días restantes']} />
              <Bar dataKey="dias" name="Días restantes" radius={[0, 3, 3, 0]}>
                {daysBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.riesgo === 'alto' ? '#ef4444' : entry.riesgo === 'medio' ? '#f97316' : '#c8920a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Información de la Proyección</h3>
          <div className="space-y-0">
            {[
              { label: 'Fecha base usada', value: baseDate.toLocaleDateString('es-CO', { dateStyle: 'long' }) },
              { label: 'Saldo disponible', value: formatCOP(summary.saldoComercialDisponible) },
              { label: 'Consumo promedio diario', value: formatCOP(summary.promedioDiario) },
              { label: 'Consumo promedio semanal', value: formatCOP(summary.promedioSemanal) },
              { label: 'Consumo promedio mensual', value: formatCOP(summary.promedioMensual) },
              { label: 'Escenarios calculados', value: String(forecastScenarios.length) },
            ].map((row, i) => (
              <div key={i} className="flex justify-between py-2.5 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-500">{row.label}</span>
                <span className="font-semibold text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
