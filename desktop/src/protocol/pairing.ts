/** Reserves the approved QR contract; depends on protocol version; does not enroll devices or generate QR codes. */
import type { PROTOCOL_VERSION } from './messages.js';

export interface PairingPayload {
  version: typeof PROTOCOL_VERSION;
  desktopServiceId: string;
  displayName: string;
  endpoint: string;
  /** SHA-256 of the DER certificate, lowercase hex; verify before sending any credential. */
  certificateFingerprint: string;
  pairingToken: string;
  /** Unix time in milliseconds. */
  expiresAt: number;
}
