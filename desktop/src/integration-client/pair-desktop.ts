/** Redeems an explicitly scanned QR once; depends on pinned HTTPS and discovery hints; does not retry enrollment or trust mDNS alone. */
import { pairedResponseSchema, pairingPayloadSchema } from '../protocol/pairing.js';
import type { DesktopHint } from '../transport/discovery/lan-discovery.js';
import { postCredential } from './pinned-https.js';
import type { PairedDesktop } from './paired-desktop.js';

export async function pairDesktop(qr: unknown, hint: DesktopHint): Promise<PairedDesktop> {
  const payload = pairingPayloadSchema.parse(qr);
  if (payload.expiresAt <= Date.now() || payload.desktopServiceId !== hint.desktopServiceId
    || payload.endpoint !== hint.endpoint) throw new Error('Pairing invitation expired or discovery did not match');
  const trust = { ...payload, certificate: hint.certificate };
  const result = pairedResponseSchema.safeParse(await postCredential(trust, '/v1/pair', payload.pairingToken));
  if (!result.success || result.data.desktopServiceId !== payload.desktopServiceId) throw new Error('Invalid pairing response');
  return { desktopServiceId: payload.desktopServiceId, deviceId: result.data.deviceId, endpoint: payload.endpoint,
    certificate: hint.certificate, certificateFingerprint: payload.certificateFingerprint, credential: result.data.credential };
}
