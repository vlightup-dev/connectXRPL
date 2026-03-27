import { useMemo, useState, type PropsWithChildren } from "react";
import type { WalletAccount, WalletAdapter, WalletId } from "../../core/src/types";
import { WalletConnectContext, getWalletAdapter } from "./context";

type WalletProviderProps = PropsWithChildren<{
  adapters: WalletAdapter[];
}>;

export function WalletProvider({ adapters, children }: WalletProviderProps) {
  const [selectedWalletId, setSelectedWalletId] = useState<WalletId | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      adapters,
      selectedWalletId,
      account,
      status,
      error,
      selectWallet(walletId: WalletId) {
        setSelectedWalletId(walletId);
        setError(null);
      },
      async connect(walletId?: WalletId) {
        const adapter = getWalletAdapter(adapters, walletId ?? selectedWalletId);
        setStatus("connecting");
        setError(null);

        try {
          const nextAccount = await adapter.connect();
          setAccount(nextAccount);
          setStatus("connected");
          return nextAccount;
        } catch (nextError) {
          setStatus("error");
          setError(nextError instanceof Error ? nextError.message : "Wallet connection failed.");
          throw nextError;
        }
      },
    }),
    [account, adapters, error, selectedWalletId, status],
  );

  return <WalletConnectContext.Provider value={value}>{children}</WalletConnectContext.Provider>;
}
