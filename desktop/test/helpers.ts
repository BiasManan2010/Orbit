/** Supplies isolated test identities and handlers; depends on Node/OpenSSL and core modules; never provisions production devices. */
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ActivityLog } from '../src/activity-log/activity-log.js';
import { CommandRegistry } from '../src/command-router/command-registry.js';
import { CommandRouter } from '../src/command-router/command-router.js';
import type { BiometricConfirmation } from '../src/security-pairing/biometric-confirmation.js';
import { SessionAuth } from '../src/security-pairing/session-auth.js';
import { loadEncryptedChannel } from '../src/transport/websocket/encrypted-channel.js';

export function core(options: { ttlMs?: number; now?: () => number; biometric?: BiometricConfirmation } = {}) {
  const deviceId = randomUUID();
  const credential = randomBytes(32).toString('base64url');
  const log = new ActivityLog();
  let active = true;
  const pairedDevices = new Map<string, string>([[credential, deviceId]]);
  const auth = new SessionAuth({ verify: token => pairedDevices.get(token),
    isActive: id => active && [...pairedDevices.values()].includes(id) }, log, options.ttlMs, options.now);
  const registry = new CommandRegistry();
  const router = new CommandRouter(registry, auth, log, options.biometric);
  const addDevice = () => {
    const other = { deviceId: randomUUID(), credential: randomBytes(32).toString('base64url') };
    pairedDevices.set(other.credential, other.deviceId);
    return other;
  };
  return { deviceId, credential, log, auth, registry, router, addDevice, revoke: () => { active = false; } };
}

export function testIdentity() {
  const directory = mkdtempSync(join(tmpdir(), 'orbit-transport-test-'));
  const certificatePath = join(directory, 'certificate.pem');
  const privateKeyPath = join(directory, 'private-key.pem');
  const gitOpenSsl = 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';
  const openssl = process.env.ORBIT_TEST_OPENSSL ?? (process.platform === 'win32' && existsSync(gitOpenSsl) ? gitOpenSsl : 'openssl');
  try {
    execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
      '-keyout', privateKeyPath, '-out', certificatePath], { stdio: 'pipe', windowsHide: true });
    return { directory, certificatePath, privateKeyPath,
      channel: loadEncryptedChannel(certificatePath, privateKeyPath),
      cleanup: () => rmSync(directory, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
