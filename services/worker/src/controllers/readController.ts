import type { Context } from 'hono';
import type { AuthUser, UserPermission } from '@evosensefleet/shared';
import { jsonResponse } from '../utils/response';
import { getUser } from '../services/sessionService';
import { hasPermission } from '../services/permissionService';
import {
  canAccessCompany,
  filterAlertsFor,
  filterAssetsFor,
  filterDevicesFor,
  filterDriversFor,
  filterEventsFor,
} from '../services/companyService';

type ScopedRequest = { user: AuthUser; companyId?: string } | { error: Response };

function requestScope(c: Context, permission?: UserPermission): ScopedRequest {
  const user = getUser(c);
  if (!user) return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
  if (permission && !hasPermission(user, permission)) {
    return { error: jsonResponse({ error: `Forbidden: missing ${permission} permission` }, 403) };
  }
  const companyId = c.req.query('companyId');
  if (companyId && !canAccessCompany(user, companyId)) {
    return { error: jsonResponse({ error: 'Forbidden for selected company' }, 403) };
  }
  return { user, companyId };
}

export const getOverviewController = (c: Context) => {
  const scope = requestScope(c);
  if ('error' in scope) return scope.error;
  const devices = filterDevicesFor(scope.user, scope.companyId);
  const alerts = filterAlertsFor(scope.user, scope.companyId);
  return jsonResponse({
    totalVehicles: devices.length,
    onlineVehicles: devices.filter((device) => device.status === 'online').length,
    activeAlerts: alerts.length,
    averageFuelEfficiency: 18.4,
    lastUpdated: new Date().toISOString(),
  });
};

export const getDriversController = (c: Context) => {
  const scope = requestScope(c, 'drivers.view');
  return 'error' in scope ? scope.error : jsonResponse(filterDriversFor(scope.user, scope.companyId));
};

export const getAssetsController = (c: Context) => {
  const scope = requestScope(c, 'assets.view');
  return 'error' in scope ? scope.error : jsonResponse(filterAssetsFor(scope.user, scope.companyId));
};

export const getAlertsController = (c: Context) => {
  const scope = requestScope(c, 'alerts.view');
  return 'error' in scope ? scope.error : jsonResponse(filterAlertsFor(scope.user, scope.companyId));
};

export const getEventsController = (c: Context) => {
  const scope = requestScope(c, 'events.view');
  return 'error' in scope ? scope.error : jsonResponse(filterEventsFor(scope.user, scope.companyId));
};
