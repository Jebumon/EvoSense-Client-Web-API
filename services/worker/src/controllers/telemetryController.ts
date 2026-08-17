import type { Context } from 'hono';
import { jsonResponse } from '../utils/response';
import { postTelemetry } from '../services/telemetryService';

export const postTelemetryController = async (c: Context) => {
  try {
    return await postTelemetry(c);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
};
