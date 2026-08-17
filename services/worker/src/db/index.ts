import type { D1Like } from '../types';
import { createSqliteDbAdapter } from './sqliteAdapter';
import { createMysqlDbAdapter } from './mysqlAdapter';

let cachedAdapter: D1Like | null = null;

export function getDatabaseAdapter(): D1Like {
  if (cachedAdapter) return cachedAdapter;

  const useMysql = Boolean(process.env.MYSQL_HOST || process.env.USE_MYSQL === 'true');

  if (useMysql) {
    console.log(`🗄️ Connecting to OCI MySQL HeatWave Database (${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306})...`);
    cachedAdapter = createMysqlDbAdapter();
  } else {
    console.log('🗄️ Using local SQLite / JSON persistence engine...');
    cachedAdapter = createSqliteDbAdapter();
  }

  return cachedAdapter;
}
