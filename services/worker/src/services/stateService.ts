import type { Context } from 'hono';
import type {
  AuthUser,
  Asset,
  Company,
  DeviceJourneyEvent,
  Driver,
  FleetAlert,
  FleetEvent,
} from '@evosensefleet/shared';
import type { D1Like, DeviceRecord, PersistedSession, PersistedState, UserRecord } from '../types';
import { companies } from '../repositories/companyRepository';
import { users } from '../repositories/userRepository';
import { devices, drivers, assets } from '../repositories/deviceRepository';
import { alerts, fleetEvents, deviceEventHistory } from '../repositories/eventRepository';
import { sessions } from '../repositories/authRepository';
import { initializeDatabase } from './seedService';
import { cleanupExpiredSessions } from './sessionService';

const PARENT_COMPANY_ID = 'company-parent';

export function isRelationalPersistenceEnabled(): boolean {
  return Boolean(process.env.MYSQL_HOST || process.env.USE_MYSQL === 'true');
}

export async function ensureStateTable(db: D1Like) {
  const sql = 'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL);';
  if (db.exec) {
    await db.exec(sql);
    return;
  }
  await db.prepare(sql).bind().run();
}

async function ensureRelationalTables(db: D1Like) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS companies (id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS users (id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS devices (id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS drivers (id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS assets (id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS alerts (id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS events (id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS device_events (device_id VARCHAR(128) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at VARCHAR(64) NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(256) PRIMARY KEY, payload LONGTEXT NOT NULL, expires_at VARCHAR(64) NOT NULL);`,
  ];

  for (const query of tables) {
    if (db.exec) {
      await db.exec(query);
    } else {
      await db.prepare(query).bind().run();
    }
  }
}

async function loadRelationalRows(db: D1Like, query: string) {
  return await db.prepare(query).bind().all<{ payload: string }>();
}

async function loadRelationalRawRows<T>(db: D1Like, query: string) {
  return await db.prepare(query).bind().all<T>();
}

async function getAppStatePayload(db: D1Like): Promise<PersistedState | null> {
  try {
    const row = await db.prepare('SELECT payload FROM app_state WHERE id = 1').bind().first<{ payload: string }>();
    if (!row?.payload) return null;
    return JSON.parse(row.payload) as PersistedState;
  } catch {
    return null;
  }
}

async function hydrateRelationalState(db: D1Like) {
  await ensureRelationalTables(db);

  const countRow = await db.prepare('SELECT COUNT(*) AS count FROM companies').bind().first<{ count: number }>();
  const companiesCount = countRow?.count ?? 0;
  if (companiesCount === 0) {
    const existingState = await getAppStatePayload(db);
    if (existingState) {
      restoreState(existingState);
      await persistRelationalState(db, existingState);
      cleanupExpiredSessions();
      return;
    }
  }

  companies.clear();
  users.clear();
  devices.clear();
  drivers.clear();
  assets.clear();
  deviceEventHistory.clear();
  fleetEvents.length = 0;
  sessions.clear();

  const companyRows = await loadRelationalRows(db, 'SELECT payload FROM companies');
  for (const row of companyRows) {
    try {
      const company = JSON.parse(row.payload) as Company;
      companies.set(company.id, company);
    } catch {
      // ignore invalid rows
    }
  }

  const userRows = await loadRelationalRows(db, 'SELECT payload FROM users');
  for (const row of userRows) {
    try {
      const user = JSON.parse(row.payload) as UserRecord;
      users.set(user.id, user);
    } catch {
      // ignore invalid rows
    }
  }

  const deviceRows = await loadRelationalRows(db, 'SELECT payload FROM devices');
  for (const row of deviceRows) {
    try {
      const device = JSON.parse(row.payload) as DeviceRecord;
      devices.set(device.id, device);
    } catch {
      // ignore invalid rows
    }
  }

  const driverRows = await loadRelationalRows(db, 'SELECT payload FROM drivers');
  for (const row of driverRows) {
    try {
      const driver = JSON.parse(row.payload) as Driver;
      drivers.set(driver.id, driver);
    } catch {
      // ignore invalid rows
    }
  }

  const assetRows = await loadRelationalRows(db, 'SELECT payload FROM assets');
  for (const row of assetRows) {
    try {
      const asset = JSON.parse(row.payload) as Asset;
      assets.set(asset.id, asset);
    } catch {
      // ignore invalid rows
    }
  }

  const alertRows = await loadRelationalRows(db, 'SELECT payload FROM alerts');
  alerts.splice(0, alerts.length, ...alertRows.map((row) => {
    try {
      return JSON.parse(row.payload) as FleetAlert;
    } catch {
      return null;
    }
  }).filter(Boolean) as FleetAlert[]);

  const eventRows = await loadRelationalRows(db, 'SELECT payload FROM events');
  fleetEvents.splice(0, fleetEvents.length, ...eventRows.map((row) => {
    try {
      return JSON.parse(row.payload) as FleetEvent;
    } catch {
      return null;
    }
  }).filter(Boolean) as FleetEvent[]);

  const deviceEventRows = await loadRelationalRawRows<{ device_id: string; payload: string }>(db, 'SELECT device_id, payload FROM device_events');
  for (const row of deviceEventRows) {
    try {
      const payload = JSON.parse(row.payload) as DeviceJourneyEvent[];
      if (Array.isArray(payload)) {
        deviceEventHistory.set(row.device_id, payload);
      }
    } catch {
      // ignore invalid rows
    }
  }

  const sessionRows = await loadRelationalRawRows<{ token: string; payload: string; expires_at: string }>(db, 'SELECT token, payload, expires_at FROM sessions');
  for (const row of sessionRows) {
    try {
      const user = JSON.parse(row.payload) as AuthUser;
      if (new Date(row.expires_at).getTime() > Date.now()) {
        sessions.set(row.token, { user, expiresAt: row.expires_at });
      }
    } catch {
      // ignore invalid rows
    }
  }

  if (users.size === 0) {
    initializeDatabase();
    await persistRelationalState(db, snapshotState());
  } else {
    cleanupExpiredSessions();
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

export async function persistRelationalState(db: D1Like, state: PersistedState) {
  await ensureRelationalTables(db);

  const now = new Date().toISOString();
  const tableNames = ['companies', 'users', 'devices', 'drivers', 'assets', 'alerts', 'events', 'device_events', 'sessions'];
  for (const table of tableNames) {
    if (db.exec) {
      await db.exec(`DELETE FROM ${table}`);
    } else {
      await db.prepare(`DELETE FROM ${table}`).bind().run();
    }
  }

  const replacePayload = async (table: string, id: string, payload: unknown, timestamp: string) => {
    await db.prepare(`REPLACE INTO ${table} (id, payload, updated_at) VALUES (?, ?, ?)`)
      .bind(id, JSON.stringify(payload), timestamp)
      .run();
  };

  for (const company of state.companies) {
    await replacePayload('companies', company.id, company, now);
  }

  for (const user of state.users) {
    await replacePayload('users', user.id, user, now);
  }

  for (const device of state.devices) {
    await replacePayload('devices', device.id, device, now);
  }

  for (const driver of state.drivers) {
    await replacePayload('drivers', driver.id, driver, now);
  }

  for (const asset of state.assets) {
    await replacePayload('assets', asset.id, asset, now);
  }

  for (const alert of state.alerts ?? []) {
    await replacePayload('alerts', alert.id, alert, now);
  }

  for (const event of state.events ?? []) {
    await replacePayload('events', event.id, event, now);
  }

  for (const [deviceId, history] of Object.entries(state.deviceEvents ?? {})) {
    await db.prepare('REPLACE INTO device_events (device_id, payload, updated_at) VALUES (?, ?, ?)')
      .bind(deviceId, JSON.stringify(history), now)
      .run();
  }

  for (const session of state.sessions ?? []) {
    await db.prepare('REPLACE INTO sessions (token, payload, expires_at) VALUES (?, ?, ?)')
      .bind(session.token, JSON.stringify(session.user), session.expiresAt)
      .run();
  }
}

export async function persistStateIfEnabled(c: Context) {
  const db = c.env?.DB as D1Like | undefined;
  if (!db) return;

  if (isRelationalPersistenceEnabled()) {
    await persistRelationalState(db, snapshotState());
    return;
  }

  await ensureStateTable(db);
  await db.prepare('UPDATE app_state SET payload = ?, updated_at = ? WHERE id = 1').bind(JSON.stringify(snapshotState()), new Date().toISOString()).run();
}

export async function hydrateStateIfNeeded(c: Context) {
  const db = c.env?.DB as D1Like | undefined;
  if (!db) return;

  if (isRelationalPersistenceEnabled()) {
    await hydrateRelationalState(db);
    return;
  }

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
