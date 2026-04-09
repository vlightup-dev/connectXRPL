import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCrossmarkAdapter } from "@crossmark/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const { isInstalled, isConnected, getAddress, signAndSubmitAndWait, signAndWait, signInAndWait } =
  vi.hoisted(() => ({
    isInstalled: vi.fn(),
    isConnected: vi.fn(),
    getAddress: vi.fn(),
    signAndSubmitAndWait: vi.fn(),
    signAndWait: vi.fn(),
    signInAndWait: vi.fn(),
  }));

const sdkState = vi.hoisted(() => ({
  mode: "namespaced" as "namespaced" | "methods" | "wrapped",
}));

vi.mock("@crossmarkio/sdk", () => {
  const namespacedSdk = {
    async: {
      signAndSubmitAndWait,
      signAndWait,
      signInAndWait,
    },
    sync: {
      isInstalled,
      isConnected,
      getAddress,
    },
  };

  const methodsSdk = {
    methods: {
      isInstalled,
      signAndSubmitAndWait,
      signAndWait,
      signInAndWait,
    },
  };

  // Simulates the webpack module namespace wrapping: sdk.default is the real SDK,
  // sdk itself has no async/sync/methods at the top level.
  const wrappedSdk = {
    default: namespacedSdk,
  };

  return {
    default: new Proxy(
      {},
      {
        get(_target, property) {
          if (sdkState.mode === "methods") return Reflect.get(methodsSdk, property);
          if (sdkState.mode === "wrapped") return Reflect.get(wrappedSdk, property);
          return Reflect.get(namespacedSdk, property);
        },
      },
    ),
  };
});

describe("Crossmark adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdkState.mode = "namespaced";
  });

  it("maps installed state from the sdk", async () => {
    isInstalled.mockReturnValue(true);

    await expect(createCrossmarkAdapter().isInstalled()).resolves.toBe(true);
  });

  it("returns the active account when the extension is connected", async () => {
    isConnected.mockReturnValue(true);
    getAddress.mockReturnValue(TEST_XRPL_ADDRESS);

    await expect(createCrossmarkAdapter().getAccount?.()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
  });

  it("returns null when the extension is not connected", async () => {
    isConnected.mockReturnValue(false);

    await expect(createCrossmarkAdapter().getAccount?.()).resolves.toBeNull();
    expect(getAddress).not.toHaveBeenCalled();
  });

  it("returns null when connected but address is unavailable", async () => {
    isConnected.mockReturnValue(true);
    getAddress.mockReturnValue(undefined);

    await expect(createCrossmarkAdapter().getAccount?.()).resolves.toBeNull();
  });

  it("returns null from getAccount when using the methods sdk surface (no sync namespace)", async () => {
    sdkState.mode = "methods";

    await expect(createCrossmarkAdapter().getAccount?.()).resolves.toBeNull();
  });

  it("connects and returns a normalized account", async () => {
    signInAndWait.mockResolvedValue({
      response: {
        data: {
          address: TEST_XRPL_ADDRESS,
        },
      },
    });

    await expect(createCrossmarkAdapter().connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
  });

  it("connects correctly when the sdk is wrapped in a module namespace object", async () => {
    sdkState.mode = "wrapped";
    signInAndWait.mockResolvedValue({
      response: {
        data: {
          address: TEST_XRPL_ADDRESS,
        },
      },
    });

    await expect(createCrossmarkAdapter().connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
  });

  it("submits transactions with Crossmark", async () => {
    signAndSubmitAndWait.mockResolvedValue({
      response: {
        data: {
          resp: {
            hash: "FAKE_HASH",
          },
        },
      },
    });

    const transaction = {
      TransactionType: "Payment",
      Account: TEST_XRPL_ADDRESS,
    };

    await expect(
      createCrossmarkAdapter().submitTransaction?.({
        transaction,
      }),
    ).resolves.toEqual({
      hash: "FAKE_HASH",
      result: {
        hash: "FAKE_HASH",
      },
    });
    expect(signAndSubmitAndWait).toHaveBeenCalledWith(transaction);
  });

  it("wraps submission failures with a submission_failed error code", async () => {
    signAndSubmitAndWait.mockRejectedValue(new Error("network timeout"));

    await expect(
      createCrossmarkAdapter().submitTransaction?.({ transaction: {} }),
    ).rejects.toMatchObject({ code: "submission_failed" });
  });

  it("signs transactions with Crossmark via the async sdk namespace", async () => {
    signAndWait.mockResolvedValue({
      response: {
        data: {
          txBlob: "SIGNED_BLOB",
        },
      },
    });

    const transaction = {
      TransactionType: "Payment",
      Account: TEST_XRPL_ADDRESS,
    };

    await expect(
      createCrossmarkAdapter().signTransaction?.({
        transaction,
      }),
    ).resolves.toEqual({
      signedTransaction: {
        txBlob: "SIGNED_BLOB",
      },
    });
    expect(signAndWait).toHaveBeenCalledWith(transaction);
  });

  it("wraps signing failures with a signing_failed error code", async () => {
    signAndWait.mockRejectedValue(new Error("user rejected"));

    await expect(
      createCrossmarkAdapter().signTransaction?.({ transaction: {} }),
    ).rejects.toMatchObject({ code: "signing_failed" });
  });

  it("normalizes extension install failures", async () => {
    signInAndWait.mockRejectedValue(new Error("Crossmark not installed"));

    await expect(createCrossmarkAdapter().connect()).rejects.toMatchObject({
      code: "not_installed",
    });
  });

  it("throws a not installed error when the sdk reports the extension is missing", async () => {
    isInstalled.mockReturnValue(false);
    signInAndWait.mockRejectedValue(new Error("Crossmark not installed"));

    await expect(createCrossmarkAdapter().connect()).rejects.toMatchObject({
      code: "not_installed",
    });
    expect(signInAndWait).toHaveBeenCalled();
  });

  it("falls back to the methods sdk surface when async and sync are unavailable", async () => {
    sdkState.mode = "methods";
    isInstalled.mockReturnValue(true);
    signInAndWait.mockResolvedValue({
      response: {
        data: {
          address: TEST_XRPL_ADDRESS,
        },
      },
    });

    await expect(createCrossmarkAdapter().connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
  });

  it("does not block connect when isInstalled is false but sign-in succeeds", async () => {
    isInstalled.mockReturnValue(false);
    signInAndWait.mockResolvedValue({
      response: {
        data: {
          address: TEST_XRPL_ADDRESS,
        },
      },
    });

    await expect(createCrossmarkAdapter().connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
  });
});
