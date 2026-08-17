import { Hono } from 'hono';
import { getCompaniesController } from '../controllers/companyController';
import { requireRole } from '../middleware/auth';

const companiesApp = new Hono();

companiesApp.get('/', requireRole(['admin', 'manager', 'operator', 'viewer']), getCompaniesController);

export default companiesApp;
