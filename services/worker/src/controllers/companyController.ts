import type { Context } from 'hono';
import { jsonResponse } from '../utils/response';
import { getUser } from '../services/sessionService';
import { hasPermission } from '../services/permissionService';
import { canAccessCompany, filterCompaniesFor } from '../services/companyService';

export const getCompaniesController = (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'companies.view')) {
    return jsonResponse({ error: 'Forbidden: missing companies.view permission' }, 403);
  }

  const requestedCompanyId = c.req.query('companyId');
  if (requestedCompanyId && !canAccessCompany(user, requestedCompanyId)) {
    return jsonResponse({ error: 'Forbidden for selected company' }, 403);
  }

  return jsonResponse(filterCompaniesFor(user, requestedCompanyId ?? undefined));
};
