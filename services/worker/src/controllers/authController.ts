import type { Context } from 'hono';
import { jsonResponse } from '../utils/response';
import { login, getUserFromContext, logout } from '../services/authService';

export const loginController = async (c: Context) => {
  try {
    const body = await c.req.json<{ email?: string; password?: string }>();
    if (!body.email || !body.password) return jsonResponse({ error: 'Email and password are required' }, 400);
    return await login(c, body.email, body.password);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
};

export const meController = async (c: Context) => {
  return await getUserFromContext(c);
};

export const logoutController = async (c: Context) => {
  return await logout(c);
};
