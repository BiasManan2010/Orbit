/** Persists the test client's paired credential and pinned trust; depends on private storage and Zod; never logs secrets or performs discovery. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { endpointSchema, idSchema, tokenSchema } from '../protocol/pairing.js';
import { atomicWrite } from '../security-pairing/atomic-file.js';

export const pairedDesktopSchema = z.strictObject({ desktopServiceId: idSchema, deviceId: idSchema,
  endpoint: endpointSchema, certificate: z.string().max(4_096),
  certificateFingerprint: z.string().regex(/^[a-f0-9]{64}$/), credential: tokenSchema });
export type PairedDesktop = z.infer<typeof pairedDesktopSchema>;
export function savePairedDesktop(directory: string, paired: PairedDesktop): void {
  atomicWrite(join(directory, 'paired-desktop.json'), JSON.stringify(pairedDesktopSchema.parse(paired)));
}
export function loadPairedDesktop(directory: string): PairedDesktop {
  return pairedDesktopSchema.parse(JSON.parse(readFileSync(join(directory, 'paired-desktop.json'), 'utf8')));
}
