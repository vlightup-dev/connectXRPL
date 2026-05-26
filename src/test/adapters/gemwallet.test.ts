import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGemWalletAdapter } from "@gemwallet/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const { getAddress, getNetwork, getPublicKey, isInstalled, signTransaction, submitTransaction } =
  vi.hoisted(() => ({
    getAddress: vi.fn(),
    getNetwork: vi.fn(),
    getPublicKey: vi.fn(),
    isInstalled: vi.fn(),
    signTransaction: vi.fn(),
    submitTransaction: vi.fn(),
  }));

vi.mock("@gemwallet/api", () => ({
  getAddress,
  getNetwork,
  getPublicKey,
  isInstalled,
  signTransaction,
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

  it("signs a transaction — fetches public key first, then opens the signing popup", async () => {
    getPublicKey.mockResolvedValue({
      result: { publicKey: "PUBKEY_HEX", address: TEST_XRPL_ADDRESS },
    });
    signTransaction.mockResolvedValue({ result: { signature: "SIG_HEX" } });

    const transaction = { TransactionType: "Payment", Account: TEST_XRPL_ADDRESS };

    await expect(createGemWalletAdapter().signTransaction?.({ transaction })).resolves.toEqual({
      signedTransaction: {
        address: TEST_XRPL_ADDRESS,
        publicKey: "PUBKEY_HEX",
        signature: "SIG_HEX",
        transaction,
      },
    });

    // getPublicKey must be called BEFORE signTransaction so the "Share public key" popup
    // resolves before the transaction popup opens — prevents Promise.all hang.
    const getPublicKeyOrder = getPublicKey.mock.invocationCallOrder[0];
    const signTransactionOrder = signTransaction.mock.invocationCallOrder[0];
    expect(getPublicKeyOrder).toBeLessThan(signTransactionOrder);
  });

  it("wraps signing failures with a signing_failed error code", async () => {
    getPublicKey.mockResolvedValue({
      result: { publicKey: "PUBKEY_HEX", address: TEST_XRPL_ADDRESS },
    });
    signTransaction.mockRejectedValue(new Error("user rejected"));

    await expect(
      createGemWalletAdapter().signTransaction?.({ transaction: {} }),
    ).rejects.toMatchObject({ code: "signing_failed" });
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
