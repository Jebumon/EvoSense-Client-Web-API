import { Hono } from 'hono';
import { requireRole } from '../middleware/auth';
import { getAlertsController, getAssetsController, createAssetController, getDriversController, getEventsController, getOverviewController } from '../controllers/readController';

const dataApp = new Hono();
const permittedRoles = ['admin', 'manager', 'operator', 'viewer'] as const;

dataApp.get('/overview', requireRole([...permittedRoles]), getOverviewController);
dataApp.get('/drivers', requireRole([...permittedRoles]), getDriversController);
dataApp.get('/assets', requireRole([...permittedRoles]), getAssetsController);
dataApp.post('/assets', requireRole([...permittedRoles]), createAssetController);
dataApp.get('/alerts', requireRole([...permittedRoles]), getAlertsController);
dataApp.get('/events', requireRole([...permittedRoles]), getEventsController);

export default dataApp;
