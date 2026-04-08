import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPreparedXamanSignRequestWindow,
  createXamanAdapter,
  prepareXamanSignRequestWindow,
} from "@xaman/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const {
  authorize,
  constructorSpy,
  createAndSubscribe,
  getPayload,
  logout,
  mockState,
  resetMockState,
} = vi.hoisted(() => {
  const mockState = {
    signedIn: false,
    account: "",
  };

  return {
    authorize: vi.fn(),
    constructorSpy: vi.fn(),
    createAndSubscribe: vi.fn(),
    getPayload: vi.fn(),
    logout: vi.fn(),
    mockState,
    resetMockState: () => {
      mockState.signedIn = false;
      mockState.account = "";
    },
  };
});

vi.mock("xumm", () => ({
  Xumm: class {
    state = {
      get account() {
        return mockState.account;
      },
      get signedIn() {
        return mockState.signedIn;
      },
    };

    user = {
      get account() {
        return Promise.resolve(mockState.signedIn ? mockState.account : undefined);
      },
    };

    payload = {
      createAndSubscribe,
      get: getPayload,
    };

    logout = logout;

    constructor(...args: unknown[]) {
      constructorSpy(...args);
    }

    async authorize() {
      return authorize();
    }
  },
}));

function setMockSession(signedIn: boolean, account = TEST_XRPL_ADDRESS) {
  mockState.signedIn = signedIn;
  mockState.account = account;
}

describe("Xaman adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockReturnValue(null);
    resetMockState();
    setMockSession(false);
    clearPreparedXamanSignRequestWindow();
  });

  it("connects and returns the XRPL account", async () => {
    authorize.mockImplementation(async () => {
      setMockSession(true);
      return {
        me: {
          account: TEST_XRPL_ADDRESS,
        },
      };
    });

    const adapter = createXamanAdapter({
      apiKey: "xaman-key",
      redirectUrl: "http://localhost:3000",
    });

    await expect(adapter.connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
    expect(constructorSpy).toHaveBeenCalledWith("xaman-key");
  });

  it("uses the authorize response account even before SDK session state is hydrated", async () => {
    authorize.mockResolvedValue({
      me: {
        account: TEST_XRPL_ADDRESS,
      },
    });

    const adapter = createXamanAdapter({
      apiKey: "xaman-key",
      redirectUrl: "http://localhost:3000",
    });

    await expect(adapter.connect()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
  });

  it("returns false from isInstalled when config is missing", async () => {
    await expect(createXamanAdapter().isInstalled()).resolves.toBe(false);
  });

  it("restores an existing signed-in account without starting a new authorize flow", async () => {
    setMockSession(true);

    const adapter = createXamanAdapter({
      apiKey: "xaman-key",
      redirectUrl: "http://localhost:3000",
    });

    await expect(adapter.getAccount?.()).resolves.toEqual({
      address: TEST_XRPL_ADDRESS,
      network: "unknown",
    });
    expect(authorize).not.toHaveBeenCalled();
  });

  it("reuses the same Xaman SDK client for repeated calls on the same config", async () => {
    setMockSession(true);

    const adapter = createXamanAdapter({
      apiKey: "xaman-key",
      redirectUrl: "http://localhost:3000/reuse-test",
    });

    await adapter.getAccount?.();
    await adapter.getAccount?.();

    expect(constructorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns a signed transaction blob from the payload response", async () => {
    setMockSession(true);
    createAndSubscribe.mockResolvedValue({
      created: {
        next: {
          always: "https://xaman.app/sign/payload-1",
        },
      },
      resolved: Promise.resolve({
        data: {
          signed: true,
        },
      }),
    });
    getPayload.mockResolvedValue({
      response: {
        hex: "120000228000000024000000012E000000006140000000000F424068400000000000000C732103ABC",
      },
    });

    const adapter = createXamanAdapter({
      apiKey: "xaman-key",
      redirectUrl: "http://localhost:3000/sign",
    });

    await expect(
      adapter.signTransaction?.({
        transaction: {
          TransactionType: "Payment",
          Destination: TEST_XRPL_ADDRESS,
          Amount: "1000",
        },
      }),
    ).resolves.toEqual({
      signedTransaction: {
        txBlob: "120000228000000024000000012E000000006140000000000F424068400000000000000C732103ABC",
      },
    });

    expect(createAndSubscribe).toHaveBeenCalledWith(
      {
        txjson: {
          TransactionType: "Payment",
          Destination: TEST_XRPL_ADDRESS,
          Amount: "1000",
        },
        options: {
          submit: false,
          return_url: {
            app: "http://localhost:3000/sign",
            web: "http://localhost:3000/sign",
          },
        },
      },
      expect.any(Function),
    );
    expect(getPayload).toHaveBeenCalledWith({
      next: {
        always: "https://xaman.app/sign/payload-1",
      },
    });
  });

  it("uses the prepared popup window for the Xaman sign request url", async () => {
    setMockSession(true);

    const popupWindow = {
      closed: false,
      focus: vi.fn(),
      location: {
        href: "",
      },
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(popupWindow as never);

    prepareXamanSignRequestWindow();

    createAndSubscribe.mockResolvedValue({
      created: {
        next: {
          always: "https://xaman.app/sign/payload-2",
        },
      },
      resolved: Promise.resolve({
        data: {
          signed: true,
        },
      }),
    });
    getPayload.mockResolvedValue({
      response: {
        hex: "ABC123",
      },
    });

    const adapter = createXamanAdapter({
      apiKey: "xaman-key",
      redirectUrl: "http://localhost:3000/sign",
    });

    await adapter.signTransaction?.({
      transaction: {
        TransactionType: "Payment",
        Destination: TEST_XRPL_ADDRESS,
        Amount: "1000",
      },
    });

    expect(openSpy).toHaveBeenCalledWith("", "_blank", "popup=yes,width=460,height=760");
    expect(popupWindow.location.href).toBe("https://xaman.app/sign/payload-2");
    expect(popupWindow.focus).toHaveBeenCalled();
  });

  it("throws a configuration error when api key is missing", async () => {
    await expect(createXamanAdapter().connect()).rejects.toMatchObject({
      code: "configuration_error",
    });
  });

  it("logs out through the shared Xaman client", async () => {
    const adapter = createXamanAdapter({
      apiKey: "xaman-key",
      redirectUrl: "http://localhost:3000",
    });

    await expect(adapter.disconnect?.()).resolves.toBeUndefined();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
