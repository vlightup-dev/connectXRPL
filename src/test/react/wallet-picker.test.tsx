import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalletProvider } from "@react/provider";
import { WalletPicker } from "@react/components/wallet-picker";
import { type WalletAdapter } from "@core/types";

function createAdapter(id: WalletAdapter["id"], name: string): WalletAdapter {
  return {
    id,
    name,
    capabilities: ["connect"],
    async isInstalled() {
      return id === "gemwallet";
    },
    async connect() {
      return {
        address: `${id}-address`,
        network: "unknown",
      };
    },
  };
}

describe("WalletPicker", () => {
  it("renders configured wallets and calls connect for the selected wallet", async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();

    render(
      <WalletProvider
        adapters={[
          createAdapter("gemwallet", "GemWallet"),
          createAdapter("xaman", "Xaman"),
          createAdapter("crossmark", "Crossmark"),
        ]}
      >
        <WalletPicker wallets={["gemwallet", "xaman", "crossmark"]} onConnect={onConnect} />
      </WalletProvider>,
    );

    expect(screen.getByRole("button", { name: /gemwallet/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /xaman/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /crossmark/i })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/installed/i)).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /xaman/i }));
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    expect(onConnect).toHaveBeenCalledWith({
      address: "xaman-address",
      network: "unknown",
    });
  });
});
