import type { AuthUser, UserPermission, UserRole } from '@evosensefleet/shared';

export const VIEW_PERMISSIONS: UserPermission[] = [
  'companies.view',
  'devices.view',
  'drivers.view',
  'assets.view',
  'alerts.view',
  'events.view',
  'users.view',
];

export function defaultPermissionsForRole(role: UserRole): UserPermission[] {
  if (role === 'admin' || role === 'manager') {
    return [
      ...VIEW_PERMISSIONS,
      'companies.create',
      'companies.edit',
      'companies.delete',
      'devices.create',
      'devices.update',
      'devices.delete',
      'drivers.create',
      'drivers.update',
      'drivers.delete',
      'assets.create',
      'assets.update',
      'assets.delete',
      'users.create',
      'users.update',
      'users.delete',
    ];
  }

  if (role === 'operator') {
    return [...VIEW_PERMISSIONS, 'devices.create', 'drivers.create', 'assets.create'];
  }

  return [...VIEW_PERMISSIONS];
}

export function sanitizePermissions(input: unknown, role: UserRole): UserPermission[] {
  const allowed: UserPermission[] = [
    ...VIEW_PERMISSIONS,
    'companies.create',
    'companies.edit',
    'companies.delete',
    'devices.create',
    'devices.update',
    'devices.delete',
    'drivers.create',
    'drivers.update',
    'drivers.delete',
    'assets.create',
    'assets.update',
    'assets.delete',
    'users.create',
    'users.update',
    'users.delete',
  ];

  const defaults = defaultPermissionsForRole(role);
  if (!Array.isArray(input) || input.length === 0) return defaults;

  const set = new Set<UserPermission>();
  for (const item of input) {
    if (typeof item !== 'string') continue;
    if (allowed.includes(item as UserPermission)) {
      set.add(item as UserPermission);
    }
  }

  return Array.from(set);
}

export function effectiveSessionPermissions(user: AuthUser): UserPermission[] {
  return sanitizePermissions(user.permissions, user.role);
}

export function hasPermission(user: AuthUser, permission: UserPermission): boolean {
  const permissions = sanitizePermissions(user.permissions, user.role);
  return permissions.includes(permission);
}
