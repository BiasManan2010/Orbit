/** Prevents concurrent writers to one desktop identity/store; depends on exclusive local files; does not remove stale locks automatically. */
import { closeSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function lockService(directory: string): () => void {
  const path = join(directory, 'service.lock');
  const descriptor = openSync(path, 'wx', 0o600);
  writeFileSync(descriptor, String(process.pid));
  closeSync(descriptor);
  return () => unlinkSync(path);
}
