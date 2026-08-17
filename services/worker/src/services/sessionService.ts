import type { Context } from 'hono';
import { sessions } from '../repositories/authRepository';
import type { AuthUser } from '@evosensefleet/shared';
import { jsonResponse } from '../utils/response';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createSessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

export function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function cleanupExpiredSessions() {
  for (const [token, session] of Array.from(sessions.entries())) {
    if (isSessionExpired(session.expiresAt)) {
      sessions.delete(token);
    }
  }
}

export function getUser(c: Context): AuthUser | null {
  const auth = c.req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (isSessionExpired(session.expiresAt)) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

export function setSession(token: string, user: AuthUser, expiresAt: string) {
  sessions.set(token, { user, expiresAt });
}

export function clearSession(token: string) {
  sessions.delete(token);
}
