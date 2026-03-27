import { XummPkce } from "xumm-oauth2-pkce";
import { createWalletConnectError } from "../../../core/src/errors";
import type { WalletAdapter } from "../../../core/src/types";

type XamanSession = {
  me?: {
    account?: string;
  };
};

type XamanAdapterOptions = {
  apiKey?: string;
  redirectUrl?: string;
};

export function createXamanAdapter(options: XamanAdapterOptions = {}): WalletAdapter {
  return {
    id: "xaman",
    name: "Xaman",
    capabilities: ["connect"],
    async isInstalled() {
      return Boolean(options.apiKey && options.redirectUrl && typeof window !== "undefined");
    },
    async connect() {
      if (!options.apiKey || !options.redirectUrl || typeof window === "undefined") {
        throw createWalletConnectError(
          "configuration_error",
          "Configure Xaman API key and redirect URL before connecting.",
        );
      }

      try {
        const client = new XummPkce(options.apiKey, {
          redirectUrl: options.redirectUrl,
          rememberJwt: true,
          storage: window.localStorage,
        });
        const session = (await client.authorize()) as XamanSession | undefined;
        const address = session?.me?.account;

        if (!address) {
          throw new Error("Xaman did not return a wallet address.");
        }

        return {
          address,
          network: "unknown",
        };
      } catch (error) {
        throw createWalletConnectError("connection_failed", "Xaman connection failed.", error);
      }
    },
  };
}
