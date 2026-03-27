import { createWalletConnectError } from "./errors";
import type { WalletAdapter, WalletCapability } from "./types";

export async function ensureWalletCapability<T>(
  adapter: WalletAdapter,
  capability: WalletCapability,
  method: T | undefined,
): Promise<T> {
  if (method && adapter.capabilities.includes(capability)) {
    return method;
  }

  throw createWalletConnectError(
    "unsupported_method",
    `${adapter.name} does not support ${capability}.`,
  );
}
