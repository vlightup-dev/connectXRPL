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

const xamanClientCache = new Map<string, XummPkce>();

export function createXamanAdapter(options: XamanAdapterOptions = {}): WalletAdapter {
  function getClientCacheKey() {
    return `${options.apiKey ?? ""}::${options.redirectUrl ?? ""}`;
  }

  function createClient() {
    const cacheKey = getClientCacheKey();
    const cachedClient = xamanClientCache.get(cacheKey);
    if (cachedClient) {
      return cachedClient;
    }

    const client = new XummPkce(options.apiKey!, {
      redirectUrl: options.redirectUrl!,
      rememberJwt: true,
      storage: window.localStorage,
    });
    xamanClientCache.set(cacheKey, client);
    return client;
  }

  async function getExistingSession() {
    const client = createClient();
    return (await client.state()) as XamanSession | undefined;
  }

  async function getSession() {
    const client = createClient();
    const session = (await getExistingSession()) ?? (await client.authorize());
    return session;
  }

  return {
    id: "xaman",
    name: "Xaman",
    capabilities: ["connect", "getAccount", "signTransaction"],
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
        const session = (await getSession()) as XamanSession | undefined;
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
    async getAccount() {
      if (!options.apiKey || !options.redirectUrl || typeof window === "undefined") {
        return null;
      }

      try {
        const session = await getExistingSession();
        const address = session?.me?.account;

        return address
          ? {
              address,
              network: "unknown",
            }
          : null;
      } catch {
        return null;
      }
    },
    async signTransaction({ transaction }) {
      if (!options.apiKey || !options.redirectUrl || typeof window === "undefined") {
        throw createWalletConnectError(
          "configuration_error",
          "Configure Xaman API key and redirect URL before signing.",
        );
      }

      try {
        const session = (await getSession()) as
          | (XamanSession & {
              sdk?: {
                payload: {
                  createAndSubscribe: (
                    payload: Record<string, unknown>,
                    callback: (event: {
                      data?: { signed?: boolean; expired?: boolean };
                      resolve: (value?: unknown) => void;
                    }) => void,
                  ) => Promise<{
                    created: { uuid: string };
                    payload: { response?: { hex?: string | null } };
                    resolved: Promise<{ signed?: boolean } | undefined>;
                  }>;
                  get: (payload: { uuid: string } | string) => Promise<{
                    response?: { hex?: string | null };
                  } | null>;
                };
              };
            })
          | undefined;

        if (!session?.sdk?.payload) {
          throw new Error("Xaman did not restore an authenticated signing session.");
        }

        const isMultisign = transaction.SigningPubKey === "";
        const subscription = await session.sdk.payload.createAndSubscribe(
          {
            txjson: transaction,
            options: {
              multisign: isMultisign,
              submit: false,
            },
          },
          (event) => {
            if (event.data?.signed || event.data?.expired) {
              event.resolve(event.data);
            }
          },
        );

        const resolution = await subscription.resolved;

        if (!resolution?.signed) {
          throw new Error("Xaman signing was cancelled.");
        }

        const payload = await session.sdk.payload.get(subscription.created);
        const txBlob = payload?.response?.hex ?? subscription.payload.response?.hex ?? null;

        if (!txBlob) {
          throw new Error("Xaman did not return a signed transaction blob.");
        }

        return {
          signedTransaction: {
            txBlob,
          },
        };
      } catch (error) {
        throw createWalletConnectError(
          "signing_failed",
          "Xaman transaction signing failed.",
          error,
        );
      }
    },
  };
}
