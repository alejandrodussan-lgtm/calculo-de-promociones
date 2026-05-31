// ─────────────────────────────────────────────────────────────
// AUTH TYPES — Revenue Master Dashboard
// DEV NOTE: localStorage-based auth. Migrate to Supabase/Firebase/JWT in production.
// ─────────────────────────────────────────────────────────────

export type UserRole =
  | 'master_admin'
  | 'admin'
  | 'revenue_manager'
  | 'revenue_assistant'
  | 'operations'
  | 'viewer';

export type UserStatus = 'active' | 'inactive';

export type AuthProvider = 'email' | 'google' | 'magic_link';

export type Permission =
  | 'canViewDashboard'
  | 'canViewAllHotels'
  | 'canEditRateSimulator'
  | 'canEditPromotions'
  | 'canEditBookingConfig'
  | 'canEditOtb'
  | 'canUploadOtbFiles'
  | 'canCreateNotes'
  | 'canEditOwnNotes'
  | 'canEditAllNotes'
  | 'canDeleteNotes'
  | 'canExportReports'
  | 'canManageUsers'
  | 'canCreateUsers'
  | 'canEditUsers'
  | 'canDisableUsers'
  | 'canAssignHotels'
  | 'canManageRoles'
  | 'canManagePermissions'
  | 'canViewAuditLog'
  | 'canManageHotelAssignments'
  | 'canRestoreConfigurations'
  | 'canManageGlobalSettings'
  | 'canManageOfficialHotelConfig'
  | 'canManageAgenda'
  | 'canViewAllActivity';

export type NoteVisibility = 'private' | 'hotel' | 'team' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  hotelAccess: string[];      // hotel names; empty = all (master_admin)
  permissions: Permission[];
  createdAt: string;          // ISO 8601
  updatedAt: string;
  createdBy: string;
  lastLoginAt: string | null;
  authProvider: AuthProvider;
  allowedProviders: AuthProvider[];
}

export interface AuthSession {
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  hotelAccess: string[];
  activeHotelId: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  authProvider: AuthProvider;
}

export interface AuthorizedEmail {
  email: string;
  userId: string;
  allowedProviders: AuthProvider[];
  status: UserStatus;
  addedAt: string;
  addedBy: string;
}

export interface UserHotelAccess {
  userId: string;
  hotelId: string;
  hotelName: string;
  roleForHotel?: UserRole;
  permissions?: Permission[];
}

export type AuditAction =
  | 'login_success' | 'login_failed' | 'logout'
  | 'login_google_success' | 'login_google_failed' | 'unauthorized_email_attempt'
  | 'session_expired_inactivity' | 'session_restored'
  | 'user_created' | 'user_updated' | 'user_disabled' | 'permissions_updated'
  | 'create_note' | 'update_note' | 'delete_note' | 'close_note'
  | 'create_strategy' | 'copy_strategy' | 'update_strategy' | 'delete_strategy'
  | 'update_promotion_config' | 'save_hotel_config' | 'restore_hotel_config'
  | 'upload_otb_snapshot' | 'delete_otb_snapshot' | 'export_report'
  | 'switch_hotel' | 'navigate_module';

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  email?: string;
  role?: UserRole;
  hotelId: string | null;
  hotelName?: string;
  module?: string;
  action: AuditAction | string;
  entityType?: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface UserScopedEntity {
  id: string;
  userId: string;
  hotelId: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingChange {
  id: string;
  userId: string;
  hotelId: string;
  module: string;
  field: string;
  previousValue: unknown;
  newValue: unknown;
  status: 'pending' | 'saved' | 'discarded';
  createdAt: string;
}
