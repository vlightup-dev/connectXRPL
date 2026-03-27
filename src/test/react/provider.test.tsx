import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { WalletProvider } from "@react/provider";
import { useWalletAccount, useWalletConnect } from "@react/hooks";
import { type WalletAdapter } from "@core/types";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

function createAdapter(overrides: Partial<WalletAdapter> = {}): WalletAdapter {
  return {
    id: "gemwallet",
    name: "GemWallet",
    capabilities: ["connect", "getAccount"],
    async isInstalled() {
      return true;
    },
    async connect() {
      return {
        address: TEST_XRPL_ADDRESS,
        network: "testnet",
      };
    },
    ...overrides,
  };
}

function Harness() {
  const { connect, error, selectWallet, selectedWalletId, status } = useWalletConnect();
  const account = useWalletAccount();

  return (
    <div>
      <button type="button" onClick={() => selectWallet("gemwallet")}>
        Pick GemWallet
      </button>
      <button
        type="button"
        onClick={() => {
          void connect().catch(() => {});
        }}
      >
        Connect
      </button>
      <p>selected: {selectedWalletId ?? "none"}</p>
      <p>status: {status}</p>
      <p>account: {account?.address ?? "none"}</p>
      <p>error: {error ?? "none"}</p>
    </div>
  );
}

describe("WalletProvider", () => {
  it("stores the selected wallet and connects through the adapter", async () => {
    const user = userEvent.setup();

    render(
      <WalletProvider adapters={[createAdapter()]}>
        <Harness />
      </WalletProvider>,
    );

    await user.click(screen.getByRole("button", { name: /pick gemwallet/i }));
    await user.click(screen.getByRole("button", { name: /connect/i }));

    expect(screen.getByText(/selected: gemwallet/i)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(`account: ${TEST_XRPL_ADDRESS}`)).toBeTruthy());
  });

  it("exposes normalized errors when connection fails", async () => {
    const user = userEvent.setup();

    render(
      <WalletProvider
        adapters={[
          createAdapter({
            async connect() {
              throw new Error("boom");
            },
          }),
        ]}
      >
        <Harness />
      </WalletProvider>,
    );

    await user.click(screen.getByRole("button", { name: /pick gemwallet/i }));
    await user.click(screen.getByRole("button", { name: /connect/i }));

    await waitFor(() => expect(screen.getByText(/error: boom/i)).toBeTruthy());
  });
});
