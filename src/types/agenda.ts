export type AgendaModuleSource = 'rateSimulator' | 'otbComparison' | 'agendaGeneral';
export type AgendaPriority = 'high' | 'medium' | 'low';
export type AgendaStatus = 'pending' | 'inProgress' | 'executed' | 'underReview' | 'closed' | 'cancelled';

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  hotelId?: string;
  hotelName?: string;
  moduleSource: AgendaModuleSource;
  channelId?: string;
  channelName?: string;
  category?: string;
  status: AgendaStatus;
  priority: AgendaPriority;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  followUpDate?: string;
  responsible?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  notes?: string;
}

export interface AgendaStats {
  total: number;
  pending: number;
  inProgress: number;
  executed: number;
  closed: number;
  high: number;
  overdue: number;
  thisWeek: number;
}

export interface AgendaFilters {
  text?: string;
  hotel?: string;
  module?: AgendaModuleSource | '';
  channel?: string;
  status?: AgendaStatus | '';
  priority?: AgendaPriority | '';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  pendingOnly?: boolean;
  highOnly?: boolean;
}
