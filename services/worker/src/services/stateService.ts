import type { Context } from 'hono';
import type { DeviceJourneyEvent } from '@evosensefleet/shared';
import type { D1Like, PersistedState } from '../types';
import { companies } from '../repositories/companyRepository';
import { users } from '../repositories/userRepository';
import { devices, drivers, assets } from '../repositories/deviceRepository';
import { alerts, fleetEvents, deviceEventHistory } from '../repositories/eventRepository';
import { sessions } from '../repositories/authRepository';
import { initializeDatabase } from './seedService';
import { cleanupExpiredSessions } from './sessionService';

const PARENT_COMPANY_ID = 'company-parent';

export async function ensureStateTable(db: D1Like) {
  const sql = 'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL);';
  if (db.exec) {
    await db.exec(sql);
    return;
  }
  await db.prepare(sql).bind().run();
}

function serializeDeviceJourneyHistory(): Record<string, DeviceJourneyEvent[]> {
  const out: Record<string, DeviceJourneyEvent[]> = {};
  for (const [deviceId, events] of deviceEventHistory.entries()) {
    out[deviceId] = events;
  }
  return out;
}

function restoreDeviceJourneyHistory(payload?: Record<string, unknown[]>) {
  deviceEventHistory.clear();
  if (!payload || typeof payload !== 'object') return;

  for (const [deviceId, events] of Object.entries(payload)) {
    if (!Array.isArray(events)) continue;
    const sanitized = events.filter((event) => event && typeof event === 'object');
    if (sanitized.length > 0) {
      deviceEventHistory.set(deviceId, sanitized as any);
    }
  }
}

export function snapshotState(): PersistedState {
  return {
    companies: Array.from(companies.values()),
    users: Array.from(users.values()),
    devices: Array.from(devices.values()),
    drivers: Array.from(drivers.values()),
    assets: Array.from(assets.values()),
    alerts,
    events: fleetEvents,
    deviceEvents: serializeDeviceJourneyHistory(),
    sessions: Array.from(sessions.entries()).map(([token, session]) => ({
      token,
      user: session.user,
      expiresAt: session.expiresAt,
    })),
  };
}

export function restoreState(payload: PersistedState) {
  companies.clear();
  users.clear();
  devices.clear();
  drivers.clear();
  assets.clear();
  deviceEventHistory.clear();
  fleetEvents.length = 0;
  sessions.clear();

  for (const company of payload.companies ?? []) companies.set(company.id, company);
  for (const user of payload.users ?? []) users.set(user.id, user);
  for (const device of payload.devices ?? []) devices.set(device.id, device);
  for (const driver of payload.drivers ?? []) drivers.set(driver.id, driver);
  for (const asset of payload.assets ?? []) assets.set(asset.id, asset);
  alerts.splice(0, alerts.length, ...(payload.alerts ?? []));
  fleetEvents.splice(0, fleetEvents.length, ...(payload.events ?? []));
  restoreDeviceJourneyHistory(payload.deviceEvents);
  for (const session of payload.sessions ?? []) {
    if (new Date(session.expiresAt).getTime() > Date.now()) {
      sessions.set(session.token, { user: session.user, expiresAt: session.expiresAt });
    }
  }
  ensureDefaultCompanies();
}

function ensureDefaultCompanies() {
  if (!companies.has(PARENT_COMPANY_ID)) {
    companies.set(PARENT_COMPANY_ID, {
      id: PARENT_COMPANY_ID,
      name: 'EvoSenseFleet',
      parentCompanyId: null,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }
  if (!companies.has('company-child-1')) {
    companies.set('company-child-1', {
      id: 'company-child-1',
      name: 'North Logistics',
      parentCompanyId: PARENT_COMPANY_ID,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }
}

export async function persistStateIfEnabled(c: Context) {
  const db = c.env?.DB as D1Like | undefined;
  if (!db) return;
  await ensureStateTable(db);
  await db.prepare('UPDATE app_state SET payload = ?, updated_at = ? WHERE id = 1').bind(JSON.stringify(snapshotState()), new Date().toISOString()).run();
}

export async function hydrateStateIfNeeded(c: Context) {
  const db = c.env?.DB as D1Like | undefined;
  if (!db) return;
  await ensureStateTable(db);

  const row = await db.prepare('SELECT payload FROM app_state WHERE id = 1').bind().first<{ payload: string }>();
  if (row?.payload) {
    try {
      const payload = JSON.parse(row.payload) as PersistedState;
      restoreState(payload);
      cleanupExpiredSessions();
    } catch {
      // keep in-memory fallback
    }
  } else {
    initializeDatabase();
    await db.prepare('INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)').bind(JSON.stringify(snapshotState()), new Date().toISOString()).run();
  }

  if (users.size === 0) {
    initializeDatabase();
    await db.prepare('UPDATE app_state SET payload = ?, updated_at = ? WHERE id = 1').bind(JSON.stringify(snapshotState()), new Date().toISOString()).run();
  }
}
