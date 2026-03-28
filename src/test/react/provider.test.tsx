import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
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
      expect(consoleErrorSpy).toHaveBeenCalledWith("Wallet connection failed:", "boom", {
        walletId: "gemwallet",
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("recovers when a wallet connection hangs", async () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(
        <WalletProvider
          adapters={[
            createAdapter({
              connect() {
                return new Promise(() => {});
              },
            }),
          ]}
          connectTimeoutMs={50}
        >
          <Harness />
        </WalletProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: /pick gemwallet/i }));
      fireEvent.click(screen.getByRole("button", { name: /connect/i }));

      expect(screen.getByText(/status: connecting/i)).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60);
      });

      expect(screen.getByText(/status: error/i)).toBeTruthy();
      expect(screen.getByText(/error: wallet connection timed out/i)).toBeTruthy();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Wallet connection failed:",
        expect.stringContaining("Wallet connection timed out."),
        {
          walletId: "gemwallet",
        },
      );
    } finally {
      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
