import type { Context } from 'hono';

export const logger = async (c: Context, next: () => Promise<unknown>) => {
  const start = Date.now();
  const result = await next();
  const ms = Date.now() - start;
  console.log(`[${c.req.method}] ${c.req.url} - ${ms}ms`);
  return result;
};
