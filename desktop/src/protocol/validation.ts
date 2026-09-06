/** Validates untrusted protocol envelopes; depends on protocol definitions; leaves payload semantics to handlers. */
import { ProtocolError } from './errors.js';
import { PROTOCOL_VERSION, type CommandMessage } from './messages.js';
import { z } from 'zod';

export const IDENTIFIER_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const COMMAND_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,3}$/;
const envelopeSchema = z.strictObject({ version: z.literal(PROTOCOL_VERSION),
  type: z.string().max(64).regex(COMMAND_PATTERN), requestId: z.string().regex(IDENTIFIER_PATTERN),
  payload: z.unknown() });

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseMessage(text: string): CommandMessage {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ProtocolError('INVALID_MESSAGE'); }
  if (!isRecord(value)) throw new ProtocolError('INVALID_MESSAGE');
  if (value.version !== PROTOCOL_VERSION) throw new ProtocolError('UNSUPPORTED_VERSION');
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success || !Object.hasOwn(value, 'payload')) throw new ProtocolError('INVALID_MESSAGE');
  return parsed.data as CommandMessage;
}
