/** Runs the local TypeScript integration harness; depends on pairing/discovery/client modules; never prints payloads or implements mobile screens. */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { pairingPayloadSchema } from '../protocol/pairing.js';
import { privateDirectory } from '../security-pairing/private-directory.js';
import { discoverDesktop } from '../transport/discovery/lan-discovery.js';
import { pairDesktop } from './pair-desktop.js';
import { loadPairedDesktop, savePairedDesktop } from './paired-desktop.js';
import { OrbitClient } from './orbit-client.js';

async function main(): Promise<void> {
  const directory = privateDirectory(process.env.ORBIT_CLIENT_DIR ?? '.local/client');
  const [action, qrPath] = process.argv.slice(2);
  if (action === 'pair') {
    if (!qrPath) throw new Error('Pairing file required');
    const qr = pairingPayloadSchema.parse(JSON.parse(readFileSync(qrPath, 'utf8')));
    const hint = await discoverDesktop(qr);
    savePairedDesktop(directory, await pairDesktop(qr, hint));
    console.info('Pairing completed. The device credential is stored in the private client directory.');
    return;
  }
  if (action !== 'connect') throw new Error('Use pair <pairing.json> or connect');
  const paired = loadPairedDesktop(directory);
  const client = new OrbitClient(paired, async signal => (await discoverDesktop(paired, 10_000, signal)).endpoint);
  client.on('status', status => console.info(`Orbit client: ${String(status)}`));
  client.on('desktop-event', () => console.info('Desktop event received; payload omitted.'));
  await client.start();
  const input = createInterface({ input: process.stdin });
  input.on('line', line => {
    if (line.trim() === 'quit') { client.stop(); input.close(); process.stdin.destroy(); return; }
    try {
      const message = JSON.parse(line) as { type: string; payload: import('../protocol/messages.js').JsonValue };
      void client.command(message.type, message.payload).then(response => {
        console.info(response.payload.ok ? 'Command succeeded; result omitted.' : `Command rejected: ${response.payload.error.code}`);
      }).catch(() => console.info('Command failed or its outcome is unknown; no replay was attempted.'));
    } catch { console.info('Enter a JSON command with type and payload, or quit.'); }
  });
  const stop = () => { client.stop(); input.close(); process.stdin.destroy(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

void main().catch(() => {
  console.error('Orbit integration client could not complete the operation. Check pairing, LAN discovery, and private storage.');
  process.exitCode = 1;
});
