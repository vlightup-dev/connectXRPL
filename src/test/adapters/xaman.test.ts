import { describe, expect, it, vi } from "vitest";
import { createXamanAdapter } from "@xaman/index";
import { TEST_XRPL_ADDRESS } from "../fixtures/xrpl";

const { authorize, constructorSpy, state } = vi.hoisted(() => ({
  authorize: vi.fn(),
  constructorSpy: vi.fn(),
  state: vi.fn(),
}));

vi.mock("xumm-oauth2-pkce", () => ({
  XummPkce: class {
    constructor(...args: unknown[]) {
      constructorSpy(...args);
    }

    authorize = authorize;
    state = state;
  },
}));

describe("Xaman adapter", () => {
  it("connects and returns the XRPL account", async () => {
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
    expect(constructorSpy).toHaveBeenCalledWith("xaman-key", {
      redirectUrl: "http://localhost:3000",
      rememberJwt: true,
      storage: window.localStorage,
    });
  });

  it("returns false from isInstalled when config is missing", async () => {
    await expect(createXamanAdapter().isInstalled()).resolves.toBe(false);
  });

  it("throws a configuration error when api key or redirect url is missing", async () => {
    await expect(createXamanAdapter().connect()).rejects.toMatchObject({
      code: "configuration_error",
    });
  });
});
