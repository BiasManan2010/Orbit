/** Renders an explicitly opened pairing invitation locally; depends on qrcode and private files; never logs or broadcasts its token. */
import QRCode from 'qrcode';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import type { PairingPayload } from '../protocol/pairing.js';
import { atomicWrite } from './atomic-file.js';

export async function showPairing(directory: string, payload: PairingPayload): Promise<() => void> {
  const jsonPath = join(directory, 'pairing.json');
  const svgPath = join(directory, 'pairing.svg');
  const json = JSON.stringify(payload);
  const svg = await QRCode.toString(json, { type: 'svg', errorCorrectionLevel: 'M', margin: 4 });
  atomicWrite(jsonPath, json);
  atomicWrite(svgPath, svg);
  return () => { for (const path of [jsonPath, svgPath]) if (existsSync(path)) unlinkSync(path); };
}
