import { describe, expect, it, vi } from "vitest";
import { createCrossmarkAdapter } from "@crossmark/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const { isInstalled, signAndSubmitAndWait, signAndWait, signInAndWait } = vi.hoisted(() => ({
  isInstalled: vi.fn(),
  signAndSubmitAndWait: vi.fn(),
  signAndWait: vi.fn(),
  signInAndWait: vi.fn(),
}));

vi.mock("@crossmarkio/sdk", () => ({
  default: {
    async: {
      signAndSubmitAndWait,
      signAndWait,
      signInAndWait,
    },
    sync: {
      isInstalled,
    },
  },
}));

describe("Crossmark adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps installed state from the sdk", async () => {
    isInstalled.mockReturnValue(true);

    await expect(createCrossmarkAdapter().isInstalled()).resolves.toBe(true);
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

  it("normalizes extension install failures", async () => {
    signInAndWait.mockRejectedValue(new Error("Crossmark not installed"));

    await expect(createCrossmarkAdapter().connect()).rejects.toMatchObject({
      code: "not_installed",
    });
  });

  it("throws a not installed error when the sdk reports the extension is missing", async () => {
    isInstalled.mockReturnValue(false);

    await expect(createCrossmarkAdapter().connect()).rejects.toMatchObject({
      code: "not_installed",
    });
    expect(signInAndWait).not.toHaveBeenCalled();
  });
});
