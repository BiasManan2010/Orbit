/** Persists credentials authorized by pairing; depends on private atomic storage; does not decide whether enrollment is allowed. */
import { existsSync, readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { atomicWrite } from './atomic-file.js';
import { IDENTIFIER_PATTERN, isRecord } from '../protocol/validation.js';
import { credentialHash, type PairedCredentialStore } from './session-auth.js';

export class FilePairedCredentialStore implements PairedCredentialStore {
  private readonly devices = new Map<string, string>();

  constructor(private readonly path?: string) {
    // No provisioning file means no authorized devices, never an authentication bypass.
    if (!path || !existsSync(path)) return;
    const data: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(data) || data.length > 128) throw new Error('Invalid paired credential store');
    const ids = new Set<string>();
    for (const entry of data) {
      if (!isRecord(entry) || Object.keys(entry).length !== 2
        || typeof entry.deviceId !== 'string' || !IDENTIFIER_PATTERN.test(entry.deviceId)
        || typeof entry.credentialHash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.credentialHash)
        || this.devices.has(entry.credentialHash) || ids.has(entry.deviceId)) {
        throw new Error('Invalid paired credential store');
      }
      ids.add(entry.deviceId);
      this.devices.set(entry.credentialHash, entry.deviceId);
    }
  }

  verify(credential: string): string | undefined { return this.devices.get(credentialHash(credential)); }
  isActive(deviceId: string): boolean { return [...this.devices.values()].includes(deviceId); }

  enroll(): { deviceId: string; credential: string } {
    if (!this.path || this.devices.size >= 128) throw new Error('Pairing store unavailable');
    const credential = randomBytes(32).toString('base64url');
    const deviceId = randomUUID();
    const hash = credentialHash(credential);
    const entries = [...this.devices].map(([credentialHash, deviceId]) => ({ credentialHash, deviceId }));
    // Publish in memory only after the durable replacement succeeds.
    atomicWrite(this.path, JSON.stringify([...entries, { deviceId, credentialHash: hash }]));
    this.devices.set(hash, deviceId);
    return { deviceId, credential };
  }
}
