import type { MiddlewareHandler } from 'hono';
import { getDatabaseAdapter } from '../db';

export const dbMiddleware: MiddlewareHandler = async (c, next) => {
  if (!c.env) {
    (c as any).env = {};
  }
  if (!c.env.DB) {
    (c as any).env.DB = getDatabaseAdapter();
  }
  await next();
};
