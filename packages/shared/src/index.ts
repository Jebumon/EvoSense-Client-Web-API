export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type CompanyStatus = 'active' | 'inactive';
export type UserPermission =
  | 'companies.view'
  | 'companies.create'
  | 'companies.edit'
  | 'companies.delete'
  | 'devices.view'
  | 'devices.create'
  | 'devices.update'
  | 'devices.delete'
  | 'drivers.view'
  | 'drivers.create'
  | 'drivers.update'
  | 'drivers.delete'
  | 'assets.view'
  | 'assets.create'
  | 'assets.update'
  | 'assets.delete'
  | 'alerts.view'
  | 'events.view'
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.delete';

export type Company = {
  id: string;
  name: string;
  parentCompanyId: string | null;
  status: CompanyStatus;
  createdAt: string;
};

export type CreateCompanyInput = {
  name: string;
  parentCompanyId?: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  status: UserStatus;
  createdAt: string;
  permissions: UserPermission[];
  explicitPermissions?: UserPermission[];
};

export type User = AuthUser & {
  phone?: string;
  lastLogin?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  tenantId?: string;
  permissions?: UserPermission[];
};

export type DeviceParameters = {
  batteryVoltage: number;
  batteryCurrent: number;
  batteryPercentage: number;
  temperature: number;
  imei: string;
  imsi: string;
  iccid: string;
  signalStrength: number;
  gpsSatellites: number;
  firmwareVersion: string;
};

export type SpeedUnit = 'km/h' | 'mi/h';

export type IgnitionStatus = 'on' | 'off';

export type MovementStatus = 'moving' | 'idling' | 'stationary';

export type DeviceSettings = {
  speedUnit: SpeedUnit;
};

export type FleetDevice = {
  id: string;
  name: string;
  tenantId: string;
  status: 'online' | 'offline' | 'maintenance';
  location: string;
  lastSeen: string;
  battery: number;
  lastCommunication?: string;
  lastGps?: string;
  lastReport?: string;
  batteryLevel?: number;
  externalVoltage?: number;
  signalStrength?: number;
  gpsSignalStrength?: number;
  temperature: number;
  speed: number;
  speedUnit?: SpeedUnit;
  ignitionStatus?: IgnitionStatus;
  movementStatus?: MovementStatus;
  settings?: DeviceSettings;
  parameters?: DeviceParameters;
  driverId?: string;
  assetId?: string;
  createdAt: string;
};

export type CreateDeviceInput = {
  name: string;
  imei: string;
  type: 'vehicle' | 'trailer' | 'asset';
  tenantId?: string;
  settings?: DeviceSettings;
};

export type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: 'active' | 'inactive' | 'suspended';
  assignedDevices: string[];
  createdAt: string;
  tenantId: string;
};

export type CreateDriverInput = {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  tenantId?: string;
};

export type Asset = {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'maintenance';
  deviceId?: string;
  location: string;
  value?: number;
  createdAt: string;
  tenantId: string;
};

export type CreateAssetInput = {
  name: string;
  type: string;
  value?: number;
  tenantId?: string;
};

export type FleetOverview = {
  totalVehicles: number;
  onlineVehicles: number;
  activeAlerts: number;
  averageFuelEfficiency: number;
  lastUpdated: string;
};

export type DeviceTelemetryEvent = {
  deviceId: string;
  timestamp: string;
  speed: number;
  temperature: number;
  battery: number;
  ignitionStatus?: IgnitionStatus;
  latitude?: number;
  longitude?: number;
  heading?: number;
  locationLabel?: string;
  address?: string;
  alert?: string;
};

export type DeviceJourneyEvent = {
  id: string;
  deviceId: string;
  tenantId: string;
  timestamp: string;
  speed: number;
  temperature: number;
  battery: number;
  ignitionStatus?: IgnitionStatus;
  latitude: number;
  longitude: number;
  heading?: number;
  locationLabel?: string;
  address?: string;
  alert?: string;
};

export type FleetAlert = {
  id: string;
  deviceId: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  createdAt: string;
};

export type AuditAction = 'create' | 'update' | 'delete';

export type AuditEntity = 'company' | 'user' | 'device' | 'driver' | 'asset';

export type FleetEvent = {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  tenantId: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  summary: string;
};
