/** Composes Orbit Desktop; depends on core modules and explicit local configuration; does not implement feature handlers. */
import { ActivityLog } from './activity-log/activity-log.js';
import { CommandRegistry } from './command-router/command-registry.js';
import { CommandRouter } from './command-router/command-router.js';
import { readConfig } from './config.js';
import { FilePairedCredentialStore } from './security-pairing/paired-credential-store.js';
import { SessionAuth } from './security-pairing/session-auth.js';
import { loadEncryptedChannel } from './transport/websocket/encrypted-channel.js';
import { createWebSocketTransport } from './transport/websocket/websocket-server.js';

async function main(): Promise<void> {
  const config = readConfig();
  const log = new ActivityLog();
  const credentials = new FilePairedCredentialStore(config.credentialStorePath);
  const auth = new SessionAuth(credentials, log);
  const router = new CommandRouter(new CommandRegistry(), auth, log);
  const channel = loadEncryptedChannel(config.certificatePath, config.privateKeyPath);
  const transport = createWebSocketTransport({ ...config, tls: channel.tls, router, auth, log });
  try { await transport.start(); }
  catch (error) { await transport.stop(); throw error; }
  console.info('Orbit Desktop is listening on its configured encrypted local endpoint.');
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void transport.stop().catch(() => { process.exitCode = 1; });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

void main().catch(() => {
  console.error('Orbit Desktop could not start. Check the local endpoint, TLS identity, and credential-store configuration.');
  process.exitCode = 1;
});
