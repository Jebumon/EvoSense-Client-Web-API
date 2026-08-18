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

export const getOverviewController = async (c: Context) => {
  const scope = requestScope(c);
  if ('error' in scope) return scope.error;

  let devices = filterDevicesFor(scope.user, scope.companyId);
  let alerts = filterAlertsFor(scope.user, scope.companyId);

  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const companies = await getCompaniesFromDb(c.env.DB);
    const devicesDb = await getDevicesFromDb(c.env.DB);
    const alertsDb = await getAlertsFromDb(c.env.DB);

    devices = filterDevicesForList(scope.user, scope.companyId ?? undefined, companies, devicesDb);
    alerts = filterAlertsForList(scope.user, scope.companyId ?? undefined, companies, devicesDb, alertsDb);
  }

  return jsonResponse({
    totalVehicles: devices.length,
    onlineVehicles: devices.filter((device) => device.status === 'online').length,
    activeAlerts: alerts.length,
    averageFuelEfficiency: 18.4,
    lastUpdated: new Date().toISOString(),
  });
};

export const getDriversController = async (c: Context) => {
  const scope = requestScope(c, 'drivers.view');
  if ('error' in scope) return scope.error;

  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const companies = await getCompaniesFromDb(c.env.DB);
    const drivers = await getDriversFromDb(c.env.DB);
    return jsonResponse(filterDriversForList(scope.user, scope.companyId ?? undefined, companies, drivers));
  }

  return jsonResponse(filterDriversFor(scope.user, scope.companyId));
};

export const getAssetsController = async (c: Context) => {
  const scope = requestScope(c, 'assets.view');
  if ('error' in scope) return scope.error;

  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const companies = await getCompaniesFromDb(c.env.DB);
    const assets = await getAssetsFromDb(c.env.DB);
    return jsonResponse(filterAssetsForList(scope.user, scope.companyId ?? undefined, companies, assets));
  }

  return jsonResponse(filterAssetsFor(scope.user, scope.companyId));
};

export const getAlertsController = async (c: Context) => {
  const scope = requestScope(c, 'alerts.view');
  if ('error' in scope) return scope.error;

  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const companies = await getCompaniesFromDb(c.env.DB);
    const devices = await getDevicesFromDb(c.env.DB);
    const alerts = await getAlertsFromDb(c.env.DB);
    return jsonResponse(filterAlertsForList(scope.user, scope.companyId ?? undefined, companies, devices, alerts));
  }

  return jsonResponse(filterAlertsFor(scope.user, scope.companyId));
};

export const getEventsController = async (c: Context) => {
  const scope = requestScope(c, 'events.view');
  if ('error' in scope) return scope.error;

  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const companies = await getCompaniesFromDb(c.env.DB);
    const events = await getEventsFromDb(c.env.DB);
    return jsonResponse(filterEventsForList(scope.user, scope.companyId ?? undefined, companies, events));
  }

  return jsonResponse(filterEventsFor(scope.user, scope.companyId));
};
