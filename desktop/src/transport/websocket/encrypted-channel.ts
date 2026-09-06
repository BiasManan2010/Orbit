/** Loads the encrypted channel identity; depends on Node TLS/crypto; does not generate certificates or pair devices. */
import { createPrivateKey, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { ServerOptions } from 'node:https';

export interface EncryptedChannel {
  tls: ServerOptions;
  certificateFingerprint: string;
}

export function loadEncryptedChannel(certificatePath: string, privateKeyPath: string): EncryptedChannel {
  const cert = readFileSync(certificatePath);
  const key = readFileSync(privateKeyPath);
  const certificate = new X509Certificate(cert);
  if (Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) <= Date.now()) {
    throw new Error('TLS certificate is not currently valid');
  }
  if (!certificate.checkPrivateKey(createPrivateKey(key))) throw new Error('TLS identity does not match');
  return { tls: { cert, key, minVersion: 'TLSv1.2' },
    certificateFingerprint: certificate.fingerprint256.replaceAll(':', '').toLowerCase() };
}
