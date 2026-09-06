/** Makes bounded HTTPS requests using QR-established trust; depends on Node TLS/crypto; never disables verification or follows redirects. */
import { request } from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { certificateFingerprint, identityHostname } from '../security-pairing/desktop-identity.js';
import { endpointSchema } from '../protocol/pairing.js';

export interface PinnedTrust {
  desktopServiceId: string;
  certificate: string;
  certificateFingerprint: string;
  endpoint: string;
}

export function pinnedOptions(trust: PinnedTrust) {
  endpointSchema.parse(trust.endpoint);
  const cert = new X509Certificate(trust.certificate);
  const servername = identityHostname(trust.desktopServiceId);
  if (certificateFingerprint(trust.certificate) !== trust.certificateFingerprint || !cert.verify(cert.publicKey)
    || !cert.checkHost(servername) || Date.parse(cert.validFrom) > Date.now() || Date.parse(cert.validTo) <= Date.now()) {
    throw new Error('Pinned desktop certificate is invalid');
  }
  return { ca: trust.certificate, rejectUnauthorized: true, minVersion: 'TLSv1.2' as const, servername,
    checkServerIdentity: (_hostname: string, peer: Parameters<typeof checkServerIdentity>[1]) => {
      const identityError = checkServerIdentity(servername, peer);
      if (identityError) return identityError;
      return new X509Certificate(peer.raw).fingerprint256.replaceAll(':', '').toLowerCase() === trust.certificateFingerprint
        ? undefined : new Error('Certificate pin mismatch');
    } };
}

export class AuthenticationRejected extends Error {
  constructor() { super('Desktop rejected authentication; explicit re-pairing may be required'); }
}

export function postCredential(trust: PinnedTrust, path: '/v1/pair' | '/v1/session', token: string,
  signal?: AbortSignal): Promise<unknown> {
  const tls = pinnedOptions(trust);
  const url = new URL(trust.endpoint);
  url.protocol = 'https:';
  url.pathname = path;
  return new Promise((resolve, reject) => {
    const req = request(url, { ...tls, signal, method: 'POST', agent: false,
      headers: { Authorization: `Bearer ${token}`, 'Content-Length': '0' } }, response => {
      let body = '';
      let bytes = 0;
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 16_384) { response.destroy(); reject(new Error('Desktop response exceeded limit')); }
        else body += chunk.toString('utf8');
      });
      response.on('error', () => reject(new Error('Desktop response interrupted')));
      response.on('end', () => {
        if (response.statusCode === 401) return reject(new AuthenticationRejected());
        if (response.statusCode !== 200) return reject(new Error('Desktop request rejected'));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid desktop response')); }
      });
    });
    req.setTimeout(10_000, () => req.destroy());
    req.on('error', () => reject(new Error('Encrypted desktop request failed')));
    req.end();
  });
}
