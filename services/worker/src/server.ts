import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './index';
import { getDatabaseAdapter } from './db';
import { hydrateStateIfNeeded } from './services/stateService';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  console.log('---------------------------------------------------------');
  console.log('🚀 EvoSenseFleet Telematics Web API Backend starting...');
  console.log(`📌 Platform: Node.js ${process.version} (OCI Ready)`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('---------------------------------------------------------');

  // Perform initial database hydration on boot
  const mockContext: any = {
    env: {
      DB: getDatabaseAdapter(),
    },
  };
  try {
    await hydrateStateIfNeeded(mockContext);
    console.log('✅ Initial database state hydrated successfully');
  } catch (err) {
    console.warn('⚠️ Warning: Initial database hydration notice:', err);
  }

  const server = serve(
    {
      fetch: app.fetch,
      port: PORT,
      hostname: HOST,
    },
    (info) => {
      console.log(`🟢 EvoSenseFleet Web API is live at http://${info.address}:${info.port}`);
      console.log(`📡 Health / Root API: http://${info.address}:${info.port}/api/overview`);
      console.log('---------------------------------------------------------');
    }
  );

  const shutdown = () => {
    console.log('\n🛑 Shutting down EvoSenseFleet Web API server gracefully...');
    server.close(() => {
      console.log('👋 Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('❌ Boot error:', err);
  process.exit(1);
});
