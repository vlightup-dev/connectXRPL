import {
  getAddress,
  getNetwork,
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
        // GemWallet's signTransaction returns the fully signed transaction blob
        // (equivalent to xrpl.js wallet.sign().tx_blob), not raw signature bytes.
        // For multisig (SigningPubKey: ""), the blob contains a Signers array with
        // the signer's Account, SigningPubKey, and TxnSignature already assembled.
        // We return it as txBlob so external-wallet-signing decodes it correctly.
        const signResponse = await signTransaction({ transaction });
        const txBlob = signResponse.result?.signature;

        if (!txBlob) {
          throw new Error("GemWallet did not return a signed transaction.");
        }

        return {
          signedTransaction: { txBlob },
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
