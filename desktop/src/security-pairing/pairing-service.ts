/** Opens explicit one-use pairing windows; depends on a durable store and identity; does not trust discovery or authenticate commands. */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { PairingPayload } from '../protocol/pairing.js';
import type { ActivityLog } from '../activity-log/activity-log.js';
import type { FilePairedCredentialStore } from './paired-credential-store.js';
import { credentialHash, TOKEN_PATTERN } from './session-auth.js';

export const PAIRING_TTL_MS = 120_000;
type PublicIdentity = Pick<PairingPayload, 'desktopServiceId' | 'displayName' | 'endpoint' | 'certificateFingerprint'>;

export class PairingService {
  private invitation?: { hash: Buffer; expiresAt: number };
  constructor(private readonly identity: PublicIdentity, private readonly store: FilePairedCredentialStore,
    private readonly log: ActivityLog, private readonly now = Date.now) {}

  open(): PairingPayload {
    const pairingToken = randomBytes(32).toString('base64url');
    const expiresAt = this.now() + PAIRING_TTL_MS;
    this.invitation = { hash: Buffer.from(credentialHash(pairingToken), 'hex'), expiresAt };
    this.log.record({ severity: 'info', eventType: 'pairing.opened', outcome: 'success' });
    return { version: 1, desktopServiceId: this.identity.desktopServiceId, displayName: this.identity.displayName,
      endpoint: this.identity.endpoint, certificateFingerprint: this.identity.certificateFingerprint, pairingToken, expiresAt };
  }

  close(): void { this.invitation = undefined; }

  redeem(token: string) {
    const invitation = this.invitation;
    if (!invitation || invitation.expiresAt <= this.now() || !TOKEN_PATTERN.test(token)
      || !timingSafeEqual(invitation.hash, Buffer.from(credentialHash(token), 'hex'))) {
      this.log.record({ severity: 'warn', eventType: 'pairing.rejected', outcome: 'rejected' });
      return undefined;
    }
    // Consume synchronously before disk I/O; concurrent redemption and failed writes cannot reuse the QR.
    this.invitation = undefined;
    const device = this.store.enroll();
    this.log.record({ severity: 'info', eventType: 'pairing.completed', deviceId: device.deviceId, outcome: 'success' });
    return { version: 1, desktopServiceId: this.identity.desktopServiceId, ...device };
  }
}
