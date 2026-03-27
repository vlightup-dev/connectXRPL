import type { PropsWithChildren } from "react";
import type { WalletId } from "../../../core/src/types";
import { useWalletConnect } from "../hooks";

type ConnectWalletButtonProps = PropsWithChildren<{
  walletId: WalletId;
}>;

export function ConnectWalletButton({ walletId, children }: ConnectWalletButtonProps) {
  const { connect, selectWallet, status } = useWalletConnect();

  return (
    <button
      type="button"
      onClick={async () => {
        selectWallet(walletId);
        await connect(walletId);
      }}
    >
      {status === "connecting" ? "Connecting..." : (children ?? "Connect wallet")}
    </button>
  );
}
