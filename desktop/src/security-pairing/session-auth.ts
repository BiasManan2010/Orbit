/** Issues short-lived sessions from paired credentials; depends on a credential store; does not perform QR pairing. */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { ActivityLog } from '../activity-log/activity-log.js';

export interface PairedCredentialStore {
  verify(credential: string): string | undefined;
  isActive(deviceId: string): boolean;
}

export interface Session {
  readonly deviceId: string;
  readonly sessionId: string;
  readonly expiresAt: number;
}

export const SESSION_TTL_MS = 5 * 60 * 1_000;
const MAX_SESSIONS = 128;
const MAX_SESSIONS_PER_DEVICE = 8;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export function credentialHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class SessionAuth {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly credentials: PairedCredentialStore, private readonly log: ActivityLog,
    private readonly ttlMs = SESSION_TTL_MS, private readonly now = Date.now) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1) throw new Error('Invalid session lifetime');
  }

  issue(credential: string): { sessionToken: string; session: Session } | undefined {
    if (!TOKEN_PATTERN.test(credential)) return undefined;
    const deviceId = this.credentials.verify(credential);
    if (!deviceId || !this.credentials.isActive(deviceId)) return undefined;
    this.prune();
    const deviceSessions = [...this.sessions.entries()].filter(([, session]) => session.deviceId === deviceId);
    if (deviceSessions.length >= MAX_SESSIONS_PER_DEVICE) this.sessions.delete(deviceSessions[0]![0]);
    if (this.sessions.size >= MAX_SESSIONS) return undefined;
    const sessionToken = randomBytes(32).toString('base64url');
    const session = Object.freeze({ deviceId, sessionId: randomUUID(), expiresAt: this.now() + this.ttlMs });
    this.sessions.set(credentialHash(sessionToken), session);
    this.log.record({ severity: 'info', eventType: 'session.issued', deviceId,
      sessionId: session.sessionId, outcome: 'success' });
    return { sessionToken, session };
  }

  authenticate(token: string): Session | undefined {
    if (!TOKEN_PATTERN.test(token)) return undefined;
    const key = credentialHash(token);
    const session = this.sessions.get(key);
    if (!session) return undefined;
    if (session.expiresAt <= this.now() || !this.credentials.isActive(session.deviceId)) {
      this.sessions.delete(key);
      return undefined;
    }
    return session;
  }

  private prune(): void {
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= this.now() || !this.credentials.isActive(session.deviceId)) this.sessions.delete(key);
    }
  }
}
