import { describe, expect, it, vi } from "vitest";
import { createGemWalletAdapter } from "@gemwallet/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const { getAddress, isInstalled, submitTransaction } = vi.hoisted(() => ({
  getAddress: vi.fn(),
  isInstalled: vi.fn(),
  submitTransaction: vi.fn(),
}));

vi.mock("@gemwallet/api", () => ({
  getAddress,
  isInstalled,
  submitTransaction,
}));

describe("GemWallet adapter", () => {
  it("maps installed state", async () => {
    isInstalled.mockResolvedValue({
      result: {
        isInstalled: true,
      },
    });

    await expect(createGemWalletAdapter().isInstalled()).resolves.toBe(true);
  });

  it("connects and returns a normalized account", async () => {
    getAddress.mockResolvedValue({
      result: {
        address: TEST_XRPL_ADDRESS,
      },
    });

    await expect(createGemWalletAdapter().connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
  });

  it("passes transactions through to submitTransaction", async () => {
    submitTransaction.mockResolvedValue({
      result: {
        hash: "FAKE_HASH",
      },
    });

    const adapter = createGemWalletAdapter();
    const transaction = {
      TransactionType: "Payment",
      Account: TEST_XRPL_ADDRESS,
    };

    await expect(adapter.submitTransaction?.({ transaction })).resolves.toEqual({
      hash: "FAKE_HASH",
      result: {
        hash: "FAKE_HASH",
      },
    });
    expect(submitTransaction).toHaveBeenCalledWith({ transaction });
  });

  it("normalizes connect failures", async () => {
    getAddress.mockRejectedValue(new Error("Extension offline"));

    await expect(createGemWalletAdapter().connect()).rejects.toMatchObject({
      code: "connection_failed",
      message: "GemWallet connection failed.",
    });
  });
});
