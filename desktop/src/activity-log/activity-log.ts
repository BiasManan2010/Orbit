/** Keeps bounded operational metadata in memory; depends on ActivityEvent; does not persist or collect payloads. */
import type { ActivityEvent } from './activity-event.js';

export class ActivityLog {
  private readonly events: ActivityEvent[] = [];
  constructor(private readonly capacity = 1_000, private readonly now = Date.now) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error('Invalid log capacity');
  }

  record(event: Omit<ActivityEvent, 'timestamp'>): void {
    // Explicit projection prevents extra runtime properties from becoming log data.
    this.events.push({ timestamp: new Date(this.now()).toISOString(), severity: event.severity,
      eventType: event.eventType, deviceId: event.deviceId, sessionId: event.sessionId,
      requestId: event.requestId, commandType: event.commandType, outcome: event.outcome });
    if (this.events.length > this.capacity) this.events.shift();
  }

  snapshot(): readonly ActivityEvent[] { return this.events.map(event => ({ ...event })); }
}
