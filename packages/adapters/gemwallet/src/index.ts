import { getAddress, getPublicKey, isInstalled, signTransaction, submitTransaction } from "@gemwallet/api";
import { createWalletConnectError } from "../../../core/src/errors";
import type { WalletAdapter } from "../../../core/src/types";
export function createGemWalletAdapter(): WalletAdapter {
  return {
    id: "gemwallet",
    name: "GemWallet",
    capabilities: ["connect", "getAccount", "signTransaction", "submitTransaction"],
    async isInstalled() {
      const response = await isInstalled();
      return response.result.isInstalled;
    },
    async connect() {
      try {
        const installState = await isInstalled();

        if (!installState.result.isInstalled) {
          throw createWalletConnectError("not_installed", "Install GemWallet before connecting.");
        }

        const response = await getAddress();
        const address = response.result?.address;

        if (!address) {
          throw new Error("GemWallet did not return an address.");
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
          error.code === "not_installed"
        ) {
          throw error;
        }

        throw createWalletConnectError("connection_failed", "GemWallet connection failed.", error);
      }
    },
    async getAccount() {
      return this.connect();
    },
    async signTransaction({ transaction }) {
      try {
        const [signResponse, publicKeyResponse] = await Promise.all([
          signTransaction({ transaction }),
          getPublicKey(),
        ]);

        const signature = signResponse.result?.signature;
        const publicKey = publicKeyResponse.result?.publicKey;
        const address = publicKeyResponse.result?.address;

        if (!signature || !publicKey || !address) {
          throw new Error("GemWallet did not return a complete signature response.");
        }

        return {
          signedTransaction: {
            address,
            publicKey,
            signature,
            transaction,
          },
        };
      } catch (error) {
        throw createWalletConnectError(
          "signing_failed",
          "GemWallet transaction signing failed.",
          error,
        );
      }
    },
    async submitTransaction({ transaction }) {
      try {
        const response = await submitTransaction({ transaction });

        return {
          hash: response.result?.hash,
          result: response.result,
        };
      } catch (error) {
        throw createWalletConnectError(
          "submission_failed",
          "GemWallet transaction submission failed.",
          error,
        );
      }
    },
  };
}
