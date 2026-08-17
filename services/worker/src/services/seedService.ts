import { hashPassword } from '../utils/crypto';
import type { DeviceJourneyEvent, Driver, Asset, Company, UserRecord, DeviceRecord } from '../types';
import { companies } from '../repositories/companyRepository';
import { users } from '../repositories/userRepository';
import { devices, drivers, assets } from '../repositories/deviceRepository';
import { alerts, fleetEvents, deviceEventHistory } from '../repositories/eventRepository';

const PARENT_COMPANY_ID = 'company-parent';

export function initializeDatabase() {
  const now = new Date().toISOString();

  const parentCompany: Company = {
    id: PARENT_COMPANY_ID,
    name: 'EvoSenseFleet',
    parentCompanyId: null,
    status: 'active',
    createdAt: now,
  };

  const childCompany: Company = {
    id: 'company-child-1',
    name: 'North Logistics',
    parentCompanyId: PARENT_COMPANY_ID,
    status: 'active',
    createdAt: now,
  };

  companies.set(parentCompany.id, parentCompany);
  companies.set(childCompany.id, childCompany);

  const demoUsers: UserRecord[] = [
    {
      id: 'u-admin',
      name: 'Mina Chen',
      email: 'admin@evosensefleet.com',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      tenantId: PARENT_COMPANY_ID,
      status: 'active',
      createdAt: now,
      phone: '+1234567890',
      permissions: [],
    },
    {
      id: 'u-manager',
      name: 'Jules Ford',
      email: 'manager@evosensefleet.com',
      passwordHash: hashPassword('manager123'),
      role: 'manager',
      tenantId: PARENT_COMPANY_ID,
      status: 'active',
      createdAt: now,
      phone: '+1234567891',
      permissions: [],
    },
    {
      id: 'u-operator',
      name: 'Nia Brooks',
      email: 'operator@evosensefleet.com',
      passwordHash: hashPassword('operator123'),
      role: 'operator',
      tenantId: 'company-child-1',
      status: 'active',
      createdAt: now,
      phone: '+1234567892',
      permissions: [],
    },
  ];

  for (const user of demoUsers) {
    users.set(user.id, user);
  }

  const demoDevices: DeviceRecord[] = [
    {
      id: 'DEV-001',
      name: 'Truck 01',
      tenantId: PARENT_COMPANY_ID,
      status: 'online',
      location: 'North Hub',
      lastSeen: '2 min ago',
      battery: 84,
      lastCommunication: now,
      lastGps: 'North Hub',
      lastReport: now,
      batteryLevel: 84,
      externalVoltage: 48.2,
      signalStrength: -85,
      gpsSignalStrength: 12,
      temperature: 68,
      speed: 42,
      speedUnit: 'km/h',
      ignitionStatus: 'on',
      movementStatus: 'moving',
      settings: { speedUnit: 'km/h' },
      createdAt: now,
      imei: '352684089019522',
      parameters: {
        batteryVoltage: 48.2,
        batteryCurrent: 15.3,
        batteryPercentage: 84,
        temperature: 68,
        imei: '352684089019522',
        imsi: '310410123456789',
        iccid: '8934401234567890123',
        signalStrength: -85,
        gpsSatellites: 12,
        firmwareVersion: 'v2.1.4',
      },
    },
    {
      id: 'DEV-002',
      name: 'Van 04',
      tenantId: PARENT_COMPANY_ID,
      status: 'maintenance',
      location: 'Depot B',
      lastSeen: '15 min ago',
      battery: 24,
      lastCommunication: now,
      lastGps: 'Depot B',
      lastReport: now,
      batteryLevel: 24,
      externalVoltage: 32.1,
      signalStrength: -92,
      gpsSignalStrength: 8,
      temperature: 76,
      speed: 0,
      speedUnit: 'mi/h',
      ignitionStatus: 'off',
      movementStatus: 'stationary',
      settings: { speedUnit: 'mi/h' },
      createdAt: now,
      imei: '352684089019523',
      parameters: {
        batteryVoltage: 32.1,
        batteryCurrent: 8.5,
        batteryPercentage: 24,
        temperature: 76,
        imei: '352684089019523',
        imsi: '310410123456790',
        iccid: '8934401234567890124',
        signalStrength: -92,
        gpsSatellites: 8,
        firmwareVersion: 'v2.1.3',
      },
    },
  ];

  for (const device of demoDevices) devices.set(device.id, device);

  const demoDrivers: Driver[] = [
    {
      id: 'driver-001',
      name: 'Michael Chen',
      email: 'michael@evosensefleet.com',
      phone: '+1234567900',
      licenseNumber: 'DL-001-2024',
      status: 'active',
      assignedDevices: ['DEV-001'],
      createdAt: now,
      tenantId: PARENT_COMPANY_ID,
    },
    {
      id: 'driver-002',
      name: 'Sarah Patel',
      email: 'sarah@evosensefleet.com',
      phone: '+1234567901',
      licenseNumber: 'DL-002-2024',
      status: 'active',
      assignedDevices: ['DEV-002'],
      createdAt: now,
      tenantId: 'company-child-1',
    },
  ];

  for (const driver of demoDrivers) drivers.set(driver.id, driver);

  const demoAssets: Asset[] = [
    {
      id: 'asset-001',
      name: 'Refrigeration Unit 1',
      type: 'refrigeration',
      status: 'active',
      deviceId: 'DEV-001',
      location: 'North Hub',
      value: 15000,
      createdAt: now,
      tenantId: PARENT_COMPANY_ID,
    },
    {
      id: 'asset-002',
      name: 'Trailer Box 9',
      type: 'cargo',
      status: 'active',
      deviceId: 'DEV-002',
      location: 'Depot B',
      value: 11000,
      createdAt: now,
      tenantId: PARENT_COMPANY_ID,
    },
  ];

  for (const asset of demoAssets) assets.set(asset.id, asset);

  alerts.splice(0, alerts.length, {
    id: 'alert-1',
    deviceId: 'DEV-002',
    severity: 'medium',
    title: 'Sample Alert',
    message: 'This is a seeded alert for demo data.',
    createdAt: now,
  });

  fleetEvents.splice(0, fleetEvents.length, {
    id: 'event-1',
    action: 'create',
    entity: 'device',
    entityId: 'DEV-001',
    tenantId: PARENT_COMPANY_ID,
    createdAt: now,
    actor: {
      id: 'u-admin',
      name: 'Mina Chen',
      email: 'admin@evosensefleet.com',
      role: 'admin',
    },
    summary: 'Seeded demo event',
  });

  deviceEventHistory.set('DEV-001', [
    {
      id: 'dte-seed-001-1',
      deviceId: 'DEV-001',
      tenantId: PARENT_COMPANY_ID,
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      speed: 36,
      temperature: 66,
      battery: 86,
      ignitionStatus: 'on',
      latitude: 37.7892,
      longitude: -122.4015,
      heading: 95,
      locationLabel: 'North Hub Exit',
      address: 'Howard St, San Francisco, CA',
    },
  ]);
}
