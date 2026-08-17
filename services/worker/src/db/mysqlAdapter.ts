import mysql from 'mysql2/promise';
import type { D1Like } from '../types';

let poolInstance: mysql.Pool | null = null;
let dbInitializationPromise: Promise<void> | null = null;

async function ensureDatabaseExists(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
  useSsl: boolean
) {
  try {
    const tempConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await tempConn.end();
  } catch (err) {
    // If user has restricted permissions to root database, continue to pool connection
  }
}

function getMysqlPool(): mysql.Pool {
  if (poolInstance) return poolInstance;

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'evosensefleet';
  const useSsl = process.env.MYSQL_SSL === 'true';

  dbInitializationPromise = ensureDatabaseExists(host, port, user, password, database, useSsl);

  poolInstance = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return poolInstance;
}

export function createMysqlDbAdapter(): D1Like {
  const pool = getMysqlPool();

  const awaitInit = async () => {
    if (dbInitializationPromise) {
      await dbInitializationPromise;
    }
  };

  return {
    exec: async (sql: string) => {
      await awaitInit();
      let querySql = sql;
      if (sql.includes('CREATE TABLE IF NOT EXISTS app_state')) {
        querySql = `CREATE TABLE IF NOT EXISTS app_state (
          id INT PRIMARY KEY,
          payload LONGTEXT NOT NULL,
          updated_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      }
      await pool.query(querySql);
    },
    prepare: (query: string) => {
      let boundArgs: unknown[] = [];
      let querySql = query;

      if (query.includes('CREATE TABLE IF NOT EXISTS app_state')) {
        querySql = `CREATE TABLE IF NOT EXISTS app_state (
          id INT PRIMARY KEY,
          payload LONGTEXT NOT NULL,
          updated_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      }

      return {
        bind: (...values: unknown[]) => {
          boundArgs = values;
          return {
            first: async <T = unknown>(): Promise<T | null> => {
              await awaitInit();
              try {
                const [rows] = await pool.execute<any[]>(querySql, boundArgs as any[]);
                if (Array.isArray(rows) && rows.length > 0) {
                  return rows[0] as T;
                }
                return null;
              } catch (err) {
                console.error('MySQL query error (first):', err);
                return null;
              }
            },
            run: async (): Promise<unknown> => {
              await awaitInit();
              try {
                let executeSql = querySql;
                if (querySql.includes('INSERT INTO app_state')) {
                  executeSql = `INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = VALUES(updated_at);`;
                }
                const [result] = await pool.execute(executeSql, boundArgs as any[]);
                return result;
              } catch (err) {
                console.error('MySQL query error (run):', err);
                return {};
              }
            },
          };
        },
      };
    },
  };
}
