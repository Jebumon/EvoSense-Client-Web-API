import type { DeviceJourneyEvent, FleetAlert, FleetEvent } from '@evosensefleet/shared';

export const deviceEventHistory = new Map<string, DeviceJourneyEvent[]>();
export const alerts: FleetAlert[] = [];
export const fleetEvents: FleetEvent[] = [];

export const getDeviceEventHistory = (deviceId: string) => deviceEventHistory.get(deviceId) ?? [];
export const saveDeviceEventHistory = (deviceId: string, events: DeviceJourneyEvent[]) => deviceEventHistory.set(deviceId, events);
export const getAlerts = () => alerts;
export const addAlert = (alert: FleetAlert) => alerts.unshift(alert);
export const getEvents = () => fleetEvents;
export const addEvent = (event: FleetEvent) => fleetEvents.unshift(event);
