import type { Context } from 'hono';
import type { Company, DeviceTelemetryEvent, DeviceJourneyEvent } from '@evosensefleet/shared';
import type { DeviceRecord } from '../types';
import { jsonResponse } from '../utils/response';
import { getUser } from './sessionService';
import { hasPermission } from './permissionService';
import { getDeviceById, saveDevice } from '../repositories/deviceRepository';
import { getCompanyById, saveCompany } from '../repositories/companyRepository';
import { saveDeviceEventHistory, getDeviceEventHistory } from '../repositories/eventRepository';
import { createAlert } from './alertService';
import { persistStateIfEnabled } from './persistenceService';

const STOCK_COMPANY_ID = 'company-stock';
const PARENT_COMPANY_ID = 'company-parent';

function createStockCompanyIfMissing(): Company {
  let company = getCompanyById(STOCK_COMPANY_ID);
  if (!company) {
    company = {
      id: STOCK_COMPANY_ID,
      name: 'On Stock',
      parentCompanyId: PARENT_COMPANY_ID,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    saveCompany(company);
  }
  return company;
}

function createDeviceFromTelemetry(body: DeviceTelemetryEvent, stockCompanyId: string): DeviceRecord {
  const now = new Date().toISOString();
  const speedUnit = 'km/h';
  const batteryValue = typeof body.battery === 'number' ? body.battery : 0;
  const temperatureValue = typeof body.temperature === 'number' ? body.temperature : 0;

  return {
    id: body.deviceId,
    name: `Device ${body.deviceId}`,
    tenantId: stockCompanyId,
    status: temperatureValue >= 85 || batteryValue <= 15 ? 'maintenance' : 'online',
    location: body.locationLabel ?? 'On Stock',
    lastSeen: 'just now',
    battery: batteryValue,
    lastCommunication: body.timestamp || now,
    lastGps: body.locationLabel ?? 'On Stock',
    lastReport: body.timestamp || now,
    batteryLevel: batteryValue,
    externalVoltage: 0,
    signalStrength: 0,
    gpsSignalStrength: 0,
    temperature: temperatureValue,
    speed: body.speed,
    speedUnit,
    ignitionStatus: body.ignitionStatus ?? (body.speed > 0 ? 'on' : 'off'),
    movementStatus: body.speed > 3 ? 'moving' : body.ignitionStatus === 'on' ? 'idling' : 'stationary',
    settings: { speedUnit },
    createdAt: now,
    imei: body.deviceId,
    parameters: {
      batteryVoltage: 0,
      batteryCurrent: 0,
      batteryPercentage: batteryValue,
      temperature: temperatureValue,
      imei: body.deviceId,
      imsi: '',
      iccid: '',
      signalStrength: 0,
      gpsSatellites: 0,
      firmwareVersion: 'v1.0.0',
    },
  };
}

function updateDeviceFromTelemetry(device: DeviceRecord, body: DeviceTelemetryEvent) {
  device.status = body.temperature >= 85 || body.battery <= 15 ? 'maintenance' : 'online';
  device.lastSeen = 'just now';
  device.battery = body.battery;
  device.lastCommunication = body.timestamp || new Date().toISOString();
  device.lastGps = device.location;
  device.lastReport = body.timestamp || new Date().toISOString();
  device.batteryLevel = body.battery;
  device.temperature = body.temperature;
  device.speed = body.speed;
  device.ignitionStatus = body.ignitionStatus ?? (body.speed > 0 ? 'on' : 'off');
  device.movementStatus = device.speed > 3 ? 'moving' : device.ignitionStatus === 'on' ? 'idling' : 'stationary';
}

function buildJourneyEvent(device: DeviceRecord, body: DeviceTelemetryEvent): DeviceJourneyEvent {
  return {
    id: `dte-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    deviceId: device.id,
    tenantId: device.tenantId,
    timestamp: body.timestamp || new Date().toISOString(),
    speed: device.speed,
    temperature: body.temperature,
    battery: body.battery,
    ignitionStatus: device.ignitionStatus,
    latitude: body.latitude ?? 0,
    longitude: body.longitude ?? 0,
    heading: body.heading ?? 0,
    locationLabel: body.locationLabel ?? device.location,
    address: body.address,
    alert: undefined,
  };
}

export const postTelemetry = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'devices.view')) return jsonResponse({ error: 'Forbidden' }, 403);

  const body = await c.req.json<DeviceTelemetryEvent>();
  if (!body.deviceId) return jsonResponse({ error: 'Device ID is required' }, 400);

  const device = getDeviceById(body.deviceId);
  if (!device) return jsonResponse({ error: 'Unknown device' }, 404);
  if (device.tenantId !== user.tenantId && !hasPermission(user, 'companies.view')) return jsonResponse({ error: 'Forbidden for target device' }, 403);

  updateDeviceFromTelemetry(device, body);
  saveDevice(device);

  const journeyEvent = buildJourneyEvent(device, body);
  const history = getDeviceEventHistory(device.id);
  saveDeviceEventHistory(device.id, [journeyEvent, ...history].slice(0, 200));
  const alert = createAlert(device.id, body);
  await persistStateIfEnabled(c);
  return jsonResponse({ ok: true, receivedAt: new Date().toISOString(), alert });
};

export const postDeviceTelemetry = async (c: Context) => {
  const body = await c.req.json<DeviceTelemetryEvent>();
  if (!body.deviceId) return jsonResponse({ error: 'Device ID is required' }, 400);

  const stockCompany = createStockCompanyIfMissing();
  let device: DeviceRecord | undefined = getDeviceById(body.deviceId);
  const createdDevice = !device;
  if (!device) {
    device = createDeviceFromTelemetry(body, stockCompany.id);
  } else {
    updateDeviceFromTelemetry(device, body);
  }
  if (!device) return jsonResponse({ error: 'Failed to process device' }, 500);

  saveDevice(device);
  const journeyEvent = buildJourneyEvent(device, body);
  const history = getDeviceEventHistory(device.id);
  saveDeviceEventHistory(device.id, [journeyEvent, ...history].slice(0, 200));
  const alert = createAlert(device.id, body);
  await persistStateIfEnabled(c);
  return jsonResponse({ ok: true, receivedAt: new Date().toISOString(), createdDevice, alert });
};
