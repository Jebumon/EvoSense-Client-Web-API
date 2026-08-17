import { cors } from 'hono/cors';

export const createCors = () => cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];

    if (allowed.includes(origin) || origin?.endsWith('.pages.dev')) {
      return origin;
    }

    return origin;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
