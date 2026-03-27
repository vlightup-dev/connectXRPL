import { useContext } from "react";
import type { WalletAdapter, WalletId } from "../../../core/src/types";
import { WalletConnectContext } from "../context";

export function useWalletAdapters(walletIds: WalletId[]): WalletAdapter[] {
  const context = useContext(WalletConnectContext);

  if (!context) {
    throw new Error("useWalletAdapters must be used within a WalletProvider.");
  }

  return walletIds
    .map((walletId) => context.adapters.find((adapter) => adapter.id === walletId))
    .filter((adapter): adapter is WalletAdapter => Boolean(adapter));
}
