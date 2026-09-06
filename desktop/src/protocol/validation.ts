/** Validates untrusted protocol envelopes; depends on protocol definitions; leaves payload semantics to handlers. */
import { ProtocolError } from './errors.js';
import { PROTOCOL_VERSION, type CommandMessage } from './messages.js';

export const IDENTIFIER_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const COMMAND_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,3}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseMessage(text: string): CommandMessage {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ProtocolError('INVALID_MESSAGE'); }
  if (!isRecord(value)) throw new ProtocolError('INVALID_MESSAGE');
  if (value.version !== PROTOCOL_VERSION) throw new ProtocolError('UNSUPPORTED_VERSION');
  if (Object.keys(value).length !== 4 || typeof value.type !== 'string'
    || value.type.length > 64 || !COMMAND_PATTERN.test(value.type)
    || typeof value.requestId !== 'string' || !IDENTIFIER_PATTERN.test(value.requestId)
    || !Object.hasOwn(value, 'payload')) throw new ProtocolError('INVALID_MESSAGE');
  return value as unknown as CommandMessage;
}
