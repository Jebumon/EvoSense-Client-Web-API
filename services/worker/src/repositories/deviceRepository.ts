import type { Asset, DeviceRecord, Driver } from '../types';

export const devices = new Map<string, DeviceRecord>();
export const drivers = new Map<string, Driver>();
export const assets = new Map<string, Asset>();

export const getDeviceById = (id: string) => devices.get(id);
export const getDevices = () => Array.from(devices.values());
export const saveDevice = (device: DeviceRecord) => devices.set(device.id, device);
export const deleteDevice = (deviceId: string) => devices.delete(deviceId);

export const getDriverById = (id: string) => drivers.get(id);
export const getDrivers = () => Array.from(drivers.values());
export const saveDriver = (driver: Driver) => drivers.set(driver.id, driver);
export const deleteDriver = (driverId: string) => drivers.delete(driverId);

export const getAssetById = (id: string) => assets.get(id);
export const getAssets = () => Array.from(assets.values());
export const saveAsset = (asset: Asset) => assets.set(asset.id, asset);
export const deleteAsset = (assetId: string) => assets.delete(assetId);
