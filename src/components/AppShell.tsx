'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import Dashboard from './Dashboard';
import ReservationsTable from './ReservationsTable';
import PrepurchaseSettings from './PrepurchaseSettings';
import StatisticalChartsTab from './StatisticalChartsTab';
import ForecastTab from './ForecastTab';

type Tab = 'dashboard' | 'reservations' | 'settings' | 'charts' | 'forecast';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'reservations', label: 'Datos de Reservas', icon: '📋' },
  { id: 'settings', label: 'Configuración', icon: '⚙️' },
  { id: 'charts', label: 'Análisis Gráfico', icon: '📈' },
  { id: 'forecast', label: 'Pronóstico', icon: '🔮' },
];

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { fileName, setRawRows, setFileName, rawRows, maxFileDate } = usePrepurchase();

  const today = new Date();
  const showWarning = maxFileDate && maxFileDate < today;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside
        className={`flex flex-col transition-all duration-300 flex-shrink-0 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
        style={{ backgroundColor: '#0d0d0d' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center px-4 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
          {sidebarOpen ? (
            <Image src="/geh-logo.svg" alt="GEH Suites" width={150} height={60} priority />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: '#c8920a', color: '#0d0d0d' }}>
              G
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={
                activeTab === tab.id
                  ? { backgroundColor: '#c8920a', color: '#0d0d0d', fontWeight: 600 }
                  : { color: '#9ca3af' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a1a1a';
                  (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                }
              }}
            >
              <span className="text-base flex-shrink-0">{tab.icon}</span>
              {sidebarOpen && <span className="truncate">{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: '#2a2a2a' }}>
          {sidebarOpen && fileName && (
            <p className="text-xs truncate px-1" style={{ color: '#6b7280' }} title={fileName}>
              📁 {fileName}
            </p>
          )}
          <button
            onClick={() => { setRawRows([]); setFileName(''); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <span>🔄</span>
            {sidebarOpen && <span>Cargar nuevo archivo</span>}
          </button>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-full flex items-center justify-center py-2 transition-colors"
            style={{ color: '#6b7280' }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            {maxFileDate && (
              <p className="text-xs text-gray-500">
                Datos hasta: {maxFileDate.toLocaleDateString('es-CO', { dateStyle: 'medium' })} ·{' '}
                {rawRows.length.toLocaleString('es-CO')} filas procesadas
              </p>
            )}
          </div>
          {showWarning && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border"
              style={{ backgroundColor: '#fefce8', borderColor: '#c8920a', color: '#9a6f07' }}>
              <span>⚠️</span>
              <span>
                Archivo con información hasta{' '}
                {maxFileDate!.toLocaleDateString('es-CO')}. El análisis puede estar desactualizado.
              </span>
            </div>
          )}
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'reservations' && <ReservationsTable />}
          {activeTab === 'settings' && <PrepurchaseSettings />}
          {activeTab === 'charts' && <StatisticalChartsTab />}
          {activeTab === 'forecast' && <ForecastTab />}
        </div>
      </main>
    </div>
  );
}
