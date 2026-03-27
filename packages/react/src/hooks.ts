import { useContext } from "react";
import { WalletConnectContext } from "./context";

export function useWalletConnect() {
  const context = useContext(WalletConnectContext);

  if (!context) {
    throw new Error("useWalletConnect must be used within a WalletProvider.");
  }

  return {
    connect: context.connect,
    error: context.error,
    selectWallet: context.selectWallet,
    selectedWalletId: context.selectedWalletId,
    status: context.status,
  };
}

export function useWalletAccount() {
  const context = useContext(WalletConnectContext);

  if (!context) {
    throw new Error("useWalletAccount must be used within a WalletProvider.");
  }

  return context.account;
}
