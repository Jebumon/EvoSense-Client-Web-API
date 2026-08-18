import type {
  AuthUser,
  Asset,
  Company,
  DeviceParameters,
  DeviceJourneyEvent,
  DeviceTelemetryEvent,
  Driver,
  FleetAlert,
  FleetDevice,
  FleetEvent,
  User,
  UserPermission,
  UserRole,
} from '@evosensefleet/shared';

export type { Asset, Company, DeviceJourneyEvent, Driver } from '@evosensefleet/shared';

export type D1Like = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      first: <T = unknown>() => Promise<T | null>;
      all: <T = unknown>() => Promise<T[]>;
      run: () => Promise<unknown>;
    };
  };
  exec?: (query: string) => Promise<unknown>;
};

export interface UserRecord extends User {
  passwordHash: string;
}

export interface DeviceRecord extends FleetDevice {
  parameters?: DeviceParameters;
  imei?: string;
}

export interface StreamSubscriber {
  user: AuthUser;
  selectedCompanyId?: string;
  push: (payload: unknown) => void;
}

export type PersistedSession = {
  token: string;
  user: AuthUser;
  expiresAt: string;
};

export interface SessionData {
  user: AuthUser;
  expiresAt: string;
}

export type PersistedState = {
  companies: Company[];
  users: UserRecord[];
  devices: DeviceRecord[];
  drivers: Driver[];
  assets: Asset[];
  alerts: FleetAlert[];
  events?: FleetEvent[];
  deviceEvents?: Record<string, DeviceJourneyEvent[]>;
  sessions?: PersistedSession[];
};

export type SampleDataCounts = {
  parentCompanies: number;
  childCompanies: number;
  users: number;
  vehicles: number;
  assets: number;
  alerts: number;
  events: number;
};
