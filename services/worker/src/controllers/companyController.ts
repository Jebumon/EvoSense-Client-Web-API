import type { Context } from 'hono';
import { jsonResponse } from '../utils/response';
import { getUser } from '../services/sessionService';
import { hasPermission } from '../services/permissionService';
import { canAccessCompany, filterCompaniesFor, filterCompaniesForList } from '../services/companyService';
import { isRelationalPersistenceEnabled } from '../services/stateService';
import { getCompaniesFromDb } from '../services/dbReadService';

export const getCompaniesController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'companies.view')) {
    return jsonResponse({ error: 'Forbidden: missing companies.view permission' }, 403);
  }

  const requestedCompanyId = c.req.query('companyId');
  if (requestedCompanyId && !canAccessCompany(user, requestedCompanyId)) {
    return jsonResponse({ error: 'Forbidden for selected company' }, 403);
  }

  if (isRelationalPersistenceEnabled() && c.env?.DB) {
    const companies = await getCompaniesFromDb(c.env.DB);
    return jsonResponse(filterCompaniesForList(user, requestedCompanyId ?? undefined, companies));
  }

  return jsonResponse(filterCompaniesFor(user, requestedCompanyId ?? undefined));
};
