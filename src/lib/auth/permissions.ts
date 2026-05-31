import type { UserRole, Permission } from '../../types/auth';

export const ALL_PERMISSIONS: Permission[] = [
  'canViewDashboard', 'canViewAllHotels', 'canEditRateSimulator', 'canEditPromotions',
  'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles', 'canCreateNotes',
  'canEditOwnNotes', 'canEditAllNotes', 'canDeleteNotes', 'canExportReports',
  'canManageUsers', 'canCreateUsers', 'canEditUsers', 'canDisableUsers',
  'canAssignHotels', 'canManageRoles', 'canManagePermissions', 'canViewAuditLog',
  'canManageHotelAssignments', 'canRestoreConfigurations', 'canManageGlobalSettings',
  'canManageOfficialHotelConfig', 'canManageAgenda', 'canViewAllActivity',
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  master_admin: ALL_PERMISSIONS,
  admin: [
    'canViewDashboard', 'canViewAllHotels', 'canEditRateSimulator', 'canEditPromotions',
    'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles', 'canCreateNotes',
    'canEditOwnNotes', 'canEditAllNotes', 'canDeleteNotes', 'canExportReports',
    'canManageAgenda', 'canViewAuditLog', 'canRestoreConfigurations',
  ],
  revenue_manager: [
    'canViewDashboard', 'canEditRateSimulator', 'canEditPromotions', 'canEditBookingConfig',
    'canEditOtb', 'canUploadOtbFiles', 'canCreateNotes', 'canEditOwnNotes',
    'canExportReports', 'canManageAgenda',
  ],
  revenue_assistant: [
    'canViewDashboard', 'canCreateNotes', 'canEditOwnNotes', 'canEditOtb', 'canManageAgenda',
  ],
  operations: ['canViewDashboard', 'canCreateNotes', 'canEditOwnNotes', 'canManageAgenda'],
  viewer: ['canViewDashboard'],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  master_admin: 'Master Admin',
  admin: 'Admin',
  revenue_manager: 'Revenue Manager',
  revenue_assistant: 'Revenue Auxiliar',
  operations: 'Operaciones',
  viewer: 'Solo Lectura',
};
