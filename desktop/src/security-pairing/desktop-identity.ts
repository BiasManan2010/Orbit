/** Generates or loads a persistent desktop TLS identity; depends on selfsigned and private storage; never rotates a pin silently. */
import { createPrivateKey, randomUUID, X509Certificate } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generate } from 'selfsigned';
import { z } from 'zod';
import { idSchema } from '../protocol/pairing.js';
import { atomicWrite } from './atomic-file.js';

const CERTIFICATE_LIFETIME_MS = 365 * 24 * 60 * 60 * 1_000;
const identitySchema = z.strictObject({ desktopServiceId: idSchema,
  certificate: z.string().max(8_192), privateKey: z.string().max(8_192) });
export type DesktopIdentity = z.infer<typeof identitySchema>;
export const identityHostname = (id: string) => `orbit-${id}.local`;

export function validateIdentity(identity: DesktopIdentity): void {
  const cert = new X509Certificate(identity.certificate);
  if (!cert.checkPrivateKey(createPrivateKey(identity.privateKey)) || !cert.verify(cert.publicKey)
    || !cert.checkHost(identityHostname(identity.desktopServiceId))
    || Date.parse(cert.validFrom) > Date.now() || Date.parse(cert.validTo) <= Date.now()) {
    throw new Error('Desktop TLS identity is invalid or expired; explicit recovery is required');
  }
}

export async function loadOrCreateIdentity(directory: string): Promise<DesktopIdentity> {
  const path = join(directory, 'identity.json');
  if (existsSync(path)) {
    const identity = identitySchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    validateIdentity(identity);
    return identity;
  }
  const desktopServiceId = randomUUID();
  const hostname = identityHostname(desktopServiceId);
  const generated = await generate([{ name: 'commonName', value: hostname }], {
    keyType: 'ec', curve: 'P-256', algorithm: 'sha256',
    notBeforeDate: new Date(Date.now() - 60_000), notAfterDate: new Date(Date.now() + CERTIFICATE_LIFETIME_MS),
    extensions: [ { name: 'basicConstraints', cA: false, critical: true },
      { name: 'keyUsage', digitalSignature: true, critical: true },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames: [{ type: 2, value: hostname }] } ],
  });
  const identity = { desktopServiceId, certificate: new X509Certificate(generated.cert).toString(), privateKey: generated.private };
  validateIdentity(identity);
  atomicWrite(path, JSON.stringify(identity));
  return identity;
}

export function certificateFingerprint(pem: string): string {
  return new X509Certificate(pem).fingerprint256.replaceAll(':', '').toLowerCase();
}
