import type { Context } from 'hono';
import type { D1Like } from '../types';
import { ensureStateTable, snapshotState } from './stateService';

export async function persistStateIfEnabled(c: Context) {
  const db = c.env?.DB as D1Like | undefined;
  if (!db) return;
  await ensureStateTable(db);
  await db.prepare('UPDATE app_state SET payload = ?, updated_at = ? WHERE id = 1').bind(JSON.stringify(snapshotState()), new Date().toISOString()).run();
}
