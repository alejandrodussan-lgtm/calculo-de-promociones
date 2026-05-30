import { AgendaItem } from '../../types/agenda';

const AGENDA_STORAGE_KEY = 'rmd_agenda_v1';

export function agendaGetAll(): AgendaItem[] {
  try {
    return JSON.parse(localStorage.getItem(AGENDA_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function agendaSaveAll(items: AgendaItem[]): void {
  localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(items));
}

export function agendaCreate(item: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt'>): AgendaItem {
  const items = agendaGetAll();
  const now = new Date().toISOString();
  const newItem: AgendaItem = {
    ...item,
    id: 'ag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(newItem);
  agendaSaveAll(items);
  return newItem;
}

export function agendaUpdate(id: string, updates: Partial<AgendaItem>): AgendaItem | null {
  const items = agendaGetAll();
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
  agendaSaveAll(items);
  return items[idx];
}

export function agendaDelete(id: string): void {
  agendaSaveAll(agendaGetAll().filter(i => i.id !== id));
}
