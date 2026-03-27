import sdk from "@crossmarkio/sdk";
import { createWalletConnectError } from "../../../core/src/errors";
import type { WalletAdapter } from "../../../core/src/types";

export function createCrossmarkAdapter(): WalletAdapter {
  return {
    id: "crossmark",
    name: "Crossmark",
    capabilities: ["connect", "submitTransaction"],
    async isInstalled() {
      return typeof window !== "undefined";
    },
    async connect() {
      try {
        const result = await sdk.methods.signInAndWait();
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
    async submitTransaction({ transaction }) {
      try {
        const result = await sdk.methods.signAndSubmitAndWait(transaction);
        const response = result?.response?.data?.resp;

        return {
          hash: response?.hash,
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
