import sdk from "@crossmarkio/sdk";
import { createWalletConnectError } from "../../../core/src/errors";
import type { WalletAdapter, WalletConnectError } from "../../../core/src/types";

function getResponseHash(response: unknown): string | undefined {
  if (
    typeof response === "object" &&
    response !== null &&
    "hash" in response &&
    typeof response.hash === "string"
  ) {
    return response.hash;
  }

  return undefined;
}

type CrossmarkSdkSurface = {
  async?: {
    signInAndWait?: () => Promise<CrossmarkResponse>;
    signAndWait?: (transaction: Record<string, unknown>) => Promise<CrossmarkResponse>;
    signAndSubmitAndWait?: (transaction: Record<string, unknown>) => Promise<CrossmarkResponse>;
  };
  sync?: {
    isInstalled?: () => boolean | undefined;
    isConnected?: () => boolean | undefined;
    getAddress?: () => string | undefined;
  };
  methods?: {
    isInstalled?: () => boolean | undefined;
    signInAndWait?: () => Promise<CrossmarkResponse>;
    signAndWait?: (transaction: Record<string, unknown>) => Promise<CrossmarkResponse>;
    signAndSubmitAndWait?: (transaction: Record<string, unknown>) => Promise<CrossmarkResponse>;
  };
};

type CrossmarkResponse = {
  response?: {
    data?: {
      address?: string;
      txBlob?: string;
      resp?: unknown;
    };
  };
};

function getCrossmarkSdk(): CrossmarkSdkSurface {
  // When webpack (e.g. Next.js) bundles this library, the default import of @crossmarkio/sdk
  // may be the module namespace object ({ default: sdkSingleton }) rather than the singleton
  // directly. Unwrap .default when present so that async/sync/methods are always accessible.
  // Assumption: if .default is non-nullish, it is the real SDK surface. This would break if
  // a future SDK version adds an unrelated top-level "default" property.
  const imported = sdk as unknown as CrossmarkSdkSurface & { default?: CrossmarkSdkSurface };
  return imported.default ?? imported;
}

function getIsInstalledMethod() {
  const crossmarkSdk = getCrossmarkSdk();
  return crossmarkSdk.sync?.isInstalled ?? crossmarkSdk.methods?.isInstalled;
}

function getSignInAndWaitMethod() {
  const crossmarkSdk = getCrossmarkSdk();
  return crossmarkSdk.async?.signInAndWait ?? crossmarkSdk.methods?.signInAndWait;
}

function getSignAndWaitMethod() {
  const crossmarkSdk = getCrossmarkSdk();
  return crossmarkSdk.async?.signAndWait ?? crossmarkSdk.methods?.signAndWait;
}

function getSignAndSubmitAndWaitMethod() {
  const crossmarkSdk = getCrossmarkSdk();
  return crossmarkSdk.async?.signAndSubmitAndWait ?? crossmarkSdk.methods?.signAndSubmitAndWait;
}

export function createCrossmarkAdapter(): WalletAdapter {
  return {
    id: "crossmark",
    name: "Crossmark",
    capabilities: ["connect", "getAccount", "signTransaction", "submitTransaction"],
    async isInstalled() {
      if (typeof window === "undefined") {
        return false;
      }

      const isInstalled = getIsInstalledMethod();

      return isInstalled?.() === true;
    },
    async getAccount() {
      const crossmarkSdk = getCrossmarkSdk();
      const isConnected = crossmarkSdk.sync?.isConnected?.();
      if (!isConnected) {
        return null;
      }

      const address = crossmarkSdk.sync?.getAddress?.();
      if (!address) {
        // Extension is connected but address is not yet cached (e.g. during startup).
        // Returning null lets the caller fall back to connect(), which may show a sign-in popup.
        return null;
      }

      return { address, network: "unknown" };
    },
    async connect() {
      try {
        const signInAndWait = getSignInAndWaitMethod();

        if (!signInAndWait) {
          throw new Error("Crossmark sign-in API is unavailable.");
        }

        const result = await signInAndWait();
        const address = result?.response?.data?.address;

        if (!address) {
          throw new Error("Crossmark did not return a wallet address.");
        }

        return {
          address,
          network: "unknown",
        };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as WalletConnectError).code === "not_installed"
        ) {
          throw error;
        }

        const message = error instanceof Error ? error.message.toLowerCase() : "";
        const code = message.includes("not installed") ? "not_installed" : "connection_failed";

        throw createWalletConnectError(code, "Crossmark connection failed.", error);
      }
    },
    async signTransaction({ transaction }) {
      try {
        const signAndWait = getSignAndWaitMethod();

        if (!signAndWait) {
          throw new Error("Crossmark sign API is unavailable.");
        }

        const result = await signAndWait(transaction);
        const txBlob = result?.response?.data?.txBlob;

        if (!txBlob) {
          throw new Error("Crossmark did not return a signed transaction blob.");
        }

        return {
          signedTransaction: {
            txBlob,
          },
        };
      } catch (error) {
        throw createWalletConnectError(
          "signing_failed",
          "Crossmark transaction signing failed.",
          error,
        );
      }
    },
    async submitTransaction({ transaction }) {
      try {
        const signAndSubmitAndWait = getSignAndSubmitAndWaitMethod();

        if (!signAndSubmitAndWait) {
          throw new Error("Crossmark submit API is unavailable.");
        }

        const result = await signAndSubmitAndWait(transaction);
        const response = result?.response?.data?.resp;

        return {
          hash: getResponseHash(response),
          result: response,
        };
      } catch (error) {
        throw createWalletConnectError(
          "submission_failed",
          "Crossmark transaction submission failed.",
          error,
        );
      }
    },
  };
}
