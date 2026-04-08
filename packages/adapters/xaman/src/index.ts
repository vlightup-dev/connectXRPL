import { Xumm } from "xumm";
import { createWalletConnectError } from "../../../core/src/errors";
import type { WalletAdapter, WalletAccount } from "../../../core/src/types";

type XamanAdapterOptions = {
  apiKey?: string;
  redirectUrl?: string;
};

type XamanPayloadState = {
  signed?: boolean;
};

type XamanPayloadResult = {
  response?: {
    hex?: string;
  };
};

type XamanCreatedPayload = {
  next?: {
    always?: string;
  };
};

type XamanPayloadRequest = {
  txjson: Record<string, unknown>;
  options: {
    submit: false;
    return_url?: {
      app: string;
      web: string;
    };
  };
};

type XamanAuthorizeResult = {
  me?: {
    account?: string;
  };
};

type XamanResolvedPayload = {
  data?: XamanPayloadState;
};

const clientCache = new Map<string, Xumm>();
let preparedSignRequestWindow: Window | null = null;

function getCacheKey({ apiKey, redirectUrl }: XamanAdapterOptions) {
  return `${apiKey ?? ""}::${redirectUrl ?? ""}`;
}

function safeWindowOpen(url = "") {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.open(url, "_blank", "popup=yes,width=460,height=760");
  } catch {
    return null;
  }
}

function openPreparedWindow(signUrl: string) {
  if (typeof window === "undefined") {
    return;
  }

  const popup =
    preparedSignRequestWindow && !preparedSignRequestWindow.closed
      ? preparedSignRequestWindow
      : safeWindowOpen();

  preparedSignRequestWindow = null;

  if (!popup) {
    return;
  }

  popup.location.href = signUrl;
  popup.focus?.();
}

export function prepareXamanSignRequestWindow() {
  if (typeof window === "undefined") {
    return;
  }

  preparedSignRequestWindow = safeWindowOpen();
}

export function clearPreparedXamanSignRequestWindow() {
  if (
    preparedSignRequestWindow &&
    !preparedSignRequestWindow.closed &&
    typeof preparedSignRequestWindow.close === "function"
  ) {
    preparedSignRequestWindow.close();
  }

  preparedSignRequestWindow = null;
}

function getClient(options: XamanAdapterOptions) {
  const cacheKey = getCacheKey(options);
  const cached = clientCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  if (!options.apiKey) {
    throw createWalletConnectError("configuration_error", "Xaman requires a public API key.");
  }

  const client = new Xumm(options.apiKey);
  clientCache.set(cacheKey, client);
  return client;
}

async function getSignedInAccount(client: Xumm): Promise<WalletAccount | null> {
  const stateAccount = typeof client.state.account === "string" ? client.state.account : "";
  if (!client.state.signedIn && !stateAccount) {
    return null;
  }

  const address = (await client.user.account) ?? stateAccount;

  if (!address) {
    return null;
  }

  return {
    address,
    network: "unknown",
  };
}

async function authorize(client: Xumm) {
  const result = await client.authorize();

  if (result instanceof Error) {
    throw result;
  }

  const resultAccount =
    typeof (result as XamanAuthorizeResult | undefined)?.me?.account === "string"
      ? (result as XamanAuthorizeResult).me?.account
      : null;

  if (resultAccount) {
    return {
      address: resultAccount,
      network: "unknown" as const,
    };
  }

  return getSignedInAccount(client);
}

function getReturnUrl(redirectUrl?: string) {
  if (!redirectUrl) {
    return undefined;
  }

  return {
    app: redirectUrl,
    web: redirectUrl,
  };
}

export function createXamanAdapter(options: XamanAdapterOptions = {}): WalletAdapter {
  return {
    id: "xaman",
    name: "Xaman",
    capabilities: ["connect", "disconnect", "getAccount", "signTransaction"],
    async isInstalled() {
      return typeof window !== "undefined" && Boolean(options.apiKey);
    },
    async connect() {
      try {
        if (typeof window === "undefined") {
          throw createWalletConnectError(
            "configuration_error",
            "Xaman can only connect in a browser environment.",
          );
        }

        const client = getClient(options);
        const existingAccount = await getSignedInAccount(client);

        if (existingAccount) {
          return existingAccount;
        }

        const connectedAccount = await authorize(client);

        if (!connectedAccount) {
          throw new Error("Xaman did not return a wallet address.");
        }

        return connectedAccount;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "configuration_error"
        ) {
          throw error;
        }

        throw createWalletConnectError("connection_failed", "Xaman connection failed.", error);
      }
    },
    async disconnect() {
      try {
        const client = getClient(options);
        await client.logout();
      } catch (error) {
        throw createWalletConnectError("connection_failed", "Xaman disconnect failed.", error);
      }
    },
    async getAccount() {
      try {
        if (typeof window === "undefined" || !options.apiKey) {
          return null;
        }

        const client = getClient(options);
        return getSignedInAccount(client);
      } catch {
        return null;
      }
    },
    async signTransaction({ transaction }) {
      try {
        if (typeof window === "undefined") {
          throw createWalletConnectError(
            "configuration_error",
            "Xaman can only sign in a browser environment.",
          );
        }

        const client = getClient(options);
        const existingAccount = await getSignedInAccount(client);
        const connectedAccount = existingAccount ?? (await authorize(client));

        if (!connectedAccount) {
          throw new Error("Connect Xaman before signing.");
        }

        if (!client.payload) {
          throw new Error("Xaman payload SDK is unavailable.");
        }

        const payloadRequest: XamanPayloadRequest = {
          txjson: transaction,
          options: {
            submit: false,
            return_url: getReturnUrl(options.redirectUrl),
          },
        };

        const { created, resolved } = await client.payload.createAndSubscribe(
          payloadRequest as never,
          (eventMessage: { data: XamanPayloadState }) => {
            if ("signed" in eventMessage.data) {
              return eventMessage;
            }

            return undefined;
          },
        );

        const createdPayload = created as XamanCreatedPayload | undefined;
        const signRequestUrl = createdPayload?.next?.always;
        if (signRequestUrl) {
          openPreparedWindow(signRequestUrl);
        }

        const resolution = (await resolved) as XamanResolvedPayload | undefined;

        if (!resolution?.data?.signed) {
          throw createWalletConnectError("user_rejected", "Xaman signing request was rejected.");
        }

        const payload = (await client.payload.get(created)) as XamanPayloadResult | null;
        const txBlob = payload?.response?.hex;

        if (!txBlob) {
          throw new Error("Xaman did not return a signed transaction blob.");
        }

        return {
          signedTransaction: {
            txBlob,
          },
        };
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error) {
          throw error;
        }

        throw createWalletConnectError(
          "signing_failed",
          "Xaman transaction signing failed.",
          error,
        );
      }
    },
  };
}
