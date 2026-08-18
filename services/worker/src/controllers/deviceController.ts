import type { Context } from 'hono';
import type { DeviceRecord } from '../types';
import { jsonResponse } from '../utils/response';
import { getUser } from '../services/sessionService';
import { hasPermission } from '../services/permissionService';
import { filterDevicesFor, filterDeviceEventsFor, canAccessCompany, getCompanyScopeForRequest, filterDevicesForList, getCompanyScopeForRequestFromList } from '../services/companyService';
import { getDeviceById, saveDevice, deleteDevice } from '../repositories/deviceRepository';
import { getCompanyById } from '../repositories/companyRepository';
import { getCompaniesFromDb, getDevicesFromDb, getDeviceEventsFromDb, getDeviceFromDb } from '../services/dbReadService';
import { isRelationalPersistenceEnabled } from '../services/stateService';
import { recordAuditEvent } from '../services/auditService';
import { persistStateIfEnabled } from '../services/persistenceService';
import { validateIMEI } from '../utils/validators';

export const getDevicesController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'devices.view')) return jsonResponse({ error: 'Forbidden: missing devices.view permission' }, 403);

  const requestedCompanyId = c.req.query('companyId');
  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const companies = await getCompaniesFromDb(c.env.DB);
    const devices = await getDevicesFromDb(c.env.DB);
    return jsonResponse(filterDevicesForList(user, requestedCompanyId ?? undefined, companies, devices));
  }

  return jsonResponse(filterDevicesFor(user, requestedCompanyId ?? undefined));
};

export const getDeviceController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'devices.view')) return jsonResponse({ error: 'Forbidden: missing devices.view permission' }, 403);

  const id = c.req.param('id');
  if (!id) return jsonResponse({ error: 'Device ID is required' }, 400);

  let device = getDeviceById(id);
  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    device = await getDeviceFromDb(c.env.DB, id) ?? device;
  }

  if (!device) return jsonResponse({ error: 'Device not found' }, 404);
  if (!filterDevicesFor(user).includes(device)) return jsonResponse({ error: 'Forbidden for target device' }, 403);

  return jsonResponse(device);
};

export const getDeviceEventsController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'devices.view')) return jsonResponse({ error: 'Forbidden: missing devices.view permission' }, 403);

  const id = c.req.param('id');
  if (!id) return jsonResponse({ error: 'Device ID is required' }, 400);
  const device = getDeviceById(id);
  if (!device) return jsonResponse({ error: 'Device not found' }, 404);
  if (!filterDevicesFor(user).includes(device)) return jsonResponse({ error: 'Forbidden for target device' }, 403);

  const limitParam = Number(c.req.query('limit') ?? '100');
  const limit = Number.isFinite(limitParam) ? limitParam : 100;
  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const events = await getDeviceEventsFromDb(c.env.DB, device.id);
    return jsonResponse(events.slice(0, limit));
  }

  return jsonResponse(filterDeviceEventsFor(device.id, limit));
};

export const createDeviceController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'devices.create')) return jsonResponse({ error: 'Forbidden: missing devices.create permission' }, 403);

  try {
    const body = await c.req.json<{
      name?: string;
      imei?: string;
      tenantId?: string;
      settings?: { speedUnit?: string };
    }>();

    if (!body.name?.trim()) return jsonResponse({ error: 'Name is required' }, 400);
    if (!body.imei || !validateIMEI(body.imei)) return jsonResponse({ error: 'IMEI must be 15 digits' }, 400);

    const speedUnit = body.settings?.speedUnit === 'mi/h' ? 'mi/h' : 'km/h';

    const targetTenantId = body.tenantId ?? user.tenantId;
    if (!getCompanyById(targetTenantId)) return jsonResponse({ error: 'Target company not found' }, 404);
    if (!canAccessCompany(user, targetTenantId)) return jsonResponse({ error: 'Forbidden for target company' }, 403);

    const device: DeviceRecord = {
      id: `DEV-${Date.now()}`,
      name: body.name.trim(),
      tenantId: targetTenantId,
      status: 'offline',
      location: 'Unknown',
      lastSeen: new Date().toISOString(),
      battery: 0,
      lastCommunication: new Date().toISOString(),
      lastGps: 'Unknown',
      lastReport: new Date().toISOString(),
      batteryLevel: 0,
      externalVoltage: 0,
      signalStrength: 0,
      gpsSignalStrength: 0,
      temperature: 0,
      speed: 0,
      speedUnit,
      ignitionStatus: 'off',
      movementStatus: 'stationary',
      settings: { speedUnit },
      createdAt: new Date().toISOString(),
      imei: body.imei,
      parameters: {
        batteryVoltage: 0,
        batteryCurrent: 0,
        batteryPercentage: 0,
        temperature: 0,
        imei: body.imei,
        imsi: '',
        iccid: '',
        signalStrength: 0,
        gpsSatellites: 0,
        firmwareVersion: 'v1.0.0',
      },
    };

    saveDevice(device);
    recordAuditEvent(user, 'create', 'device', device.id, device.tenantId, `${user.name} created device ${device.name}`);
    await persistStateIfEnabled(c);

    return jsonResponse(device, 201);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
};

export const updateDeviceController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'devices.update')) return jsonResponse({ error: 'Forbidden: missing devices.update permission' }, 403);

  const id = c.req.param('id');
  if (!id) return jsonResponse({ error: 'Device ID is required' }, 400);
  const existing = getDeviceById(id);
  if (!existing) return jsonResponse({ error: 'Device not found' }, 404);
  if (!filterDevicesFor(user).includes(existing)) return jsonResponse({ error: 'Forbidden for target device' }, 403);

  try {
    const body = await c.req.json<Partial<Record<string, unknown>>>();
    if (body.name !== undefined) existing.name = String(body.name);
    if (body.status !== undefined) existing.status = String(body.status) as any;
    if (body.location !== undefined) existing.location = String(body.location);
    if (body.parameters && typeof body.parameters === 'object') {
      existing.parameters = { ...existing.parameters, ...(body.parameters as any) };
    }

    saveDevice(existing);
    recordAuditEvent(user, 'update', 'device', existing.id, existing.tenantId, `${user.name} updated device ${existing.name}`);
    await persistStateIfEnabled(c);

    return jsonResponse(existing);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
};

export const deleteDeviceController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'devices.delete')) return jsonResponse({ error: 'Forbidden: missing devices.delete permission' }, 403);

  const id = c.req.param('id');
  if (!id) return jsonResponse({ error: 'Device ID is required' }, 400);
  const existing = getDeviceById(id);
  if (!existing) return jsonResponse({ error: 'Device not found' }, 404);
  if (!getCompanyScopeForRequest(user).has(existing.tenantId)) return jsonResponse({ error: 'Forbidden for target device' }, 403);

  deleteDevice(existing.id);
  recordAuditEvent(user, 'delete', 'device', existing.id, existing.tenantId, `${user.name} deleted device ${existing.name}`);
  await persistStateIfEnabled(c);

  return jsonResponse({ ok: true });
};
