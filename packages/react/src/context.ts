import { createContext } from "react";
import { createWalletConnectError } from "../../core/src/errors";
import type { WalletAccount, WalletAdapter, WalletId } from "../../core/src/types";

export type WalletConnectContextValue = {
  adapters: WalletAdapter[];
  selectedWalletId: WalletId | null;
  account: WalletAccount | null;
  status: "idle" | "connecting" | "connected" | "error";
  error: string | null;
  selectWallet: (walletId: WalletId) => void;
  connect: (walletId?: WalletId) => Promise<WalletAccount>;
};

export const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

export function getWalletAdapter(adapters: WalletAdapter[], walletId: WalletId | null) {
  if (!walletId) {
    throw createWalletConnectError("configuration_error", "No wallet selected.");
  }

  const adapter = adapters.find((candidate) => candidate.id === walletId);

  if (!adapter) {
    throw createWalletConnectError("configuration_error", `Wallet "${walletId}" is unavailable.`);
  }

  return adapter;
}
