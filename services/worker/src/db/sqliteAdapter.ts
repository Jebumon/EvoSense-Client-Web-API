import fs from 'fs';
import path from 'path';
import type { D1Like } from '../types';

let dbInstance: any = null;
let fallbackStore: Record<string, string> = {};

function getDbInstance(dbFilePath?: string) {
  if (dbInstance) return dbInstance;

  const targetPath = dbFilePath || process.env.DATABASE_PATH || './data/evosense.db';
  const resolvedPath = path.resolve(targetPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Try built-in node:sqlite (Node 22.5+)
  try {
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = {
      type: 'node-sqlite',
      db: new DatabaseSync(resolvedPath),
    };
    return dbInstance;
  } catch {
    // node:sqlite not available
  }

  // 2. Try better-sqlite3 if installed
  try {
    const Database = require('better-sqlite3');
    dbInstance = {
      type: 'better-sqlite3',
      db: new Database(resolvedPath),
    };
    return dbInstance;
  } catch {
    // better-sqlite3 not available
  }

  // 3. Fallback: Pure JSON file persistence (zero-dependency guaranteed execution)
  const jsonPath = path.resolve(dir, 'app_state.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      fallbackStore = JSON.parse(content);
    } catch {
      fallbackStore = {};
    }
  }

  dbInstance = {
    type: 'fallback-json',
    path: jsonPath,
  };

  return dbInstance;
}

export function createSqliteDbAdapter(dbPath?: string): D1Like {
  const driver = getDbInstance(dbPath);

  return {
    exec: async (sql: string) => {
      if (driver.type === 'node-sqlite' || driver.type === 'better-sqlite3') {
        driver.db.exec(sql);
      }
    },
    prepare: (query: string) => {
      let boundArgs: unknown[] = [];

      return {
        bind: (...values: unknown[]) => {
          boundArgs = values;
          return {
            first: async <T = unknown>(): Promise<T | null> => {
              if (driver.type === 'node-sqlite' || driver.type === 'better-sqlite3') {
                try {
                  const stmt = driver.db.prepare(query);
                  const row = stmt.get(...boundArgs);
                  return (row as T) ?? null;
                } catch {
                  return null;
                }
              }

              // Fallback driver query logic
              if (query.includes('SELECT payload FROM app_state')) {
                const payload = fallbackStore['payload'];
                if (payload) {
                  return { payload } as unknown as T;
                }
              }
              return null;
            },
            run: async (): Promise<unknown> => {
              if (driver.type === 'node-sqlite' || driver.type === 'better-sqlite3') {
                try {
                  const stmt = driver.db.prepare(query);
                  return stmt.run(...boundArgs);
                } catch (err) {
                  return {};
                }
              }

              // Fallback JSON driver persistence
              if (query.includes('UPDATE app_state') || query.includes('INSERT INTO app_state')) {
                const payload = boundArgs[0] as string;
                if (payload) {
                  fallbackStore['payload'] = payload;
                  fallbackStore['updated_at'] = (boundArgs[1] as string) || new Date().toISOString();
                  try {
                    fs.writeFileSync(driver.path, JSON.stringify(fallbackStore, null, 2), 'utf-8');
                  } catch {
                    // ignore write error
                  }
                }
              }
              return { changes: 1 };
            },
          };
        },
      };
    },
  };
}
