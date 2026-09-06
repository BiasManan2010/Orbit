/** Carries verified dispatch identity; depends on session types; never carries the credential or session token. */
import type { Session } from '../security-pairing/session-auth.js';

export interface CommandContext {
  session: Session;
  requestId: string;
}
