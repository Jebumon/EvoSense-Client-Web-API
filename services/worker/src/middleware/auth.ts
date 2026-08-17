import type { Context } from 'hono';
import { getUser } from '../services/sessionService';
import type { UserRole } from '@evosensefleet/shared';

export const requireRole = (allowedRoles: UserRole[]) => {
  return async (c: Context, next: () => Promise<void>) => {
    const user = getUser(c as any);
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    return next();
  };
};
