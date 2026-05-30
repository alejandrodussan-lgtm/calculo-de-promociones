import { AgendaItem, AgendaFilters } from '../../types/agenda';

type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER: Record<string, number> = { pending: 0, inProgress: 1, underReview: 2, executed: 3, closed: 4, cancelled: 5 };

export function applyFilters(items: AgendaItem[], filters: AgendaFilters): AgendaItem[] {
  let result = [...items];

  if (filters.text) {
    const t = filters.text.toLowerCase();
    result = result.filter(i =>
      (i.title || '').toLowerCase().includes(t) ||
      (i.description || '').toLowerCase().includes(t) ||
      (i.notes || '').toLowerCase().includes(t)
    );
  }
  if (filters.hotel) result = result.filter(i => i.hotelId === filters.hotel || i.hotelName === filters.hotel);
  if (filters.module) result = result.filter(i => i.moduleSource === filters.module);
  if (filters.channel) result = result.filter(i => i.channelName === filters.channel);
  if (filters.status) result = result.filter(i => i.status === filters.status);
  if (filters.priority) result = result.filter(i => i.priority === filters.priority);
  if (filters.category) result = result.filter(i => i.category === filters.category);
  if (filters.dateFrom) result = result.filter(i => i.followUpDate && i.followUpDate >= filters.dateFrom!);
  if (filters.dateTo) result = result.filter(i => i.followUpDate && i.followUpDate <= filters.dateTo!);
  if (filters.pendingOnly) result = result.filter(i => i.status === 'pending');
  if (filters.highOnly) result = result.filter(i => i.priority === 'high');

  return result;
}

export function sortItems(items: AgendaItem[], field: keyof AgendaItem | string, dir: SortDir): AgendaItem[] {
  return [...items].sort((a, b) => {
    let va: number | string;
    let vb: number | string;

    if (field === 'priority') {
      va = PRIORITY_ORDER[a.priority] ?? 99;
      vb = PRIORITY_ORDER[b.priority] ?? 99;
    } else if (field === 'status') {
      va = STATUS_ORDER[a.status] ?? 99;
      vb = STATUS_ORDER[b.status] ?? 99;
    } else if (field === 'followUpDate') {
      va = a.followUpDate || '9999';
      vb = b.followUpDate || '9999';
    } else {
      va = ((a as Record<string, unknown>)[field] || '').toString().toLowerCase();
      vb = ((b as Record<string, unknown>)[field] || '').toString().toLowerCase();
    }

    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
