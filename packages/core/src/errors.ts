import type { WalletConnectError, WalletErrorCode } from "./types";

export function createWalletConnectError(
  code: WalletErrorCode,
  message: string,
  cause?: unknown,
): WalletConnectError {
  const error = new Error(message) as WalletConnectError;
  error.code = code;
  error.cause = cause;
  return error;
}
