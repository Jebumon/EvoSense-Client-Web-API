import { Hono } from 'hono';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import deviceRoutes from './routes/devices';
import telemetryRoutes from './routes/telemetry';
import companyRoutes from './routes/companies';
import dataRoutes from './routes/data';
import { createCors } from './middleware/cors';
import { logger } from './middleware/logger';
import { dbMiddleware } from './middleware/dbMiddleware';
import { hydrateStateIfNeeded } from './services/stateService';

const app = new Hono();

app.use('*', logger);
app.use('*', createCors());
app.use('*', dbMiddleware);
app.use('/api/*', async (c, next) => {
  await hydrateStateIfNeeded(c);
  await next();
});

app.route('/api/auth', authRoutes);
app.route('/api/companies', companyRoutes);
app.route('/api/users', userRoutes);
app.route('/api/devices', deviceRoutes);
app.route('/api/telemetry', telemetryRoutes);
app.route('/api', dataRoutes);

export default app;
