import type { D1Like } from '../types';
import type {
  Asset,
  Company,
  DeviceJourneyEvent,
  Driver,
  FleetAlert,
  FleetEvent,
} from '@evosensefleet/shared';
import type { DeviceRecord } from '../types';

async function queryPayloadRows<T>(db: D1Like, table: string): Promise<T[]> {
  const rows = await db.prepare(`SELECT payload FROM ${table}`).bind().all<{ payload: string }>();
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.payload) as T;
      } catch {
        return null;
      }
    })
    .filter((value): value is T => value !== null);
}

export async function getCompaniesFromDb(db: D1Like): Promise<Company[]> {
  return queryPayloadRows<Company>(db, 'companies');
}

export async function getDevicesFromDb(db: D1Like): Promise<DeviceRecord[]> {
  return queryPayloadRows<DeviceRecord>(db, 'devices');
}

export async function getDriversFromDb(db: D1Like): Promise<Driver[]> {
  return queryPayloadRows<Driver>(db, 'drivers');
}

export async function getAssetsFromDb(db: D1Like): Promise<Asset[]> {
  return queryPayloadRows<Asset>(db, 'assets');
}

export async function getAlertsFromDb(db: D1Like): Promise<FleetAlert[]> {
  return queryPayloadRows<FleetAlert>(db, 'alerts');
}

export async function getEventsFromDb(db: D1Like): Promise<FleetEvent[]> {
  return queryPayloadRows<FleetEvent>(db, 'events');
}

export async function getDeviceEventsFromDb(db: D1Like, deviceId: string): Promise<DeviceJourneyEvent[]> {
  const rows = await db.prepare('SELECT payload FROM device_events WHERE device_id = ?').bind(deviceId).all<{ payload: string }>();
  return rows
    .map((row) => {
      try {
        const payload = JSON.parse(row.payload) as DeviceJourneyEvent[];
        return Array.isArray(payload) ? payload : null;
      } catch {
        return null;
      }
    })
    .filter((value): value is DeviceJourneyEvent[] => value !== null)
    .flat();
}

export async function getDeviceFromDb(db: D1Like, deviceId: string): Promise<DeviceRecord | null> {
  const rows = await db.prepare('SELECT payload FROM devices WHERE id = ?').bind(deviceId).all<{ payload: string }>();
  if (rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].payload) as DeviceRecord;
  } catch {
    return null;
  }
}
