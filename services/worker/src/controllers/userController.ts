import type { Context } from 'hono';
import type { UserRecord } from '../types';
import { jsonResponse } from '../utils/response';
import { getUser } from '../services/sessionService';
import { hasPermission, sanitizePermissions } from '../services/permissionService';
import { getUsers, saveUser, deleteUser, getUserById, getUserByEmail } from '../repositories/userRepository';
import { getCompanyById } from '../repositories/companyRepository';
import { hashPassword } from '../utils/crypto';
import { recordAuditEvent } from '../services/auditService';
import { canAccessCompany, filterUsersFor, inScope } from '../services/companyService';
import { persistStateIfEnabled } from '../services/persistenceService';
import { validateEmail, validatePhone } from '../utils/validators';

export const getUsersController = (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'users.view')) return jsonResponse({ error: 'Forbidden: missing users.view permission' }, 403);

  const requestedCompanyId = c.req.query('companyId');
  return jsonResponse(filterUsersFor(user, requestedCompanyId ?? undefined));
};

export const createUserController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'users.create')) return jsonResponse({ error: 'Forbidden: missing users.create permission' }, 403);

  try {
    const body = await c.req.json<{
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      phone?: string;
      tenantId?: string;
      permissions?: unknown;
    }>();

    if (!body.name?.trim()) return jsonResponse({ error: 'Name is required' }, 400);
    if (!body.email || !validateEmail(body.email)) return jsonResponse({ error: 'Valid email is required' }, 400);
    if (!body.password || body.password.length < 6) return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);
    if (!validatePhone(body.phone)) return jsonResponse({ error: 'Invalid phone number' }, 400);
    if (!['admin', 'manager', 'operator', 'viewer'].includes(body.role || '')) return jsonResponse({ error: 'Invalid role' }, 400);

    if (getUserByEmail(body.email)) return jsonResponse({ error: 'Email already in use' }, 409);

    const targetTenantId = body.tenantId ?? user.tenantId;
    const company = getCompanyById(targetTenantId);
    if (!company) return jsonResponse({ error: 'Target company not found' }, 404);
    if (!canAccessCompany(user, targetTenantId)) return jsonResponse({ error: 'Forbidden for target company' }, 403);

    const newUser: UserRecord = {
      id: `u-${Date.now()}`,
      name: body.name.trim(),
      email: body.email,
      passwordHash: hashPassword(body.password),
      role: body.role as any,
      tenantId: targetTenantId,
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: body.phone || '',
      permissions: sanitizePermissions(body.permissions, body.role as any),
    };

    saveUser(newUser);
    recordAuditEvent(user, 'create', 'user', newUser.id, newUser.tenantId, `${user.name} created user ${newUser.email}`);
    await persistStateIfEnabled(c);

    return jsonResponse({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      tenantId: newUser.tenantId,
      status: newUser.status,
      phone: newUser.phone,
      createdAt: newUser.createdAt,
      permissions: newUser.permissions,
    }, 201);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
};

export const updateUserController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'users.update')) return jsonResponse({ error: 'Forbidden: missing users.update permission' }, 403);

  const id = c.req.param('id');
  if (!id) return jsonResponse({ error: 'User ID is required' }, 400);
  const existing = getUserById(id);
  if (!existing) return jsonResponse({ error: 'User not found' }, 404);
  if (!inScope(user, existing.tenantId)) return jsonResponse({ error: 'Forbidden for target user' }, 403);

  try {
    const body = await c.req.json<Partial<Record<string, unknown>>>();

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return jsonResponse({ error: 'Name cannot be empty' }, 400);
      existing.name = name;
    }
    if (body.role !== undefined) {
      const role = String(body.role);
      if (!['admin', 'manager', 'operator', 'viewer'].includes(role)) return jsonResponse({ error: 'Invalid role' }, 400);
      existing.role = role as any;
      existing.permissions = sanitizePermissions(existing.permissions, existing.role);
    }
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!['active', 'inactive', 'suspended'].includes(status)) return jsonResponse({ error: 'Invalid status' }, 400);
      existing.status = status as any;
    }
    if (body.phone !== undefined) {
      const phone = String(body.phone);
      if (!validatePhone(phone)) return jsonResponse({ error: 'Invalid phone number' }, 400);
      existing.phone = phone;
    }
    if (Array.isArray(body.permissions)) {
      existing.permissions = sanitizePermissions(body.permissions, existing.role);
    }

    saveUser(existing);
    recordAuditEvent(user, 'update', 'user', existing.id, existing.tenantId, `${user.name} updated user ${existing.email}`);
    await persistStateIfEnabled(c);

    return jsonResponse(existing);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
};

export const deleteUserController = async (c: Context) => {
  const user = getUser(c);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!hasPermission(user, 'users.delete')) return jsonResponse({ error: 'Forbidden: missing users.delete permission' }, 403);

  const id = c.req.param('id');
  if (!id) return jsonResponse({ error: 'User ID is required' }, 400);
  const existing = getUserById(id);
  if (!existing) return jsonResponse({ error: 'User not found' }, 404);
  if (!inScope(user, existing.tenantId)) return jsonResponse({ error: 'Forbidden for target user' }, 403);
  if (existing.id === user.id) return jsonResponse({ error: 'Users cannot delete their own account' }, 400);

  deleteUser(id);
  recordAuditEvent(user, 'delete', 'user', existing.id, existing.tenantId, `${user.name} deleted user ${existing.email}`);
  await persistStateIfEnabled(c);

  return jsonResponse({ ok: true });
};
