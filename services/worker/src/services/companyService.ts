import type { AuthUser, DeviceJourneyEvent, FleetAlert, FleetEvent } from '@evosensefleet/shared';
import { companies } from '../repositories/companyRepository';
import { users } from '../repositories/userRepository';
import { devices, drivers, assets } from '../repositories/deviceRepository';
import { alerts, fleetEvents, deviceEventHistory } from '../repositories/eventRepository';

export function isParentUser(user: AuthUser) {
  return user.tenantId === 'company-parent';
}

export function getDescendantCompanyIds(rootCompanyId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [rootCompanyId];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    for (const company of companies.values()) {
      if (company.parentCompanyId === current && !visited.has(company.id)) {
        queue.push(company.id);
      }
    }
  }

  return visited;
}

export function getAccessibleCompanyIds(user: AuthUser): Set<string> {
  if (isParentUser(user)) {
    return new Set(Array.from(companies.keys()));
  }
  return getDescendantCompanyIds(user.tenantId);
}

export function canAccessCompany(user: AuthUser, companyId: string) {
  return getAccessibleCompanyIds(user).has(companyId);
}

export function inScope(user: AuthUser, companyId: string) {
  return canAccessCompany(user, companyId);
}

export function getCompanyScopeForRequest(user: AuthUser, requestedCompanyId?: string): Set<string> {
  if (!requestedCompanyId) {
    return getAccessibleCompanyIds(user);
  }
  if (!canAccessCompany(user, requestedCompanyId)) {
    return new Set<string>();
  }
  return getDescendantCompanyIds(requestedCompanyId);
}

export function filterDevicesFor(user: AuthUser, requestedCompanyId?: string) {
  const scope = getCompanyScopeForRequest(user, requestedCompanyId);
  return Array.from(devices.values()).filter((device) => scope.has(device.tenantId));
}

export function filterDeviceEventsFor(deviceId: string, limit = 100): DeviceJourneyEvent[] {
  return (deviceEventHistory.get(deviceId) ?? []).slice(0, Math.max(1, Math.min(limit, 500)));
}

export function filterUsersFor(user: AuthUser, requestedCompanyId?: string) {
  const scope = getCompanyScopeForRequest(user, requestedCompanyId);
  return Array.from(users.values()).filter((u) => scope.has(u.tenantId));
}

export function filterAssetsFor(user: AuthUser, requestedCompanyId?: string) {
  const scope = getCompanyScopeForRequest(user, requestedCompanyId);
  return Array.from(assets.values()).filter((asset) => scope.has(asset.tenantId));
}

export function filterDriversFor(user: AuthUser, requestedCompanyId?: string) {
  const scope = getCompanyScopeForRequest(user, requestedCompanyId);
  return Array.from(drivers.values()).filter((driver) => scope.has(driver.tenantId));
}

export function filterCompaniesFor(user: AuthUser, requestedCompanyId?: string) {
  const scope = getCompanyScopeForRequest(user, requestedCompanyId);
  return Array.from(companies.values()).filter((company) => scope.has(company.id));
}

export function filterAlertsFor(user: AuthUser, requestedCompanyId?: string) {
  const scope = getCompanyScopeForRequest(user, requestedCompanyId);
  return alerts.filter((alert) => {
    const device = devices.get(alert.deviceId);
    return Boolean(device && scope.has(device.tenantId));
  });
}

export function filterEventsFor(user: AuthUser, requestedCompanyId?: string) {
  const scope = getCompanyScopeForRequest(user, requestedCompanyId);
  return fleetEvents.filter((event) => scope.has(event.tenantId));
}
