import type { DeviceTelemetryEvent, FleetAlert } from '@evosensefleet/shared';
import { getDeviceById } from '../repositories/deviceRepository';
import { addAlert } from '../repositories/eventRepository';

export function createAlert(deviceId: string, event: DeviceTelemetryEvent): FleetAlert | null {
  const device = getDeviceById(deviceId);
  if (!device || (event.temperature < 85 && event.battery > 15)) return null;

  const alert: FleetAlert = {
    id: `alert-${Date.now()}`,
    deviceId,
    severity: event.temperature >= 90 || event.battery <= 10 ? 'high' : 'medium',
    title: event.temperature >= 85 ? 'Overheat risk' : 'Battery critical',
    message: event.temperature >= 85
      ? `${device.name} temperature exceeded safe limits.`
      : `${device.name} battery is running low.`,
    createdAt: new Date().toISOString(),
  };
  addAlert(alert);
  return alert;
}
