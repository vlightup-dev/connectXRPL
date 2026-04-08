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

export function createCrossmarkAdapter(): WalletAdapter {
  return {
    id: "crossmark",
    name: "Crossmark",
    capabilities: ["connect", "signTransaction", "submitTransaction"],
    async isInstalled() {
      if (typeof window === "undefined") {
        return false;
      }

      return sdk.sync.isInstalled() === true;
    },
    async connect() {
      try {
        if (!(await this.isInstalled())) {
          throw createWalletConnectError(
            "not_installed",
            "Install Crossmark browser extension before connecting.",
          );
        }

        const result = await sdk.async.signInAndWait();
        const address = result?.response?.data?.address;

        if (!address) {
          throw new Error("Crossmark did not return a wallet address.");
        }

        return {
          address,
          network: "unknown",
        };
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        const code = message.includes("not installed") ? "not_installed" : "connection_failed";

        throw createWalletConnectError(code, "Crossmark connection failed.", error);
      }
    },
    async signTransaction({ transaction }) {
      try {
        const result = await sdk.async.signAndWait(transaction);
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
        const result = await sdk.async.signAndSubmitAndWait(transaction);
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
