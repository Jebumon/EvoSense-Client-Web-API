import type { D1Like } from '../types';
import { createMysqlDbAdapter } from './mysqlAdapter';

let cachedAdapter: D1Like | null = null;

export function getDatabaseAdapter(): D1Like {
  if (cachedAdapter) return cachedAdapter;

  if (!process.env.MYSQL_HOST) {
    throw new Error('MYSQL_HOST is required when running backend in MySQL-only mode');
  }

  console.log(`🗄️ Connecting to OCI MySQL HeatWave Database (${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306})...`);
  cachedAdapter = createMysqlDbAdapter();

  return cachedAdapter;
}
