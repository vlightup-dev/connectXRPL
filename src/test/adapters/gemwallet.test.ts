import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGemWalletAdapter } from "@gemwallet/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const { getAddress, getNetwork, isInstalled, submitTransaction } = vi.hoisted(() => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isInstalled: vi.fn(),
  submitTransaction: vi.fn(),
}));

vi.mock("@gemwallet/api", () => ({
  getAddress,
  getNetwork,
  isInstalled,
  submitTransaction,
}));

describe("GemWallet adapter", () => {
  beforeEach(() => {
    getNetwork.mockResolvedValue({
      result: {
        network: "Testnet",
      },
    });
  });

  it("maps installed state", async () => {
    isInstalled.mockResolvedValue({
      result: {
        isInstalled: true,
      },
    });

    await expect(createGemWalletAdapter().isInstalled()).resolves.toBe(true);
  });

  it("connects and returns a normalized account", async () => {
    isInstalled.mockResolvedValue({
      result: {
        isInstalled: true,
      },
    });
    getAddress.mockResolvedValue({
      result: {
        address: TEST_XRPL_ADDRESS,
      },
    });

    await expect(createGemWalletAdapter().connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "testnet",
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

  it("rejects submit when GemWallet is not on testnet", async () => {
    getNetwork.mockResolvedValue({
      result: {
        network: "Mainnet",
      },
    });

    await expect(
      createGemWalletAdapter().submitTransaction?.({
        transaction: {
          TransactionType: "Payment",
          Account: TEST_XRPL_ADDRESS,
        },
      }),
    ).rejects.toMatchObject({
      code: "configuration_error",
      message: "GemWallet is on mainnet. Switch GemWallet to XRPL Testnet and retry.",
    });
  });

  it("normalizes connect failures", async () => {
    isInstalled.mockResolvedValue({
      result: {
        isInstalled: true,
      },
    });
    getAddress.mockRejectedValue(new Error("Extension offline"));

    await expect(createGemWalletAdapter().connect()).rejects.toMatchObject({
      code: "connection_failed",
      message: "GemWallet connection failed.",
    });
  });

  it("throws a not installed error when the extension is missing", async () => {
    isInstalled.mockResolvedValue({
      result: {
        isInstalled: false,
      },
    });

    await expect(createGemWalletAdapter().connect()).rejects.toMatchObject({
      code: "not_installed",
      message: "Install GemWallet before connecting.",
    });
  });
});
