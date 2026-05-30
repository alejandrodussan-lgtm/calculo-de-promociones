import { AgendaItem } from '../../types/agenda';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', inProgress: 'En seguimiento', executed: 'Ejecutada',
  underReview: 'En revisión', closed: 'Cerrada', cancelled: 'Cancelada',
};
const PRIORITY_LABELS: Record<string, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };
const MODULE_LABELS: Record<string, string> = {
  rateSimulator: 'Simulador de Tarifas', otbComparison: 'Comparativa OTB', agendaGeneral: 'Agenda general',
};

export function itemsToRows(items: AgendaItem[]): (string | undefined)[][] {
  const header = [
    'ID', 'Fecha creación', 'Fecha actualización', 'Título', 'Descripción',
    'Hotel', 'Módulo', 'Canal', 'Categoría', 'Estado', 'Importancia',
    'Fecha seguimiento', 'Responsable', 'Etiquetas', 'Notas adicionales',
  ];
  const rows = items.map(i => [
    i.id,
    (i.createdAt || '').slice(0, 10),
    (i.updatedAt || '').slice(0, 10),
    i.title,
    i.description,
    i.hotelName,
    MODULE_LABELS[i.moduleSource] || i.moduleSource,
    i.channelName,
    i.category,
    STATUS_LABELS[i.status] || i.status,
    PRIORITY_LABELS[i.priority] || i.priority,
    i.followUpDate,
    i.responsible,
    (i.tags || []).join(', '),
    i.notes,
  ]);
  return [header, ...rows];
}

export function generateFilename(): string {
  return 'Agenda_Revenue_' + new Date().toISOString().slice(0, 10) + '.xlsx';
}
