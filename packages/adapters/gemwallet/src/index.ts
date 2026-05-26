import {
  getAddress,
  getNetwork,
  getPublicKey,
  isInstalled,
  signTransaction,
  submitTransaction,
} from "@gemwallet/api";
import { createWalletConnectError } from "../../../core/src/errors";
import type { WalletAdapter } from "../../../core/src/types";

function normalizeGemWalletNetwork(raw: unknown): "mainnet" | "testnet" | "devnet" | "unknown" {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "mainnet") return "mainnet";
  if (value === "testnet") return "testnet";
  if (value === "devnet") return "devnet";
  return "unknown";
}

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
        const networkResponse = await getNetwork().catch(() => null);
        const network = normalizeGemWalletNetwork(networkResponse?.result?.network);

        if (!address) {
          throw new Error("GemWallet did not return an address.");
        }
        return {
          address,
          network,
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
        // Fetch the public key first (may show a one-time "Share public key" popup),
        // then sign the transaction (shows the signing popup).
        // Using Promise.all for both concurrent causes GemWallet to queue them — the user
        // sees the sign popup, approves it, and then a second "Share public key" popup
        // silently waits behind the scenes, leaving the UI hung until it is resolved.
        const publicKeyResponse = await getPublicKey();
        const publicKey = publicKeyResponse.result?.publicKey;
        const address = publicKeyResponse.result?.address;

        if (!publicKey || !address) {
          throw new Error("GemWallet did not return a public key.");
        }

        const signResponse = await signTransaction({ transaction });
        const signature = signResponse.result?.signature;

        if (!signature) {
          throw new Error("GemWallet did not return a signature.");
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
        if (typeof error === "object" && error !== null && "code" in error) {
          throw error;
        }
        throw createWalletConnectError(
          "signing_failed",
          "GemWallet transaction signing failed.",
          error,
        );
      }
    },
    async submitTransaction({ transaction }) {
      try {
        const networkResponse = await getNetwork().catch(() => null);
        const network = normalizeGemWalletNetwork(networkResponse?.result?.network);
        if (network !== "testnet") {
          throw createWalletConnectError(
            "configuration_error",
            `GemWallet is on ${network}. Switch GemWallet to XRPL Testnet and retry.`,
          );
        }
        const response = await submitTransaction({ transaction });

        return {
          hash: response.result?.hash,
          result: response.result,
        };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
        ) {
          throw error;
        }
        throw createWalletConnectError(
          "submission_failed",
          "GemWallet transaction submission failed.",
          error,
        );
      }
    },
  };
}
