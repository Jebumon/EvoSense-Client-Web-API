import type { Context } from 'hono';
import type { AuthUser } from '@evosensefleet/shared';
import { getUserByEmail } from '../repositories/userRepository';
import { sessions } from '../repositories/authRepository';
import { jsonResponse } from '../utils/response';
import { verifyPassword } from '../utils/crypto';
import { persistStateIfEnabled } from './persistenceService';
import { createSessionExpiresAt, getUser } from './sessionService';
import { effectiveSessionPermissions, sanitizePermissions } from './permissionService';

export const login = async (c: Context, email: string, password: string) => {
  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return jsonResponse({ error: 'Invalid email or password' }, 401);
  }
  if (user.status !== 'active') {
    return jsonResponse({ error: 'User account is not active' }, 403);
  }

  const token = `token-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    status: user.status,
    createdAt: user.createdAt,
    permissions: effectiveSessionPermissions(user),
    explicitPermissions: sanitizePermissions(user.permissions, user.role),
  };

  const expiresAt = createSessionExpiresAt();
  sessions.set(token, { user: authUser, expiresAt });
  await persistStateIfEnabled(c);

  return jsonResponse({ token, user: authUser, expiresAt });
};

export const getUserFromContext = async (c: Context) => {
  const user = getUser(c as any);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  return jsonResponse(user);
};

export const logout = async (c: Context) => {
  const auth = c.req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token) {
    sessions.delete(token);
    await persistStateIfEnabled(c);
  }
  return jsonResponse({ ok: true });
};
