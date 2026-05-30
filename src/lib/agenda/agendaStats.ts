import { AgendaItem, AgendaStats } from '../../types/agenda';

export function computeStats(items: AgendaItem[]): AgendaStats {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    inProgress: items.filter(i => i.status === 'inProgress').length,
    executed: items.filter(i => i.status === 'executed').length,
    closed: items.filter(i => i.status === 'closed').length,
    high: items.filter(i => i.priority === 'high').length,
    overdue: items.filter(i =>
      i.followUpDate &&
      new Date(i.followUpDate) < now &&
      !['closed', 'cancelled'].includes(i.status)
    ).length,
    thisWeek: items.filter(i => {
      if (!i.followUpDate) return false;
      const d = new Date(i.followUpDate);
      return d >= now && d <= weekEnd;
    }).length,
  };
}
