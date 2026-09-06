/** Defines protocol v1 envelopes; depends on safe error codes; does not validate feature payloads. */
import type { ErrorCode } from './errors.js';

export const PROTOCOL_VERSION = 1 as const;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface CommandMessage {
  version: typeof PROTOCOL_VERSION;
  type: string;
  requestId: string;
  payload: JsonValue;
}

export interface ResponseMessage {
  version: typeof PROTOCOL_VERSION;
  type: 'response';
  requestId: string | null;
  payload: { ok: true; result: JsonValue } | { ok: false; error: { code: ErrorCode } };
}

export interface EventMessage {
  version: typeof PROTOCOL_VERSION;
  type: 'event';
  requestId: null;
  payload: { eventType: string; data: JsonValue };
}

export function success(requestId: string, result: JsonValue): ResponseMessage {
  return { version: PROTOCOL_VERSION, type: 'response', requestId, payload: { ok: true, result } };
}

export function failure(requestId: string | null, code: ErrorCode): ResponseMessage {
  return { version: PROTOCOL_VERSION, type: 'response', requestId, payload: { ok: false, error: { code } } };
}
