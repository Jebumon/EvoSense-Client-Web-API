import type { Context } from 'hono';
import type { D1Like } from '../types';
import { persistRelationalState, snapshotState } from './stateService';

export async function persistStateIfEnabled(c: Context) {
  const db = c.env?.DB as D1Like | undefined;
  if (!db) return;

  await persistRelationalState(db, snapshotState());
}
