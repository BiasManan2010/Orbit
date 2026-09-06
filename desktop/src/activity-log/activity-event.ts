/** Defines operational metadata; depends on no modules; excludes payloads, credentials, and free-form errors. */
export interface ActivityEvent {
  timestamp: string;
  severity: 'info' | 'warn' | 'error';
  eventType: 'session.issued' | 'session.refreshed' | 'connection.opened' | 'connection.closed'
    | 'connection.error' | 'connection.timeout' | 'authentication.rejected'
    | 'message.rejected' | 'command.completed' | 'service.started' | 'service.stopped' | 'service.error';
  deviceId?: string;
  sessionId?: string;
  requestId?: string;
  commandType?: string;
  outcome: 'success' | 'rejected' | 'failed';
}
