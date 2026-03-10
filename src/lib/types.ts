// ─────────────────────────────────────────────────────────────────────────────
// Domain enumerations
// These string-literal unions are the single source of truth for roles,
// actions, and statuses throughout the app. The DB schemas import from here.
// ─────────────────────────────────────────────────────────────────────────────

export const USER_ROLES = [
  'ci_specialist',
  'supervisor',
  'assistant_supervisor',
  'aaa',
  'manager',
  'director_3p',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Location scope determines which offices a user can access.
 *
 *  team   → ci_specialist, supervisor, assistant_supervisor
 *  region → aaa, manager
 *  all    → director_3p
 */
export const LOCATION_SCOPES = ['team', 'region', 'all'] as const;
export type LocationScope = (typeof LOCATION_SCOPES)[number];

export const ROLE_SCOPE_MAP: Record<UserRole, LocationScope> = {
  ci_specialist: 'team',
  supervisor: 'team',
  assistant_supervisor: 'team',
  aaa: 'region',
  manager: 'region',
  director_3p: 'all',
};

export const INVENTORY_ACTIONS = [
  'receive',     // Receiving an order from OSB / another office
  'remove',      // Taking items out of storage for field distribution
  'return',      // Returning previously removed items to storage
  'redistribute',// Moving items to another office
  'inventory_count', // Recording a physical count (no inventory change)
] as const;

export type InventoryAction = (typeof INVENTORY_ACTIONS)[number];

export const INVENTORY_COUNT_STATUSES = [
  'pending',
  'accepted',
  'rejected',
] as const;

export type InventoryCountStatus = (typeof INVENTORY_COUNT_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Permission matrix
// Maps each role to the set of actions it may perform.
// UC-2 / route guards in hooks.server.ts reference this table.
// ─────────────────────────────────────────────────────────────────────────────

export type AppPermission =
  | 'add_items'
  | 'remove_items'
  | 'record_on_behalf'
  | 'inventory_count'
  | 'reconcile_count'
  | 'view_audit_log'
  | 'view_reports'
  | 'manage_users';

export const ROLE_PERMISSIONS: Record<UserRole, Set<AppPermission>> = {
  ci_specialist: new Set(['add_items', 'remove_items', 'inventory_count']),
  supervisor: new Set([
    'add_items', 'remove_items', 'record_on_behalf', 'inventory_count',
    'reconcile_count', 'view_audit_log', 'view_reports', 'manage_users',
  ]),
  assistant_supervisor: new Set([
    'add_items', 'remove_items', 'record_on_behalf', 'inventory_count',
    'reconcile_count', 'view_audit_log', 'view_reports', 'manage_users',
  ]),
  aaa: new Set([
    'add_items', 'remove_items', 'record_on_behalf', 'inventory_count',
    'view_audit_log', 'view_reports', 'manage_users',
  ]),
  manager: new Set([
    'add_items', 'remove_items', 'record_on_behalf', 'inventory_count',
    'reconcile_count', 'view_audit_log', 'view_reports', 'manage_users',
  ]),
  director_3p: new Set(['view_reports']),
};

export function hasPermission(role: UserRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session / auth types (populated by Auth.js callbacks)
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Populated for team-scoped roles */
  teamId: string | null;
  /** Populated for region-scoped roles */
  regionId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Burn-rate forecast configuration
// Read from env at the route/service call site; passed into the service so the
// service itself stays pure and testable without environment coupling.
// ─────────────────────────────────────────────────────────────────────────────

export interface ForecastConfig {
  /** Days of removal history to analyse. Default 30. */
  burnRateDays: number;
  /** Days remaining threshold above which the badge is green. Default 30. */
  greenDays: number;
  /** Days remaining threshold below which the badge is red. Default 14. */
  yellowDays: number;
}

export type ForecastColor = 'green' | 'yellow' | 'red' | 'none';
