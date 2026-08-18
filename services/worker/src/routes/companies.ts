import { Hono } from 'hono';
import { getCompaniesController, createCompanyController } from '../controllers/companyController';
import { requireRole } from '../middleware/auth';

const companiesApp = new Hono();

companiesApp.get('/', requireRole(['admin', 'manager', 'operator', 'viewer']), getCompaniesController);
companiesApp.post('/', requireRole(['admin', 'manager', 'operator', 'viewer']), createCompanyController);

export default companiesApp;
