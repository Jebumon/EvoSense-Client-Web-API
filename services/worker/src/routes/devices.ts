import { Hono } from 'hono';
import { getDevicesController, getDeviceController, createDeviceController, updateDeviceController, deleteDeviceController, getDeviceEventsController } from '../controllers/deviceController';
import { requireRole } from '../middleware/auth';

const devicesApp = new Hono();

devicesApp.get('/', requireRole(['admin', 'manager', 'operator', 'viewer']), getDevicesController);
devicesApp.get('/:id', requireRole(['admin', 'manager', 'operator', 'viewer']), getDeviceController);
devicesApp.get('/:id/events', requireRole(['admin', 'manager', 'operator', 'viewer']), getDeviceEventsController);
devicesApp.post('/', requireRole(['admin', 'manager', 'operator', 'viewer']), createDeviceController);
devicesApp.put('/:id', requireRole(['admin', 'manager', 'operator', 'viewer']), updateDeviceController);
devicesApp.delete('/:id', requireRole(['admin', 'manager', 'operator', 'viewer']), deleteDeviceController);

export default devicesApp;
