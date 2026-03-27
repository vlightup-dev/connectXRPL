import { describe, expect, it } from "vitest";
import { createWalletConnectError, ensureWalletCapability, type WalletAdapter } from "@core/index";
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

describe("wallet core contract", () => {
  it("throws a capability error for unsupported operations", async () => {
    const adapter = createAdapter();

    await expect(
      ensureWalletCapability(adapter, "submitTransaction", adapter.submitTransaction),
    ).rejects.toMatchObject({
      code: "unsupported_method",
    });
  });

  it("returns the method when the capability is supported", async () => {
    const submitTransaction = async () => ({ hash: "abc" });
    const adapter = createAdapter({
      capabilities: ["connect", "getAccount", "submitTransaction"],
      submitTransaction,
    });

    await expect(
      ensureWalletCapability(adapter, "submitTransaction", adapter.submitTransaction),
    ).resolves.toBe(submitTransaction);
  });

  it("creates normalized errors with code and message", () => {
    expect(createWalletConnectError("connection_failed", "Could not connect wallet")).toMatchObject(
      {
        code: "connection_failed",
        message: "Could not connect wallet",
      },
    );
  });
});
