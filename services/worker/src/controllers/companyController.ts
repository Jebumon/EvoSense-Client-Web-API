import type { Context } from 'hono';
import type { Company } from '@evosensefleet/shared';
import { jsonResponse } from '../utils/response';
import { getUser } from '../services/sessionService';
import { hasPermission } from '../services/permissionService';
import { canAccessCompany, filterCompaniesFor, filterCompaniesForList } from '../services/companyService';
import { isRelationalPersistenceEnabled } from '../services/stateService';
import { getCompaniesFromDb } from '../services/dbReadService';
import { getCompanyById, saveCompany } from '../repositories/companyRepository';
import { persistStateIfEnabled } from '../services/persistenceService';

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

export const createCompanyController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'companies.create')) {
    return jsonResponse({ error: 'Forbidden: missing companies.create permission' }, 403);
  }

  try {
    const body = await c.req.json<{
      name?: string;
      parentCompanyId?: string | null;
      status?: string;
    }>();

    if (!body.name?.trim()) return jsonResponse({ error: 'Name is required' }, 400);

    const parentCompanyId = body.parentCompanyId ?? null;
    if (parentCompanyId) {
      const parentCompany = getCompanyById(parentCompanyId);
      if (!parentCompany) return jsonResponse({ error: 'Parent company not found' }, 404);
      if (!canAccessCompany(user, parentCompanyId)) return jsonResponse({ error: 'Forbidden for parent company' }, 403);
    }

    const validStatuses = ['active', 'inactive'] as const;
    const status = validStatuses.includes(body.status as any) ? (body.status as any) : 'active';

    const company: Company = {
      id: `company-${Date.now()}`,
      name: body.name.trim(),
      parentCompanyId,
      status,
      createdAt: new Date().toISOString(),
    };

    saveCompany(company);
    await persistStateIfEnabled(c);

    return jsonResponse(company, 201);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
};
