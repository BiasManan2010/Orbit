/** Composes the Phase 2 service lifecycle; depends on pairing, discovery and transport; registers no feature modules or mobile UI. */
import { join } from 'node:path';
import { ActivityLog } from './activity-log/activity-log.js';
import { CommandRegistry } from './command-router/command-registry.js';
import { CommandRouter } from './command-router/command-router.js';
import { privateDirectory } from './security-pairing/private-directory.js';
import { lockService } from './security-pairing/service-lock.js';
import { certificateFingerprint, loadOrCreateIdentity } from './security-pairing/desktop-identity.js';
import { FilePairedCredentialStore } from './security-pairing/paired-credential-store.js';
import { PairingService } from './security-pairing/pairing-service.js';
import { SessionAuth } from './security-pairing/session-auth.js';
import { advertiseDesktop, type DesktopHint } from './transport/discovery/lan-discovery.js';
import { createWebSocketTransport, type TransportOptions } from './transport/websocket/websocket-server.js';

export async function startDesktop(options: { directory: string; host: string; port: number; displayName: string;
  discovery?: boolean; sessionTtlMs?: number; registry?: CommandRegistry }) {
  const directory = privateDirectory(options.directory);
  const unlock = lockService(directory);
  const log = new ActivityLog();
  let transport: ReturnType<typeof createWebSocketTransport> | undefined;
  let discovery: ReturnType<typeof advertiseDesktop> | undefined;
  try {
    const identity = await loadOrCreateIdentity(directory);
    const store = new FilePairedCredentialStore(join(directory, 'credentials.json'));
    const auth = new SessionAuth(store, log, options.sessionTtlMs);
    const registry = options.registry ?? new CommandRegistry();
    const router = new CommandRouter(registry, auth, log);
    const transportOptions: TransportOptions = { host: options.host, port: options.port,
      tls: { cert: identity.certificate, key: identity.privateKey }, router, auth, log };
    transport = createWebSocketTransport(transportOptions);
    const address = await transport.start();
    const host = options.host.includes(':') ? `[${options.host}]` : options.host;
    const hint: DesktopHint = { desktopServiceId: identity.desktopServiceId, displayName: options.displayName,
      endpoint: `wss://${host}:${address.port}/v1/channel`, certificate: identity.certificate };
    const pairing = new PairingService({ ...hint, certificateFingerprint: certificateFingerprint(identity.certificate) }, store, log);
    transportOptions.pairing = pairing;
    if (options.discovery !== false) discovery = advertiseDesktop(hint,
      () => log.record({ severity: 'warn', eventType: 'discovery.error', outcome: 'failed' }));
    let stopped = false;
    return { directory, pairing, hint, log, transport, auth,
      async stop(): Promise<void> {
        if (stopped) return;
        stopped = true;
        pairing.close();
        try { await discovery?.stop(); } finally {
          try { await transport!.stop(); } finally { unlock(); }
        }
      } };
  } catch (error) {
    try { await discovery?.stop(); } finally {
      try { await transport?.stop(); } finally { unlock(); }
    }
    throw error;
  }
}
