import { describe, expect, it, vi } from "vitest";
import { createCrossmarkAdapter } from "@crossmark/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const { signAndSubmitAndWait, signInAndWait } = vi.hoisted(() => ({
  signAndSubmitAndWait: vi.fn(),
  signInAndWait: vi.fn(),
}));

vi.mock("@crossmarkio/sdk", () => ({
  default: {
    methods: {
      signAndSubmitAndWait,
      signInAndWait,
    },
  },
}));

describe("Crossmark adapter", () => {
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

  it("normalizes extension install failures", async () => {
    signInAndWait.mockRejectedValue(new Error("Crossmark not installed"));

    await expect(createCrossmarkAdapter().connect()).rejects.toMatchObject({
      code: "not_installed",
    });
  });
});
