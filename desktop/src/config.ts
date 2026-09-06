/** Reads explicit local service settings; depends on Node networking; does not discover peers or provision TLS. */
import { isIPv4 } from 'node:net';

export const DEFAULT_PORT = 8765;
export const MAX_MESSAGE_BYTES = 64 * 1_024;
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const MAX_BUFFERED_BYTES = 256 * 1_024;
export const MAX_CONNECTIONS = 32;

export function isLocalAddress(address: string): boolean {
  const normalized = address.replace(/^::ffff:/, '');
  if (normalized === '::1') return true;
  if (!isIPv4(normalized)) return false;
  const [first, second] = normalized.split('.').map(Number);
  return first === 127 || first === 10 || (first === 192 && second === 168)
    || (first === 172 && second! >= 16 && second! <= 31)
    || (first === 169 && second === 254);
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const host = env.ORBIT_HOST ?? '127.0.0.1';
  const port = Number(env.ORBIT_PORT ?? DEFAULT_PORT);
  if (!isLocalAddress(host)) throw new Error('ORBIT_HOST must be a local IP address');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('Invalid ORBIT_PORT');
  if (!env.ORBIT_TLS_CERT || !env.ORBIT_TLS_KEY) throw new Error('ORBIT_TLS_CERT and ORBIT_TLS_KEY are required');
  return { host, port, certificatePath: env.ORBIT_TLS_CERT, privateKeyPath: env.ORBIT_TLS_KEY,
    credentialStorePath: env.ORBIT_CREDENTIAL_STORE };
}
