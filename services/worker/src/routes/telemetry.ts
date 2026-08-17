import { Hono } from 'hono';
import { postTelemetryController } from '../controllers/telemetryController';
import { postDeviceTelemetry } from '../services/telemetryService';
import { requireRole } from '../middleware/auth';

const telemetryApp = new Hono();

telemetryApp.post('/', requireRole(['admin', 'manager', 'operator']), postTelemetryController);
telemetryApp.post('/device', postDeviceTelemetry);

export default telemetryApp;
