import { useEffect, useState } from "react";
import type { WalletAccount, WalletId } from "../../../core/src/types";
import { useWalletConnect } from "../hooks";
import { useWalletAdapters } from "./wallet-picker.helpers";

type WalletPickerProps = {
  wallets: WalletId[];
  onConnect?: (account: WalletAccount) => void;
};

export function WalletPicker({ wallets, onConnect }: WalletPickerProps) {
  const adapters = useWalletAdapters(wallets);
  const { connect, error, selectWallet, selectedWalletId, status } = useWalletConnect();
  const [installedIds, setInstalledIds] = useState<WalletId[]>([]);

  async function handleWalletSelect(walletId: WalletId) {
    selectWallet(walletId);
    const account = await connect(walletId);
    onConnect?.(account);
  }

  useEffect(() => {
    void Promise.all(
      adapters.map(async (adapter) => ((await adapter.isInstalled()) ? adapter.id : null)),
    ).then((result) => {
      setInstalledIds(result.filter((value): value is WalletId => value !== null));
    });
  }, [adapters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {adapters.map((adapter) => (
          <button
            key={adapter.id}
            type="button"
            onClick={() => {
              void handleWalletSelect(adapter.id);
            }}
            disabled={status === "connecting"}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              selectedWalletId === adapter.id
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white text-black"
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            <span className="block text-base font-semibold">{adapter.name}</span>
            <span className="mt-2 block text-xs uppercase tracking-[0.2em] opacity-60">
              {installedIds.includes(adapter.id) ? "Installed" : "Available"}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={async () => {
          const account = await connect();
          onConnect?.(account);
        }}
        disabled={status === "connecting" || !selectedWalletId}
        className="rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white"
      >
        {status === "connecting" ? "Connecting..." : "Connect wallet"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
