import type { AuthUser, AuditAction, AuditEntity, FleetEvent } from '@evosensefleet/shared';
import { fleetEvents } from '../repositories/eventRepository';

export function recordAuditEvent(actor: AuthUser, action: AuditAction, entity: AuditEntity, entityId: string, tenantId: string, summary: string) {
  const event: FleetEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    entity,
    entityId,
    tenantId,
    createdAt: new Date().toISOString(),
    actor: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    },
    summary,
  };

  fleetEvents.unshift(event);
  if (fleetEvents.length > 500) {
    fleetEvents.length = 500;
  }

  return event;
}
