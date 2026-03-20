import type { JsonValue } from "./json.js";

export const protocolErrorCodes = [
  "bad_request",
  "not_found",
  "timeout",
  "transport_error",
  "handler_error",
  "not_ready"
] as const;

export type ProtocolErrorCode = (typeof protocolErrorCodes)[number];

export interface SerializedError {
  code: ProtocolErrorCode;
  message: string;
  details?: JsonValue;
}

export function createSerializedError(
  code: ProtocolErrorCode,
  message: string,
  details?: JsonValue
): SerializedError {
  return details === undefined ? { code, message } : { code, message, details };
}
