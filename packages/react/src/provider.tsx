import { useMemo, useState, type PropsWithChildren } from "react";
import { createWalletConnectError } from "../../core/src/errors";
import type { WalletAccount, WalletAdapter, WalletId } from "../../core/src/types";
import { WalletConnectContext, getWalletAdapter } from "./context";

function connectWithTimeout(
  connect: () => Promise<WalletAccount>,
  timeoutMs: number,
  walletId: WalletId,
) {
  const timeoutMessage =
    walletId === "gemwallet"
      ? "Wallet connection timed out. GemWallet does not open the extensions toolbar menu — it opens a separate small popup window. Check behind other windows, the dock/taskbar, and other monitors; close any stuck GemWallet popups then try again, or reload the GemWallet extension from chrome://extensions."
      : "Wallet connection timed out.";

  return new Promise<WalletAccount>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(createWalletConnectError("connection_failed", timeoutMessage));
    }, timeoutMs);

    void connect()
      .then((account) => {
        window.clearTimeout(timeoutId);
        resolve(account);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

type WalletProviderProps = PropsWithChildren<{
  adapters: WalletAdapter[];
  connectTimeoutMs?: number;
}>;

export function WalletProvider({
  adapters,
  children,
  connectTimeoutMs = 15000,
}: WalletProviderProps) {
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
          const nextAccount = await connectWithTimeout(
            () => adapter.connect(),
            connectTimeoutMs,
            adapter.id,
          );
          setAccount(nextAccount);
          setStatus("connected");
          return nextAccount;
        } catch (nextError) {
          console.error(
            "Wallet connection failed:",
            nextError instanceof Error ? nextError.message : nextError,
            {
              walletId: adapter.id,
            },
          );
          setStatus("error");
          setError(nextError instanceof Error ? nextError.message : "Wallet connection failed.");
          throw nextError;
        }
      },
    }),
    [account, adapters, connectTimeoutMs, error, selectedWalletId, status],
  );

  return <WalletConnectContext.Provider value={value}>{children}</WalletConnectContext.Provider>;
}
